import { validationResult } from 'express-validator';
import invoiceService from '../services/invoiceService.js';

/**
 * @desc    Upload and register a new invoice document
 * @route   POST /api/invoices/upload
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const uploadInvoice = async (req, res, next) => {
  try {
    // 1. Assert file attachment exists
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed: Invoice file attachment (invoiceFile) is required'
      });
    }

    const invoice = await invoiceService.uploadInvoice(
      req.file,
      req.user._id
    );

    res.status(201).json({
      status: 'success',
      message: 'Invoice uploaded and registered successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve all invoice documents
 * @route   GET /api/invoices
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getInvoices = async (req, res, next) => {
  try {
    const invoices = await invoiceService.getInvoices();
    res.status(200).json({
      status: 'success',
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve details of an invoice by ID
 * @route   GET /api/invoices/:id
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await invoiceService.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an invoice document and remove it from storage
 * @route   DELETE /api/invoices/:id
 * @access  Private (Admin only)
 */
export const deleteInvoice = async (req, res, next) => {
  try {
    const deletedInvoice = await invoiceService.deleteInvoice(req.params.id);
    if (!deletedInvoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Invoice document and file purged successfully',
      data: deletedInvoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Trigger OCR extraction on an invoice document
 * @route   POST /api/invoices/:id/extract
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const triggerExtraction = async (req, res, next) => {
  try {
    const invoice = await invoiceService.extractInvoice(req.params.id);
    res.status(200).json({
      status: 'success',
      message: 'OCR document extraction pipeline initialized',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};
