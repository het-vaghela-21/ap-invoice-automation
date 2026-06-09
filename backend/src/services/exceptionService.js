import InvoiceException from '../models/InvoiceException.js';
import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Vendor from '../models/Vendor.js';
import workflowService from './workflowService.js';
import { getFuzzySimilarityScore } from '../utils/fuzzyMatching.js';
import validationService from './validationService.js';

const exceptionService = {
  /**
   * Helper to create or find an active exception for an invoice
   */
  createException: async (invoiceId, exceptionType, severity, description) => {
    // Check if an active (non-Closed) exception of the same type already exists for this invoice
    const existing = await InvoiceException.findOne({
      invoiceId,
      exceptionType,
      status: { $ne: 'Closed' }
    });

    if (existing) {
      return existing;
    }

    const exception = new InvoiceException({
      invoiceId,
      exceptionType,
      severity,
      description,
      status: 'Open'
    });
    await exception.save();
    return exception;
  },

  /**
   * Evaluates validation results and auto-creates/resolves exceptions accordingly
   * @param {Object} invoice - Mongoose Invoice document
   * @param {Object} result - Validation engine result
   * @param {string} [userId] - User ID performing the validation (null for System)
   */
  processValidationExceptions: async (invoice, result, userId = null) => {
    const invoiceId = invoice._id;
    const detectedExceptions = [];

    // 1. Vendor NotFound / Match Failed
    if (!invoice.matchedVendor) {
      detectedExceptions.push({
        type: 'Vendor NotFound',
        severity: 'Critical',
        desc: 'A matching Vendor was not selected or not found.'
      });
    } else if (invoice.vendorSimilarityScore < 80) {
      detectedExceptions.push({
        type: 'Vendor NotFound',
        severity: 'Critical',
        desc: `Low vendor name similarity score (${invoice.vendorSimilarityScore}%). Match threshold is 80%.`
      });
    }

    // 2. Duplicate Invoice
    if (invoice.extractedData?.invoiceNumber && invoice.matchedVendor) {
      const duplicateInvoice = await Invoice.findOne({
        _id: { $ne: invoiceId },
        'extractedData.invoiceNumber': { $regex: new RegExp("^" + invoice.extractedData.invoiceNumber.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") },
        matchedVendor: invoice.matchedVendor,
        currentStatus: { $ne: 'Exception' }
      });
      if (duplicateInvoice) {
        detectedExceptions.push({
          type: 'Duplicate Invoice',
          severity: 'Critical',
          desc: `An active invoice with the same number (${invoice.extractedData.invoiceNumber}) already exists for this vendor.`
        });
      }
    }

    // 3. PO NotFound / PO Match Failed
    const hasPoNumber = !!invoice.extractedData?.poNumber;
    if (hasPoNumber) {
      if (!invoice.matchedPO) {
        detectedExceptions.push({
          type: 'PO NotFound',
          severity: 'High',
          desc: `Purchase Order number "${invoice.extractedData.poNumber}" was not found in the database for this vendor.`
        });
      } else if (invoice.matchingStatus === 'Mismatch') {
        detectedExceptions.push({
          type: 'PO Amount Mismatch',
          severity: 'High',
          desc: `Total amount mismatch between invoice ($${invoice.extractedData.totalAmount || 0}) and matched Purchase Order.`
        });
      }
    } else {
      detectedExceptions.push({
        type: 'PO NotFound',
        severity: 'High',
        desc: 'Purchase Order reference number is missing.'
      });
    }

    // 4. Missing Mandatory Fields
    if (result.missingFields && result.missingFields.length > 0) {
      detectedExceptions.push({
        type: 'Missing Mandatory Fields',
        severity: 'Medium',
        desc: `Mandatory fields missing: ${result.missingFields.join(', ')}.`
      });
    }

    // 5. Invalid Invoice Date
    if (invoice.extractedData?.invoiceDate) {
      const parsedDate = new Date(invoice.extractedData.invoiceDate);
      if (isNaN(parsedDate.getTime())) {
        detectedExceptions.push({
          type: 'Invalid Invoice Date',
          severity: 'Medium',
          desc: `Extracted date format is invalid: "${invoice.extractedData.invoiceDate}".`
        });
      } else if (parsedDate > new Date()) {
        detectedExceptions.push({
          type: 'Invalid Invoice Date',
          severity: 'Medium',
          desc: `Invoice date cannot be in the future: "${invoice.extractedData.invoiceDate}".`
        });
      }
    } else {
      detectedExceptions.push({
        type: 'Invalid Invoice Date',
        severity: 'Medium',
        desc: 'Invoice date is missing.'
      });
    }

    // 6. Low OCR Confidence
    let lowConfidenceFields = [];
    if (invoice.confidenceScores) {
      // Convert document to plain object
      const confidenceObj = invoice.confidenceScores.toObject ? invoice.confidenceScores.toObject() : invoice.confidenceScores;
      Object.entries(confidenceObj || {}).forEach(([field, score]) => {
        if (field !== '_id' && score !== null && score !== undefined && score < 70) {
          lowConfidenceFields.push(`${field} (${score}%)`);
        }
      });
    }
    if (lowConfidenceFields.length > 0) {
      detectedExceptions.push({
        type: 'Low OCR Confidence',
        severity: 'Low',
        desc: `OCR Confidence is below the 70% threshold on: ${lowConfidenceFields.join(', ')}.`
      });
    }

    // 7. Validation Failure (General catch-all if any check fails)
    if (detectedExceptions.length > 0) {
      detectedExceptions.push({
        type: 'Validation Failure',
        severity: 'Medium',
        desc: 'Invoice failed one or more automated validation checks.'
      });
    }

    // Create exceptions for all detected issues
    for (const item of detectedExceptions) {
      await exceptionService.createException(invoiceId, item.type, item.severity, item.desc);
    }

    // Auto-close exceptions that are no longer detected
    const activeExceptions = await InvoiceException.find({
      invoiceId,
      status: { $ne: 'Closed' }
    });

    for (const exc of activeExceptions) {
      const isStillPresent = detectedExceptions.some(item => item.type === exc.exceptionType);
      if (!isStillPresent) {
        exc.status = 'Closed';
        exc.resolvedAt = new Date();
        exc.resolutionNotes = 'Automatically resolved by system: validation checks passed upon re-evaluation.';
        await exc.save();

        // Write audit log for auto-close
        await workflowService.logAction(invoiceId, 'Exception Closed', userId, `Exception type "${exc.exceptionType}" automatically closed by system.`, { exceptionId: exc._id });
      }
    }
  },

  /**
   * Re-evaluates active exceptions for an invoice. If all active exceptions are closed,
   * re-evaluates the invoice validation state and transitions it back to Validated or UnderReview.
   */
  recheckAndRecoverInvoice: async (invoiceId, userId = null) => {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return;

    // Check if there are any remaining active exceptions
    const activeExceptionsCount = await InvoiceException.countDocuments({
      invoiceId,
      status: { $ne: 'Closed' }
    });

    if (activeExceptionsCount === 0) {
      // Re-run validation rules to decide if it goes to Validated or UnderReview
      const vendorId = invoice.matchedVendor;
      const candidateData = {
        invoiceNumber: invoice.extractedData?.invoiceNumber || '',
        poNumber: invoice.extractedData?.poNumber || '',
        vendorName: invoice.extractedData?.vendorName || '',
        invoiceDate: invoice.extractedData?.invoiceDate || '',
        totalAmount: invoice.extractedData?.totalAmount || null,
        taxAmount: invoice.extractedData?.taxAmount || null,
        gstNumber: invoice.extractedData?.gstNumber || ''
      };

      let isValid = false;
      let vendorSimilarityScore = 0;
      let poMatched = false;
      let missingFields = [];

      if (vendorId) {
        const vendor = await Vendor.findById(vendorId);
        if (vendor) {
          // 1. Vendor Similarity
          vendorSimilarityScore = getFuzzySimilarityScore(candidateData.vendorName || '', vendor.vendorName);
          // 2. Mandatory fields
          const valResult = validationService.validateFields(candidateData, vendor.mandatoryFields);
          missingFields = valResult.missingFields;
          // 3. PO check
          const cleanedPoNumber = candidateData.poNumber ? candidateData.poNumber.trim() : '';
          if (cleanedPoNumber) {
            const matchingPO = await PurchaseOrder.findOne({
              poNumber: { $regex: new RegExp("^" + cleanedPoNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") },
              vendorId: vendor._id,
              status: { $ne: 'Cancelled' }
            });
            if (matchingPO) {
              const invoiceAmount = parseFloat(candidateData.totalAmount) || 0;
              const poAmount = matchingPO.totalAmount || 0;
              if (Math.abs(invoiceAmount - poAmount) < 0.01) {
                poMatched = true;
              }
            }
          }
        }
      }

      const isVendorMatchPass = vendorSimilarityScore >= 80;
      isValid = isVendorMatchPass && poMatched && missingFields.length === 0;

      // Determine date and duplicate validity as well
      let dateValid = true;
      if (candidateData.invoiceDate) {
        const parsedDate = new Date(candidateData.invoiceDate);
        if (isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
          dateValid = false;
        }
      } else {
        dateValid = false;
      }

      // Check duplicates
      let isDuplicate = false;
      if (candidateData.invoiceNumber && vendorId) {
        const duplicateInvoice = await Invoice.findOne({
          _id: { $ne: invoice._id },
          'extractedData.invoiceNumber': { $regex: new RegExp("^" + candidateData.invoiceNumber.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") },
          matchedVendor: vendorId,
          currentStatus: { $ne: 'Exception' }
        });
        if (duplicateInvoice) {
          isDuplicate = true;
        }
      }

      // Final decision on target status
      const allChecksPass = isValid && dateValid && !isDuplicate;
      const targetStatus = allChecksPass ? 'Validated' : 'UnderReview';
      const notes = allChecksPass
        ? 'Invoice recovered: all exceptions resolved and validations passed.'
        : 'Invoice recovered from exceptions but still requires review.';

      await workflowService.changeInvoiceStatus(invoice._id, targetStatus, userId, notes);
    }
  }
};

export default exceptionService;
