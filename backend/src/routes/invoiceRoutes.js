import express from 'express';
import * as invoiceController from '../controllers/invoiceController.js';
import { authenticateUser, authorizeRoles } from '../middleware/authMiddleware.js';
import { multerUpload } from '../config/cloudinary.js';

const router = express.Router();

/**
 * @route   POST /api/invoices/upload
 * @desc    Upload an invoice file and create database record
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.post(
  '/upload',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  multerUpload.single('invoiceFile'),
  invoiceController.uploadInvoice
);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoice documents list
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  invoiceController.getInvoices
);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice details by ID
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.get(
  '/:id',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  invoiceController.getInvoiceById
);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Purge invoice record and clean files from storage
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticateUser,
  authorizeRoles('Admin'),
  invoiceController.deleteInvoice
);

/**
 * @route   POST /api/invoices/:id/extract
 * @desc    Trigger automated OCR extraction processing
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
router.post(
  '/:id/extract',
  authenticateUser,
  authorizeRoles('Admin', 'Manager', 'AccountsExecutive'),
  invoiceController.triggerExtraction
);

export default router;
