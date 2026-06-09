import express from 'express';
import { check } from 'express-validator';
import * as vendorController from '../controllers/vendorController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Validation rules for creating/updating Vendors
 */
const vendorValidationRules = [
  check('vendorCode', 'Vendor code is required').trim().notEmpty(),
  check('vendorName', 'Vendor name is required').trim().notEmpty(),
  check('vendorEmail', 'Please enter a valid vendor email').isEmail().normalizeEmail(),
  check('vendorGST', 'Vendor GST number is required').trim().notEmpty(),
  check('mandatoryFields', 'Mandatory fields must be an array of strings').optional().isArray()
];

/**
 * @route   POST /api/vendors
 * @desc    Create a new Vendor
 * @access  Private (Admin, Manager)
 */
router.post(
  '/',
  authenticateUser,
  authorizeRoles('Admin', 'Manager'),
  vendorValidationRules,
  vendorController.createVendor
);

/**
 * @route   GET /api/vendors
 * @desc    Get all Vendors
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  vendorController.getVendors
);

/**
 * @route   GET /api/vendors/:id
 * @desc    Get Vendor details by ID
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/:id',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  vendorController.getVendorById
);

/**
 * @route   PUT /api/vendors/:id
 * @desc    Update a Vendor
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authenticateUser,
  authorizeRoles('Admin', 'Manager'),
  vendorValidationRules,
  vendorController.updateVendor
);

/**
 * @route   PATCH /api/vendors/:id/deactivate
 * @desc    Deactivate a Vendor
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/deactivate',
  authenticateUser,
  authorizeRoles('Admin'),
  vendorController.deactivateVendor
);

export default router;
