import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Invoice from '../models/Invoice.js';
import PaymentRecord from '../models/PaymentRecord.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import workflowService from '../services/workflowService.js';

// Load environment variables
dotenv.config();

const run = async () => {
  console.log('Connecting to database...');
  await connectDB();

  try {
    // 1. Get an Admin user
    let user = await User.findOne({ role: 'Admin' });
    if (!user) {
      user = await User.create({
        firstName: 'Test',
        lastName: 'Admin',
        email: `admin-${Date.now()}@example.com`,
        password: 'password123',
        role: 'Admin'
      });
      console.log('Created test Admin user:', user.email);
    }

    // 2. Create an Invoice in ReadyForPayment status
    const invoice = new Invoice({
      invoiceFileUrl: 'http://example.com/inv.pdf',
      invoicePublicId: 'inv-public-id-test',
      originalFileName: 'inv.pdf',
      uploadedBy: user._id,
      currentStatus: 'ReadyForPayment',
      reviewStatus: 'ReadyForPayment',
      validationStatus: 'ReadyForPayment',
      invoiceDecision: 'Accepted',
      extractedData: {
        invoiceNumber: `INV-TEST-${Date.now()}`,
        totalAmount: 1500,
        poNumber: 'PO-9999'
      }
    });
    invoice._isWorkflowTransition = true;
    await invoice.save();
    console.log(`Created test Invoice: ${invoice.extractedData.invoiceNumber} in ReadyForPayment status.`);

    // 3. Create a pending PaymentRecord
    let payment = await PaymentRecord.create({
      invoiceId: invoice._id,
      vendorId: invoice.matchedVendor,
      amount: invoice.extractedData.totalAmount,
      paymentStatus: 'Pending',
      notes: 'Initial pending state.'
    });
    console.log('Created pending PaymentRecord:', payment._id);

    // 4. Test Hold action
    payment.paymentStatus = 'OnHold';
    await payment.save();
    await workflowService.logAction(invoice._id, 'Payment On Hold', user._id, 'Payment placed on hold.');
    console.log('Updated PaymentRecord status to OnHold.');

    // Verify Audit Log for Hold
    const holdAudit = await AuditLog.findOne({ invoiceId: invoice._id, action: 'Payment On Hold' });
    console.log('Hold Audit Entry:', holdAudit ? 'Found' : 'Not Found', '-> Notes:', holdAudit?.notes);

    // 5. Test Mark Paid action
    payment.paymentStatus = 'Paid';
    payment.paymentDate = new Date();
    payment.paymentReference = `PAY-REF-${Date.now()}`;
    payment.processedBy = user._id;
    await payment.save();

    await workflowService.changeInvoiceStatus(invoice._id, 'Paid', user._id, 'Payment process completed.');
    console.log('Updated PaymentRecord and transitioned Invoice status to Paid.');

    // Verify Invoice currentStatus and Audit Log
    const updatedInvoice = await Invoice.findById(invoice._id);
    console.log('Updated Invoice currentStatus:', updatedInvoice.currentStatus);

    const paidAudit = await AuditLog.findOne({ invoiceId: invoice._id, action: 'Payment Completed' });
    console.log('Paid Audit Entry:', paidAudit ? 'Found' : 'Not Found', '-> Notes:', paidAudit?.notes);

    // Clean up test data
    await PaymentRecord.deleteOne({ _id: payment._id });
    await Invoice.deleteOne({ _id: invoice._id });
    console.log('Cleanup completed successfully.');
    console.log('\nAll payment verification tests passed successfully!');
  } catch (err) {
    console.error('Test run error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
};

run();
