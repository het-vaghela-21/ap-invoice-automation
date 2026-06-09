import InvoiceException from '../models/InvoiceException.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import workflowService from '../services/workflowService.js';
import exceptionService from '../services/exceptionService.js';

/**
 * @desc    Get all invoice exceptions with filtering and search
 * @route   GET /api/exceptions
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getExceptions = async (req, res, next) => {
  try {
    const query = {};

    // 1. Filter by Status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // 2. Filter by Severity
    if (req.query.severity) {
      query.severity = req.query.severity;
    }

    // 3. Filter by Exception Type
    if (req.query.exceptionType) {
      query.exceptionType = req.query.exceptionType;
    }

    // 4. Filter by Date Range (Ingest / Creation date)
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    // 5. Filter by Vendor
    if (req.query.vendorId) {
      const invoices = await Invoice.find({ matchedVendor: req.query.vendorId }).select('_id');
      const invoiceIds = invoices.map(inv => inv._id);
      query.invoiceId = { $in: invoiceIds };
    }

    // 6. Search (Invoice number, Description, Vendor name)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      const matchingInvoices = await Invoice.find({
        $or: [
          { 'extractedData.invoiceNumber': searchRegex },
          { 'extractedData.vendorName': searchRegex },
          { originalFileName: searchRegex }
        ]
      }).select('_id');
      const invoiceIds = matchingInvoices.map(inv => inv._id);

      query.$or = [
        { invoiceId: { $in: invoiceIds } },
        { description: searchRegex }
      ];
    }

    // Fetch exceptions populated with details
    const exceptions = await InvoiceException.find(query)
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'matchedVendor', select: 'vendorName vendorCode vendorGST' },
          { path: 'matchedPO', select: 'poNumber totalAmount' }
        ]
      })
      .populate('assignedTo', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      count: exceptions.length,
      data: exceptions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get detailed parameters of a single exception by ID
 * @route   GET /api/exceptions/:id
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getExceptionById = async (req, res, next) => {
  try {
    const exception = await InvoiceException.findById(req.params.id)
      .populate({
        path: 'invoiceId',
        populate: [
          { path: 'matchedVendor' },
          { path: 'matchedPO' }
        ]
      })
      .populate('assignedTo', 'firstName lastName email role');

    if (!exception) {
      return res.status(404).json({
        status: 'error',
        message: 'Exception not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: exception
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign an exception to an executive (Restricted to Admin/Manager)
 * @route   PATCH /api/exceptions/:id/assign
 * @access  Private (Admin, Manager only)
 */
export const assignException = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const exception = await InvoiceException.findById(req.params.id);

    if (!exception) {
      return res.status(404).json({
        status: 'error',
        message: 'Exception not found'
      });
    }

    // Allow null to unassign
    let assignedUser = null;
    if (userId) {
      assignedUser = await User.findById(userId);
      if (!assignedUser) {
        return res.status(404).json({
          status: 'error',
          message: 'Assigned user not found'
        });
      }
    }

    const previousAssignee = exception.assignedTo;
    exception.assignedTo = userId || null;

    if (exception.status === 'Open' && userId) {
      exception.status = 'InProgress';
    }

    await exception.save();

    // Log the assignment action
    const assigneeName = assignedUser
      ? `${assignedUser.firstName} ${assignedUser.lastName}`
      : 'Unassigned';
    await workflowService.logAction(
      exception.invoiceId,
      'Exception Assigned',
      req.user._id,
      `Exception type "${exception.exceptionType}" assigned to ${assigneeName}.`,
      { exceptionId: exception._id, assignedTo: exception.assignedTo }
    );

    res.status(200).json({
      status: 'success',
      message: `Exception successfully assigned to ${assigneeName}`,
      data: exception
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resolve an exception (AccountsExecutive / Admin / Manager)
 * @route   PATCH /api/exceptions/:id/resolve
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const resolveException = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const exception = await InvoiceException.findById(req.params.id);

    if (!exception) {
      return res.status(404).json({
        status: 'error',
        message: 'Exception not found'
      });
    }

    // Verify status transition permission (can't resolve closed)
    if (exception.status === 'Closed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot resolve a closed exception.'
      });
    }

    exception.status = 'Resolved';
    exception.resolvedAt = new Date();
    exception.resolutionNotes = resolutionNotes || 'Manually resolved.';
    await exception.save();

    // Log to audit log
    await workflowService.logAction(
      exception.invoiceId,
      'Exception Resolved',
      req.user._id,
      `Exception type "${exception.exceptionType}" marked as Resolved. Notes: ${exception.resolutionNotes}`,
      { exceptionId: exception._id }
    );

    res.status(200).json({
      status: 'success',
      message: 'Exception successfully marked as Resolved',
      data: exception
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Close an exception and trigger recovery evaluation
 * @route   PATCH /api/exceptions/:id/close
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const closeException = async (req, res, next) => {
  try {
    const { resolutionNotes } = req.body;
    const exception = await InvoiceException.findById(req.params.id);

    if (!exception) {
      return res.status(404).json({
        status: 'error',
        message: 'Exception not found'
      });
    }

    exception.status = 'Closed';
    if (!exception.resolvedAt) {
      exception.resolvedAt = new Date();
    }
    if (resolutionNotes) {
      exception.resolutionNotes = resolutionNotes;
    }
    await exception.save();

    // Log to audit log
    await workflowService.logAction(
      exception.invoiceId,
      'Exception Closed',
      req.user._id,
      `Exception type "${exception.exceptionType}" closed. Notes: ${exception.resolutionNotes || 'N/A'}`,
      { exceptionId: exception._id }
    );

    // Trigger Invoice Recovery check
    await exceptionService.recheckAndRecoverInvoice(exception.invoiceId, req.user._id);

    res.status(200).json({
      status: 'success',
      message: 'Exception closed and invoice recovery triggered successfully.',
      data: exception
    });
  } catch (error) {
    next(error);
  }
};
