import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected');

    // Define schema inline to avoid imports
    const Invoice = mongoose.model('Invoice', new mongoose.Schema({}, { strict: false }));
    
    const invoice = await Invoice.findOne({ _id: '6a216010bc50e989d41512ac' });
    console.log('Invoice Details:', JSON.stringify(invoice, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
