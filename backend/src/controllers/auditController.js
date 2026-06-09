import AuditLog from '../models/AuditLog.js';

/**
   * @desc    Get complete audit activity history for an invoice
   * @route   GET /api/audit/invoice/:invoiceId
   * @access  Private (Admin, Manager, AccountsExecutive)
   */
export const getInvoiceAuditLogs = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    
    const logs = await AuditLog.find({ invoiceId })
      .populate('performedBy', 'firstName lastName email role')
      .sort({ timestamp: 1 }); // Chronological order

    res.status(200).json({
      status: 'success',
      results: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};
