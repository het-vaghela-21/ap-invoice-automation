import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';
import PaymentRecord from '../models/PaymentRecord.js';

// Load environment variables
dotenv.config();

const migrate = async () => {
  console.log('Starting payments migration...');
  await connectDB();

  try {
    // Find all invoices that are ReadyForPayment or Paid
    const invoices = await Invoice.find({
      currentStatus: { $in: ['ReadyForPayment', 'Paid'] }
    });

    console.log(`Found ${invoices.length} invoices in 'ReadyForPayment' or 'Paid' status to migrate.`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const invoice of invoices) {
      const existingPayment = await PaymentRecord.findOne({ invoiceId: invoice._id });
      
      if (!existingPayment) {
        const paymentStatus = invoice.currentStatus === 'Paid' ? 'Paid' : 'Pending';
        const paymentDate = invoice.currentStatus === 'Paid' ? (invoice.reviewedAt || new Date()) : null;
        const paymentReference = invoice.currentStatus === 'Paid' ? `MIG-PAY-${invoice.extractedData?.invoiceNumber || invoice._id}` : null;

        await PaymentRecord.create({
          invoiceId: invoice._id,
          vendorId: invoice.matchedVendor,
          amount: invoice.extractedData?.totalAmount || 0,
          paymentStatus,
          paymentDate,
          paymentReference,
          notes: `Created during database migration. Previous invoice status was ${invoice.currentStatus}.`
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`Migration complete! Created ${createdCount} new payment records, skipped ${skippedCount} existing records.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

migrate();
