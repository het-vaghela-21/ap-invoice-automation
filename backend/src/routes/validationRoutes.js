import express from 'express';
import { 
  getValidationData, 
  saveChanges, 
  reRunValidation, 
  finalizeInvoice, 
  rejectInvoice 
} from '../controllers/validationController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// All validation workspace routes require authentication and specific roles
router.use(authenticateUser);
router.use(authorizeRoles('Admin', 'Manager', 'AccountsExecutive'));

/**
 * @route   GET /api/validation/:invoiceId
 * @desc    Fetch invoice and fuzzy-scored vendors list for Validation Workspace
 */
router.get('/:invoiceId', getValidationData);

/**
 * @route   PUT /api/validation/:invoiceId
 * @desc    Save edited extracted fields (without triggering matching/validation)
 */
router.put('/:invoiceId', saveChanges);

/**
 * @route   POST /api/validation/:invoiceId/validate
 * @desc    Re-run Vendor matching score, Field validation, and PO matching
 */
router.post('/:invoiceId/validate', reRunValidation);

/**
 * @route   POST /api/validation/:invoiceId/finalize
 * @desc    Finalize the invoice (Locks document, sets ReadyForPayment and Accepted decision)
 */
router.post('/:invoiceId/finalize', finalizeInvoice);

/**
 * @route   POST /api/validation/:invoiceId/reject
 * @desc    Reject the invoice (Locks document, sets Rejected decision)
 */
router.post('/:invoiceId/reject', rejectInvoice);

export default router;
