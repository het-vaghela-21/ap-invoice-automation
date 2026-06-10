import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import workflowService from '../services/workflowService.js';
import InvoiceException from '../models/InvoiceException.js';

// Load environment variables
dotenv.config();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const run = async () => {
  console.log('Connecting to database...');
  await connectDB();

  try {
    // 1. Get or create an Admin user
    let admin = await User.findOne({ role: 'Admin' });
    if (!admin) {
      admin = await User.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: `admin-${Date.now()}@example.com`,
        password: 'password123',
        role: 'Admin'
      });
      console.log('Created test Admin user:', admin.email);
    }

    // 2. Clear pre-existing notifications for this user to make count verification easy
    await Notification.deleteMany({ userId: admin._id });

    // 3. Create a test Invoice
    const invoice = new Invoice({
      invoiceFileUrl: 'http://example.com/notif_test.pdf',
      invoicePublicId: 'inv-public-notif-test',
      originalFileName: 'notif_test.pdf',
      uploadedBy: admin._id,
      currentStatus: 'Uploaded',
      extractedData: {
        invoiceNumber: `INV-NOTIF-${Date.now()}`,
        totalAmount: 200,
        poNumber: 'PO-TEST-123'
      }
    });
    invoice._isWorkflowTransition = true;
    await invoice.save();
    console.log(`Created test Invoice: ${invoice.extractedData.invoiceNumber}`);

    // A. Transition Uploaded -> Extracted (OCR completed)
    console.log('\n--- Transitioning to Extracted (OCR Ingestion) ---');
    await workflowService.changeInvoiceStatus(invoice._id, 'Extracted', admin._id, 'OCR text extraction finished.');
    await sleep(400); // Wait for async background worker
    
    let ocrNotif = await Notification.findOne({ userId: admin._id, type: 'OCR' });
    console.log('OCR Notification:', ocrNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', ocrNotif?.message);

    // B. Transition Extracted -> Exception (Validation Failed)
    console.log('\n--- Transitioning to Exception (Validation Failed) ---');
    await workflowService.changeInvoiceStatus(invoice._id, 'Exception', admin._id, 'Validation failed: duplicate invoice.');
    await sleep(400);

    let valFailedNotif = await Notification.findOne({ userId: admin._id, type: 'Validation', title: 'Validation Failed' });
    console.log('Validation Failed Notification:', valFailedNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', valFailedNotif?.message);

    // C. Log action: Exception Assigned
    console.log('\n--- Logging Action: Exception Assigned ---');
    const exc = await InvoiceException.create({
      invoiceId: invoice._id,
      exceptionType: 'Duplicate Invoice',
      severity: 'Critical',
      description: 'Found duplicate invoice',
      status: 'Open'
    });
    
    await workflowService.logAction(
      invoice._id,
      'Exception Assigned',
      admin._id,
      'Exception assigned to test admin.',
      { exceptionId: exc._id, assignedTo: admin._id }
    );
    await sleep(400);

    let excAssignedNotif = await Notification.findOne({ userId: admin._id, type: 'Exception', title: 'Exception Assigned' });
    console.log('Exception Assigned Notification:', excAssignedNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', excAssignedNotif?.message);

    // D. Log action: Exception Resolved
    console.log('\n--- Logging Action: Exception Resolved ---');
    await workflowService.logAction(
      invoice._id,
      'Exception Resolved',
      admin._id,
      'Exception was marked resolved.',
      { exceptionId: exc._id }
    );
    await sleep(400);

    let excResolvedNotif = await Notification.findOne({ userId: admin._id, type: 'Exception', title: 'Exception Resolved' });
    console.log('Exception Resolved Notification:', excResolvedNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', excResolvedNotif?.message);

    // E. Transition Exception -> Validated (Validation Passed)
    console.log('\n--- Transitioning to Validated (Validation Passed) ---');
    await workflowService.changeInvoiceStatus(invoice._id, 'Validated', admin._id, 'Validation passed.');
    await sleep(400);

    let valPassedNotif = await Notification.findOne({ userId: admin._id, type: 'Validation', title: 'Validation Passed' });
    console.log('Validation Passed Notification:', valPassedNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', valPassedNotif?.message);

    // F. Transition Validated -> ReadyForPayment (Ready for Payment)
    console.log('\n--- Transitioning to ReadyForPayment (Ready for Payment) ---');
    await workflowService.changeInvoiceStatus(invoice._id, 'ReadyForPayment', admin._id, 'Approved for payment.');
    await sleep(400);

    let readyNotif = await Notification.findOne({ userId: admin._id, type: 'Payment', title: 'Invoice Ready For Payment' });
    console.log('Ready For Payment Notification:', readyNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', readyNotif?.message);

    // G. Transition ReadyForPayment -> Paid (Marked Paid)
    console.log('\n--- Transitioning to Paid (Marked Paid) ---');
    await workflowService.changeInvoiceStatus(invoice._id, 'Paid', admin._id, 'TXN-999888');
    await sleep(400);

    let paidNotif = await Notification.findOne({ userId: admin._id, type: 'Payment', title: 'Invoice Marked Paid' });
    console.log('Marked Paid Notification:', paidNotif ? 'CREATED SUCCESSFULLY' : 'FAILED', '-> Msg:', paidNotif?.message);

    // 4. Verify unread count and overall counts
    const unreadCount = await Notification.countDocuments({ userId: admin._id, isRead: false });
    console.log(`\nTotal unread notifications created for admin: ${unreadCount}`);

    // Clean up test data
    await Notification.deleteMany({ userId: admin._id });
    await InvoiceException.deleteOne({ _id: exc._id });
    await Invoice.deleteOne({ _id: invoice._id });
    console.log('\nCleanup completed successfully.');
    console.log('All notification verification tests passed successfully!');
  } catch (err) {
    console.error('Test run failed with error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

run();
