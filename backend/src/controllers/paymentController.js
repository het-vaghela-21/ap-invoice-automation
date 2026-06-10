import mongoose from 'mongoose';
import PaymentRecord from '../models/PaymentRecord.js';
import Invoice from '../models/Invoice.js';
import workflowService from '../services/workflowService.js';

/**
 * Fetch all payments with pagination, filtering by status, and search (invoice no or vendor name).
 */
export const getPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', invoiceId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const pipeline = [
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoiceId',
          foreignField: '_id',
          as: 'invoice'
        }
      },
      { $unwind: '$invoice' },
      {
        $lookup: {
          from: 'vendors',
          localField: 'vendorId',
          foreignField: '_id',
          as: 'vendor'
        }
      },
      { $unwind: { path: '$vendor', preserveNullAndEmptyArrays: true } }
    ];

    const match = {};
    if (status) {
      match.paymentStatus = status;
    }
    if (invoiceId) {
      match.invoiceId = new mongoose.Types.ObjectId(invoiceId);
    }
    if (search) {
      match.$or = [
        { 'invoice.extractedData.invoiceNumber': { $regex: search, $options: 'i' } },
        { 'vendor.vendorName': { $regex: search, $options: 'i' } }
      ];
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limitNum }
        ]
      }
    });

    const [result] = await PaymentRecord.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;
    const data = result.data;

    res.status(200).json({
      status: 'success',
      data,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch specific payment details by ID.
 */
export const getPaymentById = async (req, res, next) => {
  try {
    const payment = await PaymentRecord.findById(req.params.id)
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'matchedVendor' },
          { path: 'matchedPO' }
        ]
      })
      .populate('vendorId')
      .populate('processedBy', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        status: 'error',
        message: 'Payment record not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transition invoice to Paid and create/update payment record.
 */
export const markAsPaid = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { paymentReference, notes } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    let payment = await PaymentRecord.findOne({ invoiceId });
    if (!payment) {
      payment = new PaymentRecord({
        invoiceId: invoice._id,
        vendorId: invoice.matchedVendor,
        amount: invoice.extractedData?.totalAmount || 0
      });
    }

    payment.paymentStatus = 'Paid';
    payment.paymentDate = new Date();
    payment.paymentReference = paymentReference || `PAY-${Date.now()}`;
    payment.processedBy = req.user._id;
    if (notes) {
      payment.notes = notes;
    }
    await payment.save();

    // Transition invoice state to Paid via Workflow Engine (auto logs 'Payment Completed')
    await workflowService.changeInvoiceStatus(invoice._id, 'Paid', req.user._id, notes || 'Payment processed');

    res.status(200).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Put payment status on hold / unhold and log audit event.
 */
export const putOnHold = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { notes, hold } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    let payment = await PaymentRecord.findOne({ invoiceId });
    if (!payment) {
      payment = new PaymentRecord({
        invoiceId: invoice._id,
        vendorId: invoice.matchedVendor,
        amount: invoice.extractedData?.totalAmount || 0
      });
    }

    const isHold = hold !== false; // Default is true (OnHold)
    payment.paymentStatus = isHold ? 'OnHold' : 'Pending';
    if (notes) {
      payment.notes = notes;
    }
    await payment.save();

    // Audit logs for Payment On Hold / Release
    const auditAction = isHold ? 'Payment On Hold' : 'Payment Hold Removed';
    await workflowService.logAction(
      invoice._id,
      auditAction,
      req.user._id,
      notes || (isHold ? 'Payment put on hold.' : 'Payment hold released.')
    );

    res.status(200).json({
      status: 'success',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};
