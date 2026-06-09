import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import validationService from './validationService.js';
import { uploadFile, deleteFile } from '../config/cloudinary.js';
import workflowService from './workflowService.js';
import { runValidationEngine } from '../controllers/validationController.js';
import exceptionService from './exceptionService.js';
import { getFuzzySimilarityScore } from '../utils/fuzzyMatching.js';

/**
 * Reusable Service Layer for Invoice Management (Refactored for True Automation & OCR)
 */
const invoiceService = {
  /**
   * Upload an invoice document and register it in the database with status flags
   * @param {Object} file - Express Multer file object
   * @param {string} userId - Uploader user ID
   * @returns {Promise<Object>} Created Invoice document
   */
  uploadInvoice: async (file, userId) => {
    if (!file) {
      throw new Error('Invoice file attachment is required');
    }

    // 1. Stream/Upload file to storage (Cloudinary or local uploads folder fallback)
    const storageResult = await uploadFile(file);

    // 2. Create invoice document in database
    const newInvoice = new Invoice({
      invoiceFileUrl: storageResult.url,
      invoicePublicId: storageResult.publicId,
      originalFileName: file.originalname,
      extractionStatus: 'Pending',
      matchingStatus: 'NotMatched',
      reviewStatus: 'Awaiting Extraction',
      validationStatus: 'Pending',
      currentStatus: 'Uploaded',
      statusHistory: [{ status: 'Uploaded', updatedAt: new Date() }],
      lastUpdatedAt: new Date(),
      extractedData: {
        invoiceNumber: null,
        poNumber: null,
        vendorName: null,
        invoiceDate: null,
        totalAmount: null,
        taxAmount: null
      },
      confidenceScores: {
        invoiceNumber: null,
        poNumber: null,
        vendorName: null,
        invoiceDate: null,
        totalAmount: null,
        taxAmount: null
      },
      matchedPO: null,
      uploadedBy: userId
    });
    newInvoice._isWorkflowTransition = true; // allow initial save bypass

    const savedInvoice = await newInvoice.save();

    // Log Invoice Upload to AuditLog
    await workflowService.logAction(savedInvoice._id, 'Invoice Upload', userId, 'Invoice uploaded successfully', null, 'Uploaded');
    return await savedInvoice.populate([
      { path: 'matchedVendor' },
      { path: 'matchedPO', select: 'poNumber vendorName' },
      { path: 'uploadedBy', select: 'firstName lastName email' }
    ]);
  },

  /**
   * Retrieves all invoice documents sorted by creation date descending
   * @returns {Promise<Array>} List of invoices
   */
  getInvoices: async () => {
    return await Invoice.find()
      .populate('matchedVendor')
      .populate('matchedPO', 'poNumber vendorName')
      .populate('uploadedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  },

  /**
   * Retrieves detailed parameters of an invoice by ID
   * @param {string} id - Invoice ObjectId
   * @returns {Promise<Object|null>} Invoice document
   */
  getInvoiceById: async (id) => {
    return await Invoice.findById(id)
      .populate('matchedVendor')
      .populate('matchedPO', 'poNumber vendorName')
      .populate('uploadedBy', 'firstName lastName email');
  },

  /**
   * Deletes an invoice document and cleans up associated file assets
   * @param {string} id - Invoice ObjectId
   * @returns {Promise<Object|null>} Purged Invoice document
   */
  deleteInvoice: async (id) => {
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return null;
    }

    // 1. Delete associated file resource from storage (Cloudinary/Disk)
    await deleteFile(invoice.invoicePublicId);

    // 2. Remove document from MongoDB database
    await Invoice.findByIdAndDelete(id);
    return invoice;
  },

  /**
   * Triggers the asynchronous extraction pipeline by calling the Flask ML service
   * @param {string} id - Invoice database ID
   * @returns {Promise<Object>} The updated invoice showing Processing status
   */
  extractInvoice: async (id) => {
    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    if (invoice.extractionStatus === 'Processing') {
      return invoice; // Already running
    }

    // 1. Set status to Processing in DB
    invoice.extractionStatus = 'Processing';
    await invoice.save();

    // 2. Trigger Flask ML-Service in background (asynchronous from client's perspective)
    // We launch it without awaiting to return immediately to the controller
    invoiceService.runExtractionPipeline(id, invoice.invoiceFileUrl)
      .catch(err => {
        console.error(`Background extraction error for invoice ${id}:`, err);
      });

    return invoice;
  },

  /**
   * Communicates with Flask ML service and updates DB with results
   * @param {string} id - Invoice database ID
   * @param {string} fileUrl - Static upload path or Cloudinary URL
   */
  runExtractionPipeline: async (id, fileUrl) => {
    console.log(`[ML Pipeline] Triggering Flask extraction for invoice: ${id}`);
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      const response = await fetch(`${mlServiceUrl}/api/extract/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileUrl })
      });

      const data = await response.json();
      
      if (response.status !== 200) {
        throw new Error(data.message || 'Flask service extraction failed');
      }

      const { extractedData, confidenceScores, extractionStatus } = data;

      // Fetch invoice and update raw extraction fields
      const invoice = await Invoice.findById(id);
      if (!invoice) throw new Error('Invoice not found');

      invoice.extractedData = {
        ...extractedData,
        gstNumber: extractedData?.gstNumber || null
      };
      invoice.confidenceScores = {
        ...confidenceScores,
        gstNumber: confidenceScores?.gstNumber || null
      };

      // Try to find the best vendor match automatically
      const vendors = await Vendor.find();
      const inputVendorName = extractedData?.vendorName || '';
      let bestVendor = null;
      let bestSimilarity = 0;

      if (inputVendorName) {
        for (const vendor of vendors) {
          const score = getFuzzySimilarityScore(inputVendorName, vendor.vendorName);
          if (score > bestSimilarity) {
            bestSimilarity = score;
            bestVendor = vendor;
          }
        }
      }

      if (bestVendor && bestSimilarity >= 80) {
        invoice.matchedVendor = bestVendor._id;
        invoice.vendorSimilarityScore = bestSimilarity;
      } else {
        invoice.matchedVendor = null;
        invoice.vendorSimilarityScore = bestSimilarity;
      }

      invoice.matchedPO = null;
      invoice.matchingStatus = 'NotMatched';

      const candidateData = {
        invoiceNumber: extractedData?.invoiceNumber || '',
        poNumber: extractedData?.poNumber || '',
        vendorName: extractedData?.vendorName || '',
        invoiceDate: extractedData?.invoiceDate || '',
        totalAmount: extractedData?.totalAmount !== undefined && extractedData?.totalAmount !== '' ? parseFloat(extractedData.totalAmount) : null,
        taxAmount: extractedData?.taxAmount !== undefined && extractedData?.taxAmount !== '' ? parseFloat(extractedData.taxAmount) : null,
        gstNumber: extractedData?.gstNumber || ''
      };

      // Run validation engine
      const result = await runValidationEngine(invoice, candidateData, invoice.matchedVendor);

      invoice.extractionStatus = extractionStatus || 'Completed';

      // Save raw extraction changes before processing exceptions and workflow status
      await invoice.save();

      // Process exceptions (creates new ones or auto-resolves existing ones)
      await exceptionService.processValidationExceptions(invoice, result, null);

      const isCompleted = (extractionStatus || 'Completed') === 'Completed';
      if (!isCompleted) {
        await workflowService.changeInvoiceStatus(invoice._id, 'Exception', null, 'OCR text extraction pipeline failed.');
      } else {
        const targetStatus = result.isValid ? 'Extracted' : 'Exception';
        const notes = result.isValid
          ? 'OCR text extraction completed and all validation checks passed.'
          : `OCR text extraction completed with validation exceptions: ${result.missingFields?.length > 0 ? 'Missing fields. ' : ''}${!result.poMatched ? 'PO mismatch/not found. ' : ''}${!result.isVendorMatchPass ? 'Vendor mismatch. ' : ''}${!result.dateValid ? 'Invalid date. ' : ''}${result.isDuplicate ? 'Duplicate invoice. ' : ''}${!result.ocrConfidenceValid ? 'Low confidence. ' : ''}`;

        await workflowService.changeInvoiceStatus(invoice._id, targetStatus, null, notes);
      }
      console.log(`[ML Pipeline] Successful extraction update for invoice: ${id}`);
    } catch (err) {
      console.error(`[ML Pipeline] Failed for invoice ${id}:`, err.message);
      const invoice = await Invoice.findById(id);
      if (invoice) {
        invoice.extractionStatus = 'Failed';
        await invoice.save();
        await workflowService.changeInvoiceStatus(invoice._id, 'Exception', null, `OCR extraction pipeline failed: ${err.message}`);
      }
    }
  }
};

export default invoiceService;
