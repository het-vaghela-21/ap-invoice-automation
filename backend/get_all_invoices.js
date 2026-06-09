import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
    const invoices = await Invoice.find({}).sort({ createdAt: -1 });
    
    invoices.forEach(inv => {
      console.log(`ID: ${inv._id} | File: ${inv.originalFileName} | Status: ${inv.extractionStatus} | Date: ${inv.createdAt}`);
    });

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
