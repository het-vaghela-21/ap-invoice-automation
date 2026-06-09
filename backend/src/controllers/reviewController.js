import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import validationService from '../services/validationService.js';

/**
 * @desc    Get details of an invoice for review screen
 * @route   GET /api/review/:invoiceId
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getReviewData = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId)
      .populate('matchedVendor')
      .populate('reviewedBy', 'firstName lastName email');
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        invoiceFileUrl: invoice.invoiceFileUrl,
        extractionStatus: invoice.extractionStatus,
        extractedData: invoice.extractedData,
        confidenceScores: invoice.confidenceScores,
        reviewStatus: invoice.reviewStatus,
        validationStatus: invoice.validationStatus,
        matchedVendor: invoice.matchedVendor,
        reviewedBy: invoice.reviewedBy,
        reviewedAt: invoice.reviewedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate and update OCR extracted fields for an invoice
 * @route   PUT /api/review/:invoiceId
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const updateReviewData = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const {
      invoiceNumber,
      poNumber,
      vendorName,
      invoiceDate,
      totalAmount,
      taxAmount,
      gstNumber,
      vendorId // Vendor ID selected by the user manually, or pre-matched
    } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    const finalVendorId = vendorId || invoice.matchedVendor;

    if (!finalVendorId) {
      return res.status(400).json({
        status: 'error',
        message: 'A Vendor must be identified and matched before completing review.',
        missingFields: ['vendorId']
      });
    }

    const vendor = await Vendor.findById(finalVendorId);
    if (!vendor) {
      return res.status(400).json({
        status: 'error',
        message: 'The selected Vendor does not exist.',
        missingFields: ['vendorId']
      });
    }

    if (!invoice.extractedData) {
      invoice.extractedData = {};
    }

    // Prepare candidate data to validate against vendor requirements
    const candidateData = {
      invoiceNumber: invoiceNumber !== undefined ? invoiceNumber : invoice.extractedData.invoiceNumber,
      poNumber: poNumber !== undefined ? poNumber : invoice.extractedData.poNumber,
      vendorName: vendorName !== undefined ? vendorName : invoice.extractedData.vendorName,
      invoiceDate: invoiceDate !== undefined ? invoiceDate : invoice.extractedData.invoiceDate,
      totalAmount: totalAmount !== undefined && totalAmount !== null && totalAmount !== '' ? parseFloat(totalAmount) : null,
      taxAmount: taxAmount !== undefined && taxAmount !== null && taxAmount !== '' ? parseFloat(taxAmount) : null,
      gstNumber: gstNumber !== undefined ? gstNumber : invoice.extractedData.gstNumber
    };

    // Run Validation Engine
    const valResult = validationService.validateFields(candidateData, vendor.mandatoryFields);
    if (!valResult.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed: Mandatory fields are missing.',
        missingFields: valResult.missingFields
      });
    }

    // Apply values to invoice document
    invoice.extractedData = candidateData;
    invoice.matchedVendor = vendor._id;
    invoice.reviewStatus = 'Reviewed';
    invoice.reviewedBy = req.user._id;
    invoice.reviewedAt = new Date();
    invoice.validationStatus = 'Reviewed';

    // Run post-review PO Matching
    const cleanedPoNumber = candidateData.poNumber ? candidateData.poNumber.trim() : '';
    if (cleanedPoNumber) {
      const matchingPO = await PurchaseOrder.findOne({
        poNumber: { $regex: new RegExp("^" + cleanedPoNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") },
        vendorId: vendor._id,
        status: { $ne: 'Cancelled' }
      });

      if (matchingPO) {
        invoice.matchedPO = matchingPO._id;
        invoice.validationStatus = 'POMatched';
        invoice.matchingStatus = 'Matched';
      } else {
        invoice.matchedPO = null;
        invoice.matchingStatus = 'Mismatch';
        invoice.validationStatus = 'Reviewed';
      }
    } else {
      invoice.matchedPO = null;
      invoice.matchingStatus = 'NotMatched';
      invoice.validationStatus = 'Reviewed';
    }

    await invoice.save();

    // Fetch and populate updated invoice
    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('matchedVendor')
      .populate('matchedPO')
      .populate('reviewedBy', 'firstName lastName email');

    res.status(200).json({
      status: 'success',
      message: 'Invoice review saved and matched successfully',
      data: {
        invoiceFileUrl: populatedInvoice.invoiceFileUrl,
        extractedData: populatedInvoice.extractedData,
        confidenceScores: populatedInvoice.confidenceScores,
        reviewStatus: populatedInvoice.reviewStatus,
        validationStatus: populatedInvoice.validationStatus,
        matchingStatus: populatedInvoice.matchingStatus,
        matchedVendor: populatedInvoice.matchedVendor,
        matchedPO: populatedInvoice.matchedPO,
        reviewedBy: populatedInvoice.reviewedBy,
        reviewedAt: populatedInvoice.reviewedAt
      }
    });
  } catch (error) {
    next(error);
  }
};
