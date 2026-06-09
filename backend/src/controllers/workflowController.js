import Invoice from '../models/Invoice.js';

/**
 * @desc    Get current status and status history of an invoice
 * @route   GET /api/workflow/invoice/:invoiceId
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getInvoiceWorkflowState = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('statusHistory.changedBy', 'firstName lastName email role')
      .select('currentStatus statusHistory');

    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        currentStatus: invoice.currentStatus,
        statusHistory: invoice.statusHistory
      }
    });
  } catch (error) {
    next(error);
  }
};
