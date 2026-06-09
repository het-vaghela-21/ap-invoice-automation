import Invoice from '../models/Invoice.js';
import Vendor from '../models/Vendor.js';
import validationService from './validationService.js';
import { uploadFile, deleteFile } from '../config/cloudinary.js';

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

    const savedInvoice = await newInvoice.save();
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

      // Update Invoice record in DB (without pre-review matching or validation)
      await Invoice.findByIdAndUpdate(id, {
        extractedData: {
          ...extractedData,
          gstNumber: extractedData?.gstNumber || null
        },
        confidenceScores: {
          ...confidenceScores,
          gstNumber: confidenceScores?.gstNumber || null
        },
        matchedVendor: null,
        matchedPO: null,
        validationStatus: 'Pending',
        matchingStatus: 'NotMatched',
        extractionStatus: extractionStatus || 'Completed',
        reviewStatus: (extractionStatus || 'Completed') === 'Completed' ? 'Awaiting Review' : 'Awaiting Extraction'
      });
      console.log(`[ML Pipeline] Successful extraction update for invoice: ${id}`);
    } catch (err) {
      console.error(`[ML Pipeline] Failed for invoice ${id}:`, err.message);
      await Invoice.findByIdAndUpdate(id, {
        extractionStatus: 'Failed'
      });
    }
  }
};

export default invoiceService;
