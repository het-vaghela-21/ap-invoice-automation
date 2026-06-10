import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Vendor from '../models/Vendor.js';
import InvoiceException from '../models/InvoiceException.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

/**
 * Fetch counts for KPI cards.
 */
export const getSummaryData = async () => {
  const [totalVendors, totalPOs, invoiceStatusCounts] = await Promise.all([
    Vendor.countDocuments(),
    PurchaseOrder.countDocuments(),
    Invoice.aggregate([
      {
        $group: {
          _id: '$currentStatus',
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const counts = {
    totalInvoices: 0,
    UnderReview: 0,
    Validated: 0,
    ReadyForPayment: 0,
    Exception: 0
  };

  invoiceStatusCounts.forEach(item => {
    counts.totalInvoices += item.count;
    if (item._id in counts) {
      counts[item._id] = item.count;
    }
  });

  return {
    totalVendors,
    totalPurchaseOrders: totalPOs,
    totalInvoices: counts.totalInvoices,
    invoicesUnderReview: counts.UnderReview,
    validatedInvoices: counts.Validated,
    readyForPayment: counts.ReadyForPayment,
    exceptionInvoices: counts.Exception
  };
};

/**
 * Fetch counts grouped by invoice currentStatus.
 */
export const getInvoiceStatusData = async () => {
  const counts = await Invoice.aggregate([
    {
      $group: {
        _id: '$currentStatus',
        count: { $sum: 1 }
      }
    }
  ]);

  const statuses = ['Uploaded', 'Extracted', 'UnderReview', 'Validated', 'ReadyForPayment', 'Exception'];
  const statusMap = statuses.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  counts.forEach(item => {
    if (item._id in statusMap) {
      statusMap[item._id] = item.count;
    }
  });

  return statuses.map(status => ({
    status,
    count: statusMap[status]
  }));
};

/**
 * Fetch top vendors by invoice count.
 */
export const getVendorAnalyticsData = async () => {
  return await Invoice.aggregate([
    { $match: { matchedVendor: { $ne: null } } },
    { $group: { _id: '$matchedVendor', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'vendors',
        localField: '_id',
        foreignField: '_id',
        as: 'vendorInfo'
      }
    },
    { $unwind: '$vendorInfo' },
    {
      $project: {
        _id: 0,
        vendorName: '$vendorInfo.vendorName',
        invoiceCount: '$count'
      }
    }
  ]);
};

/**
 * Fetch exception counts by type, mapped to user-specified keys.
 */
export const getExceptionAnalyticsData = async () => {
  const counts = await InvoiceException.aggregate([
    {
      $group: {
        _id: '$exceptionType',
        count: { $sum: 1 }
      }
    }
  ]);

  const targetTypes = [
    'Vendor Not Found',
    'PO Not Found',
    'Amount Mismatch',
    'Missing Mandatory Fields',
    'Low OCR Confidence',
    'Duplicate Invoice'
  ];

  const typeMap = {
    'Vendor NotFound': 'Vendor Not Found',
    'PO NotFound': 'PO Not Found',
    'PO Amount Mismatch': 'Amount Mismatch',
    'Missing Mandatory Fields': 'Missing Mandatory Fields',
    'Low OCR Confidence': 'Low OCR Confidence',
    'Duplicate Invoice': 'Duplicate Invoice'
  };

  const results = targetTypes.reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {});

  counts.forEach(item => {
    const mappedType = typeMap[item._id];
    if (mappedType) {
      results[mappedType] += item.count;
    }
  });

  return targetTypes.map(type => ({
    type,
    count: results[type]
  }));
};

/**
 * Fetch purchase orders grouped by status.
 */
export const getPOAnalyticsData = async () => {
  const counts = await PurchaseOrder.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const statuses = ['Draft', 'Open', 'Closed', 'Cancelled'];
  const statusMap = statuses.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  counts.forEach(item => {
    if (item._id in statusMap) {
      statusMap[item._id] = item.count;
    }
  });

  return statuses.map(status => ({
    status,
    count: statusMap[status]
  }));
};

/**
 * Fetch the latest 10 audit events.
 */
export const getRecentActivityData = async () => {
  const logs = await AuditLog.find()
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('performedBy', 'firstName lastName email')
    .populate({
      path: 'invoiceId',
      select: 'extractedData.invoiceNumber'
    });

  return logs.map(log => ({
    id: log._id,
    timestamp: log.timestamp,
    action: log.action,
    user: log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System',
    invoiceNumber: log.invoiceId?.extractedData?.invoiceNumber || 'N/A'
  }));
};

/**
 * Fetch the latest invoices ready for payment.
 */
export const getReadyForPaymentData = async () => {
  const invoices = await Invoice.find({ currentStatus: 'ReadyForPayment' })
    .sort({ reviewedAt: -1, updatedAt: -1 })
    .limit(10)
    .populate('matchedVendor', 'vendorName');

  return invoices.map(inv => ({
    id: inv._id,
    invoiceNumber: inv.extractedData?.invoiceNumber || 'N/A',
    vendor: inv.matchedVendor?.vendorName || inv.extractedData?.vendorName || 'N/A',
    amount: inv.extractedData?.totalAmount || 0,
    validatedDate: inv.reviewedAt || inv.updatedAt
  }));
};
