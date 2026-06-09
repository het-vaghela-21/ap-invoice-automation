import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: [true, 'Purchase order number is required'],
      unique: true,
      trim: true
    },
    vendorName: {
      type: String,
      required: [true, 'Vendor name is required'],
      trim: true
    },
    vendorEmail: {
      type: String,
      required: [true, 'Vendor email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address'
      ]
    },
    poDate: {
      type: Date,
      required: [true, 'Purchase order date is required'],
      default: Date.now
    },
    expectedDeliveryDate: {
      type: Date
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0.01, 'Total amount must be greater than zero']
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      default: 'USD',
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Draft', 'Open', 'Closed', 'Cancelled'],
      required: [true, 'Status is required'],
      default: 'Draft'
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator user reference is required']
    }
  },
  {
    timestamps: true
  }
);

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
