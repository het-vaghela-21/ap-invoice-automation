import express from 'express';
import { getInvoiceAuditLogs } from '../controllers/auditController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All audit routes require authentication and appropriate roles
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'Manager', 'AccountsExecutive'));

/**
 * @route   GET /api/audit/invoice/:invoiceId
 * @desc    Get complete audit activity history for an invoice
 */
router.get('/invoice/:invoiceId', getInvoiceAuditLogs);

export default router;
