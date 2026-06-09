import express from 'express';
import { check } from 'express-validator';
import * as poController from '../controllers/poController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Validation rules for creating/updating Purchase Orders
 */
const poValidationRules = [
  check('poNumber', 'Purchase order number is required').trim().notEmpty(),
  check('vendorId', 'Vendor selection is required').trim().notEmpty().isMongoId(),
  check('vendorName', 'Vendor name is required').trim().notEmpty(),
  check('vendorEmail', 'Please enter a valid vendor email').isEmail().normalizeEmail(),
  check('totalAmount', 'Total amount must be greater than zero').isFloat({ min: 0.01 }),
  check('status', 'Valid status is required').isIn(['Draft', 'Open', 'Closed', 'Cancelled'])
];

/**
 * @route   POST /api/po
 * @desc    Create a new Purchase Order
 * @access  Private (Admin, Manager)
 */
router.post(
  '/',
  authenticateUser,
  authorizeRoles('Admin', 'Manager'),
  poValidationRules,
  poController.createPurchaseOrder
);

/**
 * @route   GET /api/po
 * @desc    Get all Purchase Orders
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  poController.getPurchaseOrders
);

/**
 * @route   GET /api/po/:id
 * @desc    Get Purchase Order details by ID
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/:id',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  poController.getPurchaseOrderById
);

/**
 * @route   PUT /api/po/:id
 * @desc    Update a Purchase Order
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authenticateUser,
  authorizeRoles('Admin', 'Manager'),
  poValidationRules,
  poController.updatePurchaseOrder
);

/**
 * @route   PATCH /api/po/:id/cancel
 * @desc    Cancel a Purchase Order
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/cancel',
  authenticateUser,
  authorizeRoles('Admin'),
  poController.cancelPurchaseOrder
);

export default router;
