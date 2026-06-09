import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';
import AuditLog from '../models/AuditLog.js';

// Resolve environment variables relative to package root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const runWorkflowMigration = async () => {
  try {
    console.log('Starting AP Invoice System Workflow & Audit Trail Migration...');
    const conn = await connectDB();
    if (!conn) {
      console.error('Failed to connect to database. Migration aborted.');
      process.exit(1);
    }

    // Clear existing audit logs if any (fresh start)
    const logsDeleted = await AuditLog.deleteMany({});
    console.log(`Cleared ${logsDeleted.deletedCount} existing audit logs for fresh initialization.`);

    // Fetch all invoices
    const invoices = await Invoice.find({});
    console.log(`Found ${invoices.length} invoices to migrate.`);

    const counts = {
      Uploaded: 0,
      Extracted: 0,
      UnderReview: 0,
      Validated: 0,
      ReadyForPayment: 0,
      Exception: 0
    };

    for (const invoice of invoices) {
      let nextStatus = 'Uploaded';

      // Mapping Logic
      if (invoice.reviewStatus === 'ReadyForPayment') {
        nextStatus = 'ReadyForPayment';
      } else if (invoice.invoiceDecision === 'Rejected' || invoice.validationStatus === 'Rejected') {
        nextStatus = 'Exception';
        invoice.invoiceDecision = 'Rejected';
      } else if (invoice.reviewStatus === 'Awaiting Extraction' || (invoice.reviewStatus === 'PendingReview' && invoice.extractionStatus === 'Pending')) {
        nextStatus = 'Uploaded';
      } else if (invoice.reviewStatus === 'Awaiting Review' || invoice.reviewStatus === 'Reviewed') {
        if (invoice.validationStatus === 'POMatched' && invoice.vendorSimilarityScore >= 80) {
          nextStatus = 'Validated';
        } else if (invoice.validationStatus === 'MissingRequiredFields' || invoice.validationStatus === 'ReadyForReview') {
          nextStatus = 'UnderReview';
        } else {
          nextStatus = invoice.extractionStatus === 'Completed' ? 'Extracted' : 'Uploaded';
        }
      } else {
        nextStatus = invoice.extractionStatus === 'Completed' ? 'Extracted' : 'Uploaded';
      }

      // Populate new schema fields
      invoice.currentStatus = nextStatus;
      invoice.statusHistory = [{
        status: nextStatus,
        changedBy: invoice.reviewedBy || invoice.uploadedBy || null,
        changedAt: invoice.updatedAt || new Date(),
        notes: `Status initialized and migrated to "${nextStatus}" during system upgrade.`
      }];
      invoice.lastUpdatedAt = invoice.updatedAt || new Date();
      invoice._isWorkflowTransition = true; // bypass schema pre-save validator

      await invoice.save();
      counts[nextStatus]++;

      // Create initial Migration Audit Log entry
      const auditLog = new AuditLog({
        invoiceId: invoice._id,
        action: 'Status Changed',
        previousState: null,
        newState: nextStatus,
        performedBy: invoice.reviewedBy || invoice.uploadedBy || null,
        timestamp: invoice.updatedAt || new Date(),
        notes: `Status initialized and migrated to "${nextStatus}" during system upgrade.`,
        metadata: {}
      });
      await auditLog.save();

      // Create historical logs for the invoice path if relevant
      if (nextStatus !== 'Uploaded') {
        // Log the initial upload action
        await new AuditLog({
          invoiceId: invoice._id,
          action: 'Invoice Uploaded',
          previousState: null,
          newState: 'Uploaded',
          performedBy: invoice.uploadedBy || null,
          timestamp: invoice.createdAt || new Date(),
          notes: 'Invoice uploaded during initial ingestion.',
          metadata: {}
        }).save();

        // Log extraction
        if (invoice.extractionStatus === 'Completed') {
          await new AuditLog({
            invoiceId: invoice._id,
            action: 'OCR Extraction Completed',
            previousState: 'Uploaded',
            newState: 'Extracted',
            performedBy: null,
            timestamp: invoice.createdAt || new Date(),
            notes: 'OCR document data extracted.',
            metadata: {}
          }).save();
        }
      }
    }

    console.log('Migration results:');
    Object.entries(counts).forEach(([status, count]) => {
      console.log(`- Status "${status}": ${count}`);
    });
    console.log('Migration and initial audit logs creation completed successfully.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

runWorkflowMigration();
