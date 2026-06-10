import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Vendor from '../models/Vendor.js';

/**
 * Handle application-wide search across Invoices, Purchase Orders, and Vendors.
 */
export const globalSearch = async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        status: 'success',
        data: []
      });
    }

    const regex = { $regex: q.trim(), $options: 'i' };

    const [invoices, pos, vendors] = await Promise.all([
      Invoice.find({
        $or: [
          { 'extractedData.invoiceNumber': regex },
          { 'extractedData.poNumber': regex },
          { 'extractedData.vendorName': regex },
          { 'extractedData.gstNumber': regex }
        ]
      }).limit(5),
      PurchaseOrder.find({
        $or: [
          { poNumber: regex },
          { vendorName: regex }
        ]
      }).limit(5),
      Vendor.find({
        $or: [
          { vendorName: regex },
          { vendorCode: regex },
          { vendorGST: regex }
        ]
      }).limit(5)
    ]);

    const results = [];

    invoices.forEach(inv => {
      results.push({
        id: inv._id,
        type: 'Invoice',
        identifier: inv.extractedData?.invoiceNumber || 'N/A',
        status: inv.currentStatus,
        link: `/workspace/${inv._id}`
      });
    });

    pos.forEach(po => {
      results.push({
        id: po._id,
        type: 'PO',
        identifier: po.poNumber,
        status: po.status,
        link: `/purchase-orders`
      });
    });

    vendors.forEach(v => {
      results.push({
        id: v._id,
        type: 'Vendor',
        identifier: v.vendorName,
        status: v.isActive ? 'Active' : 'Inactive',
        link: `/vendors`
      });
    });

    res.status(200).json({
      status: 'success',
      data: results
    });
  } catch (error) {
    next(error);
  }
};
