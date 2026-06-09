import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';
import { runValidationEngine } from '../controllers/validationController.js';
import exceptionService from '../services/exceptionService.js';

// Load environment variables from .env
dotenv.config();

const backfill = async () => {
  console.log('Starting Exceptions Backfill/Migration script...');
  const conn = await connectDB();
  if (!conn) {
    console.error('Could not establish database connection. Exiting.');
    process.exit(1);
  }

  try {
    // Find all invoices with currentStatus = 'Exception'
    const invoices = await Invoice.find({ currentStatus: 'Exception' });
    console.log(`Found ${invoices.length} invoices with status 'Exception' to evaluate.`);

    for (const invoice of invoices) {
      console.log(`Evaluating invoice ID: ${invoice._id} - ${invoice.originalFileName || 'N/A'}`);

      const candidateData = {
        invoiceNumber: invoice.extractedData?.invoiceNumber || '',
        poNumber: invoice.extractedData?.poNumber || '',
        vendorName: invoice.extractedData?.vendorName || '',
        invoiceDate: invoice.extractedData?.invoiceDate || '',
        totalAmount: invoice.extractedData?.totalAmount !== undefined && invoice.extractedData?.totalAmount !== '' ? parseFloat(invoice.extractedData.totalAmount) : null,
        taxAmount: invoice.extractedData?.taxAmount !== undefined && invoice.extractedData?.taxAmount !== '' ? parseFloat(invoice.extractedData.taxAmount) : null,
        gstNumber: invoice.extractedData?.gstNumber || ''
      };

      // Run validation engine
      const result = await runValidationEngine(invoice, candidateData, invoice.matchedVendor);

      // Save any updated validation/matching scores
      await invoice.save();

      // Seed exceptions in the database
      await exceptionService.processValidationExceptions(invoice, result, null);

      console.log(`Successfully backfilled exceptions for Invoice ${invoice._id}`);
    }

    console.log('Migration backfill process completed successfully.');
  } catch (error) {
    console.error('Error occurred during exceptions backfill:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

backfill();
