import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import validationService from '../services/validationService.js';
import { getFuzzySimilarityScore } from '../utils/fuzzyMatching.js';
import workflowService from '../services/workflowService.js';

/**
 * Helper to execute full validation & matching checks on an invoice.
 * Updates the invoice document state in-place (does not call save()).
 */
const runValidationEngine = async (invoice, candidateData, vendorId) => {
  if (!vendorId) {
    invoice.validationStatus = 'MissingRequiredFields';
    invoice.matchingStatus = 'NotMatched';
    invoice.matchedVendor = null;
    invoice.vendorSimilarityScore = 0;
    invoice.matchedPO = null;
    invoice.invoiceDecision = 'Pending';
    return {
      isValid: false,
      message: 'A Vendor must be selected.'
    };
  }

  const vendor = await Vendor.findById(vendorId);
  if (!vendor) {
    throw new Error('Selected Vendor does not exist.');
  }

  // 1. Calculate Vendor Similarity Score
  // Compare input vendorName against database vendorName
  const inputVendorName = candidateData.vendorName || '';
  const similarity = getFuzzySimilarityScore(inputVendorName, vendor.vendorName);
  invoice.matchedVendor = vendor._id;
  invoice.vendorSimilarityScore = similarity;

  // 2. Run Mandatory Field Validation
  const valResult = validationService.validateFields(candidateData, vendor.mandatoryFields);
  let fieldsValid = valResult.isValid;

  // 3. Run PO Matching (Number match + Amount Match)
  let poValid = false;
  const cleanedPoNumber = candidateData.poNumber ? candidateData.poNumber.trim() : '';
  
  if (cleanedPoNumber) {
    const matchingPO = await PurchaseOrder.findOne({
      poNumber: { $regex: new RegExp("^" + cleanedPoNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") },
      vendorId: vendor._id,
      status: { $ne: 'Cancelled' }
    });

    if (matchingPO) {
      invoice.matchedPO = matchingPO._id;
      // Amount Check
      const invoiceAmount = parseFloat(candidateData.totalAmount) || 0;
      const poAmount = matchingPO.totalAmount || 0;
      
      if (Math.abs(invoiceAmount - poAmount) < 0.01) {
        invoice.matchingStatus = 'Matched';
        poValid = true;
      } else {
        invoice.matchingStatus = 'Mismatch'; // Amount mismatch
        poValid = false;
      }
    } else {
      invoice.matchedPO = null;
      invoice.matchingStatus = 'Mismatch'; // PO number not found for this vendor
      poValid = false;
    }
  } else {
    invoice.matchedPO = null;
    invoice.matchingStatus = 'NotMatched';
    poValid = false;
  }

  // Determine Overall Validation Status
  if (!fieldsValid) {
    invoice.validationStatus = 'MissingRequiredFields';
  } else if (poValid) {
    invoice.validationStatus = 'POMatched';
  } else {
    invoice.validationStatus = 'ReadyForReview'; // Fields valid but PO mismatch/missing
  }

  // Overall Decision (Finalizable only when all pass)
  const isVendorMatchPass = similarity >= 80;
  const allChecksPass = fieldsValid && poValid && isVendorMatchPass;
  
  return {
    isValid: allChecksPass,
    missingFields: valResult.missingFields,
    vendorSimilarityScore: similarity,
    poMatched: poValid,
    isVendorMatchPass
  };
};

/**
 * @desc    Get details of an invoice for the Validation Workspace
 * @route   GET /api/validation/:invoiceId
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const getValidationData = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId)
      .populate('matchedVendor')
      .populate('matchedPO')
      .populate('reviewedBy', 'firstName lastName email');
    
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Load all vendors and compute similarity scores to display in the dropdown list
    const vendors = await Vendor.find();
    const inputVendorName = invoice.extractedData?.vendorName || '';
    
    const vendorsWithScores = vendors.map(v => {
      const score = getFuzzySimilarityScore(inputVendorName, v.vendorName);
      return {
        _id: v._id,
        vendorName: v.vendorName,
        vendorCode: v.vendorCode,
        vendorGST: v.vendorGST,
        mandatoryFields: v.mandatoryFields,
        similarityScore: score
      };
    }).sort((a, b) => b.similarityScore - a.similarityScore);

    res.status(200).json({
      status: 'success',
      data: {
        invoice,
        vendorsList: vendorsWithScores
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Save changes to invoice extracted fields (WITHOUT running validation/matching)
 * @route   PUT /api/validation/:invoiceId
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const saveChanges = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { fields, vendorId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Check Lock State
    const isLocked = invoice.currentStatus === 'ReadyForPayment' || (invoice.currentStatus === 'Exception' && invoice.invoiceDecision === 'Rejected') || invoice.reviewStatus === 'ReadyForPayment' || invoice.invoiceDecision === 'Rejected';
    if (isLocked) {
      return res.status(400).json({
        status: 'error',
        message: 'This invoice is finalized or rejected and cannot be modified.'
      });
    }

    if (fields) {
      invoice.extractedData = {
        invoiceNumber: fields.invoiceNumber || null,
        poNumber: fields.poNumber || null,
        vendorName: fields.vendorName || null,
        invoiceDate: fields.invoiceDate || null,
        totalAmount: fields.totalAmount !== undefined && fields.totalAmount !== '' ? parseFloat(fields.totalAmount) : null,
        taxAmount: fields.taxAmount !== undefined && fields.taxAmount !== '' ? parseFloat(fields.taxAmount) : null,
        gstNumber: fields.gstNumber || null
      };
    }

    if (vendorId) {
      invoice.matchedVendor = vendorId;
    } else {
      invoice.matchedVendor = null;
    }

    // Save fields before workflow transition
    await invoice.save();

    // Transition status to UnderReview (handles statusHistory and logs action)
    await workflowService.changeInvoiceStatus(invoice._id, 'UnderReview', req.user._id, 'Saved modifications to extracted fields.');

    res.status(200).json({
      status: 'success',
      message: 'Changes saved successfully',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Re-run Vendor Matching, Field Validation, and PO Matching
 * @route   POST /api/validation/:invoiceId/validate
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const reRunValidation = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { fields, vendorId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Check Lock State
    const isLocked = invoice.currentStatus === 'ReadyForPayment' || (invoice.currentStatus === 'Exception' && invoice.invoiceDecision === 'Rejected') || invoice.reviewStatus === 'ReadyForPayment' || invoice.invoiceDecision === 'Rejected';
    if (isLocked) {
      return res.status(400).json({
        status: 'error',
        message: 'This invoice is finalized or rejected and cannot be modified.'
      });
    }

    const candidateData = {
      invoiceNumber: fields.invoiceNumber || '',
      poNumber: fields.poNumber || '',
      vendorName: fields.vendorName || '',
      invoiceDate: fields.invoiceDate || '',
      totalAmount: fields.totalAmount !== undefined && fields.totalAmount !== '' ? parseFloat(fields.totalAmount) : null,
      taxAmount: fields.taxAmount !== undefined && fields.taxAmount !== '' ? parseFloat(fields.taxAmount) : null,
      gstNumber: fields.gstNumber || ''
    };

    // Run Engine
    const result = await runValidationEngine(invoice, candidateData, vendorId);
    // Save matching fields in DB before transition
    await invoice.save();

    // Log validation and matching events
    await workflowService.logAction(invoice._id, 'Vendor Match Completed', req.user._id, `Vendor similarity score: ${result.vendorSimilarityScore}%. Vendor: ${invoice.extractedData.vendorName || 'N/A'}`);
    await workflowService.logAction(invoice._id, 'PO Match Completed', req.user._id, `PO matching status: ${invoice.matchingStatus}. PO matched: ${result.poMatched ? 'YES' : 'NO'}`);

    // Transition status (automatically logs 'Invoice Validated' or 'Status Changed')
    const targetStatus = result.isValid ? 'Validated' : 'Exception';
    const transitionNotes = result.isValid 
      ? 'Invoice validation checks passed successfully.' 
      : `Invoice validation failed. Mismatches/warnings detected: ${result.missingFields.length > 0 ? `Missing: ${result.missingFields.join(', ')}` : ''} ${!result.poMatched ? 'PO Mismatch' : ''} ${!result.isVendorMatchPass ? 'Low vendor similarity score' : ''}`;

    await workflowService.changeInvoiceStatus(invoice._id, targetStatus, req.user._id, transitionNotes);

    res.status(200).json({
      status: 'success',
      message: 'Validation executed successfully',
      data: {
        invoice,
        validationResult: result
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Finalize the invoice (Locks document, sets ReadyForPayment and Accept decision)
 * @route   POST /api/validation/:invoiceId/finalize
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const finalizeInvoice = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { fields, vendorId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Check Lock State
    const isLocked = invoice.currentStatus === 'ReadyForPayment' || (invoice.currentStatus === 'Exception' && invoice.invoiceDecision === 'Rejected') || invoice.reviewStatus === 'ReadyForPayment' || invoice.invoiceDecision === 'Rejected';
    if (isLocked) {
      return res.status(400).json({
        status: 'error',
        message: 'This invoice is already finalized or rejected.'
      });
    }

    const candidateData = {
      invoiceNumber: fields.invoiceNumber || '',
      poNumber: fields.poNumber || '',
      vendorName: fields.vendorName || '',
      invoiceDate: fields.invoiceDate || '',
      totalAmount: fields.totalAmount !== undefined && fields.totalAmount !== '' ? parseFloat(fields.totalAmount) : null,
      taxAmount: fields.taxAmount !== undefined && fields.taxAmount !== '' ? parseFloat(fields.taxAmount) : null,
      gstNumber: fields.gstNumber || ''
    };

    // Run Engine
    const result = await runValidationEngine(invoice, candidateData, vendorId);

    if (!result.isValid) {
      let failMessage = 'Finalization Blocked: ';
      const details = [];
      if (!result.isVendorMatchPass) details.push(`Vendor Match score (${result.vendorSimilarityScore}%) is below the required 80% threshold.`);
      if (!result.poMatched) details.push('Purchase Order matching failed (number or amount mismatch).');
      if (result.missingFields.length > 0) details.push(`Missing mandatory fields: ${result.missingFields.join(', ')}.`);
      
      return res.status(400).json({
        status: 'error',
        message: failMessage + details.join(' ')
      });
    }

    // Lock and Finalize
    invoice.extractedData = candidateData;
    invoice.invoiceDecision = 'Accepted';
    invoice.reviewedBy = req.user._id;
    invoice.reviewedAt = new Date();

    // Save locked fields before workflow transition
    await invoice.save();

    // Transition status to ReadyForPayment (automatically logs 'Invoice Finalized')
    await workflowService.changeInvoiceStatus(invoice._id, 'ReadyForPayment', req.user._id, 'Invoice finalized and approved for payment.');

    res.status(200).json({
      status: 'success',
      message: 'Invoice finalized and accepted successfully. Status is now ReadyForPayment.',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reject the invoice (Locks document, sets Reviewed and Reject decision)
 * @route   POST /api/validation/:invoiceId/reject
 * @access  Private (Admin, Manager, AccountsExecutive)
 */
export const rejectInvoice = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { fields, vendorId } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: 'error',
        message: 'Invoice not found'
      });
    }

    // Check Lock State
    const isLocked = invoice.currentStatus === 'ReadyForPayment' || (invoice.currentStatus === 'Exception' && invoice.invoiceDecision === 'Rejected') || invoice.reviewStatus === 'ReadyForPayment' || invoice.invoiceDecision === 'Rejected';
    if (isLocked) {
      return res.status(400).json({
        status: 'error',
        message: 'This invoice is already finalized or rejected.'
      });
    }

    const candidateData = {
      invoiceNumber: fields?.invoiceNumber || invoice.extractedData?.invoiceNumber || '',
      poNumber: fields?.poNumber || invoice.extractedData?.poNumber || '',
      vendorName: fields?.vendorName || invoice.extractedData?.vendorName || '',
      invoiceDate: fields?.invoiceDate || invoice.extractedData?.invoiceDate || '',
      totalAmount: fields?.totalAmount !== undefined && fields?.totalAmount !== '' ? parseFloat(fields.totalAmount) : (invoice.extractedData?.totalAmount || null),
      taxAmount: fields?.taxAmount !== undefined && fields?.taxAmount !== '' ? parseFloat(fields.taxAmount) : (invoice.extractedData?.taxAmount || null),
      gstNumber: fields?.gstNumber || invoice.extractedData?.gstNumber || ''
    };

    if (vendorId) {
      invoice.matchedVendor = vendorId;
    }

    // Lock and Reject
    invoice.extractedData = candidateData;
    invoice.invoiceDecision = 'Rejected';
    invoice.reviewedBy = req.user._id;
    invoice.reviewedAt = new Date();

    // Save rejected fields before workflow transition
    await invoice.save();

    // Transition status to Exception (automatically logs 'Status Changed')
    await workflowService.changeInvoiceStatus(invoice._id, 'Exception', req.user._id, 'Invoice manually rejected.');

    res.status(200).json({
      status: 'success',
      message: 'Invoice has been manually rejected.',
      data: invoice
    });
  } catch (error) {
    next(error);
  }
};
