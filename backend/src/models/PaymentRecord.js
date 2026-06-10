import mongoose from 'mongoose';

const paymentRecordSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required'],
      unique: true
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative']
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'OnHold', 'Paid'],
      default: 'Pending',
      required: [true, 'Payment status is required']
    },
    paymentDate: {
      type: Date,
      default: null
    },
    paymentReference: {
      type: String,
      default: null
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const PaymentRecord = mongoose.model('PaymentRecord', paymentRecordSchema);
export default PaymentRecord;
