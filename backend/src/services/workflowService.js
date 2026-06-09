import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';

const ALLOWED_TRANSITIONS = {
  'Uploaded': ['Extracted', 'Exception'],
  'Extracted': ['UnderReview', 'Validated', 'Exception'],
  'UnderReview': ['UnderReview', 'Validated', 'Exception'],
  'Validated': ['ReadyForPayment', 'UnderReview', 'Exception'],
  'Exception': ['UnderReview', 'Validated'],
  'ReadyForPayment': []
};

const workflowService = {
  /**
   * Transition an invoice to a new status and write an audit log.
   * Ensures that transitions are valid and locked documents cannot be modified.
   * @param {Object|string} invoiceOrId - Mongoose Invoice document or ID
   * @param {string} nextStatus - Target workflow status
   * @param {string} userId - User ID performing the action (null for system)
   * @param {string} notes - Audit trail details/explanation
   * @param {string} action - Action category (e.g. 'Status Change', 'Invoice Upload', etc.)
   * @returns {Promise<Object>} The updated and saved Invoice document
   */
  transitionTo: async (invoiceOrId, nextStatus, userId = null, notes = '', action = 'Status Change') => {
    let invoice = invoiceOrId;
    if (typeof invoiceOrId === 'string') {
      invoice = await Invoice.findById(invoiceOrId);
    }
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const previousStatus = invoice.currentStatus || 'Uploaded';

    // 1. Enforce lock restrictions
    // An invoice is locked if finalized (ReadyForPayment) or manually rejected (Exception & Rejected decision)
    const isManuallyRejected = previousStatus === 'Exception' && invoice.invoiceDecision === 'Rejected';
    if (previousStatus === 'ReadyForPayment' || isManuallyRejected) {
      throw new Error('Action blocked: Invoice is locked (finalized or rejected).');
    }

    // 2. Validate state machine transition (allow self-transitions if we're updating details in the same state)
    const allowed = ALLOWED_TRANSITIONS[previousStatus] || [];
    if (previousStatus !== nextStatus && !allowed.includes(nextStatus)) {
      throw new Error(`Workflow error: Invalid status transition from "${previousStatus}" to "${nextStatus}".`);
    }

    // 3. Update status and legacy fields for backward compatibility
    invoice.currentStatus = nextStatus;
    invoice._isWorkflowTransition = true; // flag to bypass direct update blocker in schema pre-save hook
    invoice.lastUpdatedAt = new Date();

    // Mapping legacy status fields
    if (nextStatus === 'Uploaded') {
      invoice.reviewStatus = 'Awaiting Extraction';
      invoice.validationStatus = 'Pending';
    } else if (nextStatus === 'Extracted') {
      invoice.reviewStatus = 'Awaiting Review';
      invoice.validationStatus = 'Pending';
    } else if (nextStatus === 'UnderReview') {
      invoice.reviewStatus = 'Awaiting Review';
      if (invoice.matchingStatus === 'Mismatch') {
        invoice.validationStatus = 'ReadyForReview';
      } else {
        invoice.validationStatus = 'MissingRequiredFields';
      }
    } else if (nextStatus === 'Validated') {
      invoice.reviewStatus = 'Awaiting Review';
      invoice.validationStatus = 'POMatched';
    } else if (nextStatus === 'ReadyForPayment') {
      invoice.reviewStatus = 'ReadyForPayment';
      invoice.validationStatus = 'ReadyForPayment';
      invoice.invoiceDecision = 'Accepted';
    } else if (nextStatus === 'Exception') {
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
    const auditLog = new AuditLog({
      invoiceId: invoice._id,
      action,
      previousState: previousStatus,
      newState: nextStatus,
      performedBy: userId,
      notes: notes || `Status transitioned from ${previousStatus} to ${nextStatus}`
    });
    await auditLog.save();

    return invoice;
  },

  /**
   * Logs a non-transition action for an invoice in the audit trail
   * @param {string} invoiceId - Invoice ID
   * @param {string} action - Action name (e.g. 'Vendor Match', 'PO Match')
   * @param {string} userId - User ID (null for system)
   * @param {string} notes - Action detail logs
   * @param {string} [previousState] - Optional state override
   * @param {string} [newState] - Optional state override
   * @returns {Promise<Object>} Created AuditLog document
   */
  logAction: async (invoiceId, action, userId = null, notes = '', previousState = null, newState = null) => {
    const invoice = await Invoice.findById(invoiceId);
    const stateVal = invoice ? invoice.currentStatus : 'Uploaded';

    const auditLog = new AuditLog({
      invoiceId,
      action,
      previousState: previousState || stateVal,
      newState: newState || stateVal,
      performedBy: userId,
      notes
    });
    await auditLog.save();
    return auditLog;
  }
};

export default workflowService;
