import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Invoice from '../models/Invoice.js';

const notificationService = {
  /**
   * Helper to create a notification for userIds and/or roles.
   * Checks for duplicate notifications within the last 5 seconds.
   */
  createNotification: async ({ userIds = [], roleNames = [], title, message, type, entityType, entityId }) => {
    try {
      const targetUserIds = new Set();

      // 1. Add direct userIds
      const resolvedUserIds = Array.isArray(userIds) ? userIds : [userIds];
      resolvedUserIds.forEach(id => {
        if (id) targetUserIds.add(id.toString());
      });

      // 2. Add users matching roles
      if (roleNames.length > 0) {
        const usersByRole = await User.find({ role: { $in: roleNames }, isActive: true }).select('_id');
        usersByRole.forEach(user => {
          targetUserIds.add(user._id.toString());
        });
      }

      // 3. Create notifications for each unique target user
      const threshold = new Date(Date.now() - 5000); // 5 seconds duplication window
      const creationPromises = Array.from(targetUserIds).map(async (userIdStr) => {
        // Prevent duplicates within 5 seconds
        const duplicate = await Notification.findOne({
          userId: userIdStr,
          title,
          message,
          type,
          entityId,
          createdAt: { $gte: threshold }
        });

        if (!duplicate) {
          const notification = new Notification({
            userId: userIdStr,
            title,
            message,
            type,
            entityType,
            entityId,
            isRead: false
          });
          return notification.save();
        }
      });

      await Promise.all(creationPromises);
    } catch (err) {
      console.error('Error creating notifications:', err);
    }
  },

  /**
   * Translates workflow and audit events on an invoice to targeted notifications.
   * @param {Object|string} invoiceOrId - The Invoice document or its ObjectId
   * @param {string} event - The triggered event name
   * @param {string} notes - Detail notes or comments associated with the event
   * @param {Object} metadata - Additional event metadata (e.g. assignedTo user, exceptionId)
   */
  triggerNotificationForInvoice: async (invoiceOrId, event, notes = '', metadata = {}) => {
    try {
      let invoice = invoiceOrId;
      if (typeof invoiceOrId === 'string' || invoiceOrId instanceof mongoose.Types.ObjectId || (invoiceOrId && !invoiceOrId.originalFileName)) {
        invoice = await Invoice.findById(invoiceOrId);
      }

      if (!invoice) {
        console.error(`Notification trigger aborted: Invoice ${invoiceOrId} not found.`);
        return;
      }

      const invoiceNum = invoice.extractedData?.invoiceNumber || 'N/A';
      const fileName = invoice.originalFileName || 'N/A';
      const entityId = invoice._id;
      const entityType = 'Invoice';

      let title = '';
      let message = '';
      let type = 'System';
      let userIds = [];
      let roleNames = [];

      // Always include uploader if available
      if (invoice.uploadedBy) {
        userIds.push(invoice.uploadedBy);
      }

      switch (event) {
        case 'OCR Extraction Completed':
          title = 'OCR Ingestion Complete';
          message = `OCR extraction completed successfully for invoice "${invoiceNum}" (${fileName}).`;
          type = 'OCR';
          roleNames = ['Admin', 'Manager', 'AccountsExecutive'];
          break;

        case 'Validation Passed':
          title = 'Validation Passed';
          message = `Invoice "${invoiceNum}" has successfully passed all automated validation checks.`;
          type = 'Validation';
          roleNames = ['Admin', 'Manager', 'AccountsExecutive'];
          break;

        case 'Validation Failed':
          title = 'Validation Failed';
          message = `Invoice "${invoiceNum}" failed automated validation checks. ${notes || ''}`.trim();
          type = 'Validation';
          roleNames = ['Admin', 'Manager', 'AccountsExecutive'];
          break;

        case 'Exception Assigned':
          title = 'Exception Assigned';
          // Direct assignee is in metadata
          if (metadata.assignedTo) {
            userIds = [metadata.assignedTo]; // Override to notify ONLY the assignee
            roleNames = [];
            message = `You have been assigned a new exception on invoice "${invoiceNum}". Notes: ${notes || 'N/A'}`;
          } else {
            return; // No target assignee
          }
          type = 'Exception';
          break;

        case 'Exception Resolved':
          title = 'Exception Resolved';
          message = `An exception on invoice "${invoiceNum}" was resolved. Notes: ${notes || 'N/A'}`;
          type = 'Exception';
          roleNames = ['Admin', 'Manager', 'AccountsExecutive'];
          break;

        case 'Invoice Ready For Payment':
          title = 'Invoice Ready For Payment';
          message = `Invoice "${invoiceNum}" is now approved and ready for payment processing.`;
          type = 'Payment';
          roleNames = ['Admin', 'Manager', 'AccountsExecutive'];
          break;

        case 'Invoice Marked Paid':
          title = 'Invoice Marked Paid';
          message = `Invoice "${invoiceNum}" has been successfully marked as Paid. Reference: ${notes || 'N/A'}`;
          type = 'Payment';
          roleNames = ['Admin', 'Manager', 'AccountsExecutive'];
          break;

        default:
          console.warn(`Unmapped notification event received: ${event}`);
          return;
      }

      await notificationService.createNotification({
        userIds,
        roleNames,
        title,
        message,
        type,
        entityType,
        entityId
      });
    } catch (err) {
      console.error('Error triggering notification for invoice:', err);
    }
  }
};

export default notificationService;
