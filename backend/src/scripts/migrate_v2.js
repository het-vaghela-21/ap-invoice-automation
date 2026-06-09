import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';

// Resolve environment variables relative to package root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const runMigration = async () => {
  try {
    console.log('Starting AP Invoice System Workflow Migration (v2)...');
    const conn = await connectDB();
    if (!conn) {
      console.error('Failed to connect to database. Migration aborted.');
      process.exit(1);
    }

    // 1. Fetch all invoices with the old 'PendingReview' status
    const pendingInvoices = await Invoice.find({ reviewStatus: 'PendingReview' });
    console.log(`Found ${pendingInvoices.length} invoices with status 'PendingReview'.`);

    let awaitingReviewCount = 0;
    let awaitingExtractionCount = 0;

    for (const invoice of pendingInvoices) {
      if (invoice.extractionStatus === 'Completed') {
        invoice.reviewStatus = 'Awaiting Review';
        // Reset pre-human matching and validation to match new workflow
        invoice.matchedVendor = null;
        invoice.matchedPO = null;
        invoice.validationStatus = 'Pending';
        invoice.matchingStatus = 'NotMatched';
        await invoice.save();
        awaitingReviewCount++;
      } else {
        invoice.reviewStatus = 'Awaiting Extraction';
        invoice.matchedVendor = null;
        invoice.matchedPO = null;
        invoice.validationStatus = 'Pending';
        invoice.matchingStatus = 'NotMatched';
        await invoice.save();
        awaitingExtractionCount++;
      }
    }

    console.log(`Migration results:`);
    console.log(`- Invoices moved to 'Awaiting Review': ${awaitingReviewCount}`);
    console.log(`- Invoices moved to 'Awaiting Extraction': ${awaitingExtractionCount}`);
    console.log('Migration completed successfully.');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runMigration();
