import express from 'express';
import { getInvoiceWorkflowState } from '../controllers/workflowController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All workflow routes require authentication and appropriate roles
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'Manager', 'AccountsExecutive'));

/**
 * @route   GET /api/workflow/invoice/:invoiceId
 * @desc    Get current status and history of an invoice
 */
router.get('/invoice/:invoiceId', getInvoiceWorkflowState);

export default router;
