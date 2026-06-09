import { validationResult } from 'express-validator';
import vendorService from '../services/vendorService.js';

/**
 * @desc    Create a new Vendor
 * @route   POST /api/vendors
 * @access  Private (Admin, Manager)
 */
export const createVendor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const vendor = await vendorService.createVendor(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Vendor created successfully',
      data: vendor
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: `Vendor code '${req.body.vendorCode}' already exists`
      });
    }
    next(error);
  }
};

/**
 * @desc    Retrieve all Vendors
 * @route   GET /api/vendors
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.getVendors();
    res.status(200).json({
      status: 'success',
      count: vendors.length,
      data: vendors
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single Vendor by ID
 * @route   GET /api/vendors/:id
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getVendorById = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    if (!vendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: vendor
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing Vendor
 * @route   PUT /api/vendors/:id
 * @access  Private (Admin, Manager)
 */
export const updateVendor = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updatedVendor = await vendorService.updateVendor(req.params.id, req.body);
    if (!updatedVendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Vendor updated successfully',
      data: updatedVendor
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: `Vendor code '${req.body.vendorCode}' already exists`
      });
    }
    next(error);
  }
};

/**
 * @desc    Deactivate a Vendor
 * @route   PATCH /api/vendors/:id/deactivate
 * @access  Private (Admin only)
 */
export const deactivateVendor = async (req, res, next) => {
  try {
    const deactivatedVendor = await vendorService.deactivateVendor(req.params.id);
    if (!deactivatedVendor) {
      return res.status(404).json({
        status: 'error',
        message: 'Vendor not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Vendor deactivated successfully',
      data: deactivatedVendor
    });
  } catch (error) {
    next(error);
  }
};
