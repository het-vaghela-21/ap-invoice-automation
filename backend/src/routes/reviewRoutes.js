import express from 'express';
import { getReviewData, updateReviewData } from '../controllers/reviewController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/review/:invoiceId
 * @desc    Fetch invoice file URL and OCR results for validation
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/:invoiceId',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  getReviewData
);

/**
 * @route   PUT /api/review/:invoiceId
 * @desc    Update invoice OCR parameters and mark as Reviewed
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.put(
  '/:invoiceId',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  updateReviewData
);

export default router;
