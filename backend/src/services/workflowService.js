import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';

const ALLOWED_TRANSITIONS = {
  'Uploaded': ['Extracted', 'Exception'],
  'Extracted': ['UnderReview', 'Exception'],
  'UnderReview': ['Validated', 'Exception'],
  'Validated': ['ReadyForPayment', 'Exception'],
  'Exception': ['UnderReview', 'Validated', 'Exception'],
  'ReadyForPayment': []
};

const getActionName = (newStatus, previousStatus) => {
  if (previousStatus === newStatus) return 'Status Changed';
  switch (newStatus) {
    case 'Uploaded':
      return 'Invoice Uploaded';
    case 'Extracted':
      return 'OCR Extraction Completed';
    case 'UnderReview':
      return 'Invoice Sent For Review';
    case 'Validated':
      return 'Invoice Validated';
    case 'ReadyForPayment':
      return 'Invoice Finalized';
    default:
      return 'Status Changed';
  }
};

const workflowService = {
  /**
   * Centralized method to transition invoice status, update schema records, and log events.
   * @param {string} invoiceId - Invoice document ID
   * @param {string} newStatus - Target workflow status
   * @param {string} userId - User ID performing the action (null for system)
   * @param {string} notes - Audit trail details/explanation
   * @returns {Promise<Object>} The updated and saved Invoice document
   */
  changeInvoiceStatus: async (invoiceId, newStatus, userId = null, notes = '') => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const previousStatus = invoice.currentStatus || 'Uploaded';

    // 1. Enforce lock restrictions (ReadyForPayment is terminal)
    if (previousStatus === 'ReadyForPayment') {
      throw new Error('Action blocked: Invoice is locked in terminal ReadyForPayment state.');
    }

    // 2. Validate transition
    if (previousStatus !== newStatus) {
      const allowed = ALLOWED_TRANSITIONS[previousStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new Error(`Workflow error: Invalid status transition from "${previousStatus}" to "${newStatus}".`);
      }
    }

    // 3. Update fields
    invoice.currentStatus = newStatus;
    invoice._isWorkflowTransition = true; // flag to bypass direct update blocker in schema pre-save hook
    invoice.lastUpdatedAt = new Date();

    // Push to statusHistory
    invoice.statusHistory.push({
      status: newStatus,
      changedBy: userId,
      changedAt: new Date(),
      notes: notes || `Status changed to ${newStatus}`
    });

    // Map legacy status fields for backward compatibility
    if (newStatus === 'Uploaded') {
      invoice.reviewStatus = 'Awaiting Extraction';
      invoice.validationStatus = 'Pending';
    } else if (newStatus === 'Extracted') {
      invoice.reviewStatus = 'Awaiting Review';
      invoice.validationStatus = 'Pending';
    } else if (newStatus === 'UnderReview') {
      invoice.reviewStatus = 'Awaiting Review';
      if (invoice.matchingStatus === 'Mismatch') {
        invoice.validationStatus = 'ReadyForReview';
      } else {
        invoice.validationStatus = 'MissingRequiredFields';
      }
    } else if (newStatus === 'Validated') {
      invoice.reviewStatus = 'Awaiting Review';
      invoice.validationStatus = 'POMatched';
    } else if (newStatus === 'ReadyForPayment') {
      invoice.reviewStatus = 'ReadyForPayment';
      invoice.validationStatus = 'ReadyForPayment';
      invoice.invoiceDecision = 'Accepted';
    } else if (newStatus === 'Exception') {
      invoice.reviewStatus = 'Reviewed';
      if (invoice.invoiceDecision === 'Rejected') {
        invoice.validationStatus = 'Rejected';
      } else {
        if (invoice.matchingStatus === 'Mismatch') {
          invoice.validationStatus = 'ReadyForReview';
        } else {
          invoice.validationStatus = 'MissingRequiredFields';
        }
      }
    }

    await invoice.save();

    // 4. Create Audit Log
    const action = getActionName(newStatus, previousStatus);
    const auditLog = new AuditLog({
      invoiceId: invoice._id,
      action,
      previousState: previousStatus,
      newState: newStatus,
      performedBy: userId,
      notes: notes || `Status transitioned from ${previousStatus} to ${newStatus}`,
      metadata: {}
    });
    await auditLog.save();

    return invoice;
  },

  /**
   * Logs a non-transition action for an invoice in the audit trail
   * @param {string} invoiceId - Invoice ID
   * @param {string} action - Action name (e.g. 'Vendor Match Completed', 'PO Match Completed')
   * @param {string} userId - User ID (null for system)
   * @param {string} notes - Action detail logs
   * @param {Object} [metadata] - Optional event metadata details
   * @returns {Promise<Object>} Created AuditLog document
   */
  logAction: async (invoiceId, action, userId = null, notes = '', metadata = {}) => {
    const invoice = await Invoice.findById(invoiceId);
    const stateVal = invoice ? invoice.currentStatus : 'Uploaded';

    const auditLog = new AuditLog({
      invoiceId,
      action,
      previousState: stateVal,
      newState: stateVal,
      performedBy: userId,
      notes,
      metadata
    });
    await auditLog.save();
    return auditLog;
  }
};

export default workflowService;
