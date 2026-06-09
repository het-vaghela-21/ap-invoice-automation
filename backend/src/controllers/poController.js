import { validationResult } from 'express-validator';
import purchaseOrderService from '../services/purchaseOrderService.js';

/**
 * @desc    Create a new Purchase Order
 * @route   POST /api/po
 * @access  Private (Admin, Manager)
 */
export const createPurchaseOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // req.user is populated by authenticateUser middleware
    const po = await purchaseOrderService.createPO(req.body, req.user._id);

    res.status(201).json({
      status: 'success',
      message: 'Purchase Order created successfully',
      data: po
    });
  } catch (error) {
    // Handle MongoDB unique index violations (code 11000)
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: `Purchase Order number '${req.body.poNumber}' already exists`
      });
    }
    next(error);
  }
};

/**
 * @desc    Retrieve all Purchase Orders
 * @route   GET /api/po
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getPurchaseOrders = async (req, res, next) => {
  try {
    const pos = await purchaseOrderService.getPOs();
    res.status(200).json({
      status: 'success',
      count: pos.length,
      data: pos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single Purchase Order by ID
 * @route   GET /api/po/:id
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getPurchaseOrderById = async (req, res, next) => {
  try {
    const po = await purchaseOrderService.getPOById(req.params.id);
    if (!po) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase Order not found'
      });
    }
    res.status(200).json({
      status: 'success',
      data: po
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update an existing Purchase Order
 * @route   PUT /api/po/:id
 * @access  Private (Admin, Manager)
 */
export const updatePurchaseOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const updatedPO = await purchaseOrderService.updatePO(req.params.id, req.body);
    if (!updatedPO) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Purchase Order updated successfully',
      data: updatedPO
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: `Purchase Order number '${req.body.poNumber}' already exists`
      });
    }
    next(error);
  }
};

/**
 * @desc    Cancel a Purchase Order
 * @route   PATCH /api/po/:id/cancel
 * @access  Private (Admin)
 */
export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    const cancelledPO = await purchaseOrderService.cancelPO(req.params.id);
    if (!cancelledPO) {
      return res.status(404).json({
        status: 'error',
        message: 'Purchase Order not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Purchase Order cancelled successfully',
      data: cancelledPO
    });
  } catch (error) {
    next(error);
  }
};
