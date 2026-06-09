import dotenv from 'dotenv';
import path from 'path';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

// Resolve environment variables relative to package root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const runMigration = async () => {
  try {
    console.log('Starting AP Invoice System Migration...');
    const conn = await connectDB();
    if (!conn) {
      console.error('Failed to connect to database. Migration aborted.');
      process.exit(1);
    }

    // Update existing Invoices: matchedVendor = null, matchedPO = null, validationStatus = Pending
    const invoiceResult = await Invoice.updateMany(
      {},
      {
        $set: {
          matchedVendor: null,
          matchedPO: null,
          validationStatus: 'Pending'
        }
      }
    );
    console.log(`Updated ${invoiceResult.modifiedCount || 0} invoices successfully.`);

    // Update existing Purchase Orders: vendorId = null
    const poResult = await PurchaseOrder.updateMany(
      {},
      {
        $set: {
          vendorId: null
        }
      }
    );
    console.log(`Updated ${poResult.modifiedCount || 0} purchase orders successfully.`);

    console.log('Migration completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

// Import mongoose directly for disconnection
import mongoose from 'mongoose';
runMigration();
