import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import * as analyticsService from '../services/analyticsService.js';

// Load environment variables
dotenv.config();

const run = async () => {
  console.log('Connecting to database...');
  await connectDB();
  
  try {
    console.log('\n--- 1. Summary Data ---');
    const summary = await analyticsService.getSummaryData();
    console.log(JSON.stringify(summary, null, 2));

    console.log('\n--- 2. Invoice Status Data ---');
    const status = await analyticsService.getInvoiceStatusData();
    console.log(JSON.stringify(status, null, 2));

    console.log('\n--- 3. Top Vendor Data ---');
    const vendors = await analyticsService.getVendorAnalyticsData();
    console.log(JSON.stringify(vendors, null, 2));

    console.log('\n--- 4. Exception Analytics Data ---');
    const exceptions = await analyticsService.getExceptionAnalyticsData();
    console.log(JSON.stringify(exceptions, null, 2));

    console.log('\n--- 5. PO Analytics Data ---');
    const pos = await analyticsService.getPOAnalyticsData();
    console.log(JSON.stringify(pos, null, 2));

    console.log('\n--- 6. Recent Activity Data ---');
    const activity = await analyticsService.getRecentActivityData();
    console.log(JSON.stringify(activity, null, 2));

    console.log('\n--- 7. Ready For Payment Data ---');
    const ready = await analyticsService.getReadyForPaymentData();
    console.log(JSON.stringify(ready, null, 2));

    console.log('\nAll queries executed successfully!');
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

run();
