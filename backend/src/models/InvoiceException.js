import mongoose from 'mongoose';

const invoiceExceptionSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required']
    },
    exceptionType: {
      type: String,
      enum: [
        'Vendor NotFound',
        'PO NotFound',
        'PO Amount Mismatch',
        'Missing Mandatory Fields',
        'Low OCR Confidence',
        'Invalid Invoice Date',
        'Duplicate Invoice',
        'Validation Failure'
      ],
      required: [true, 'Exception type is required']
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      required: [true, 'Severity is required']
    },
    description: {
      type: String,
      required: [true, 'Description is required']
    },
    status: {
      type: String,
      enum: ['Open', 'InProgress', 'Resolved', 'Closed'],
      default: 'Open',
      required: [true, 'Exception status is required']
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    resolutionNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

const InvoiceException = mongoose.model('InvoiceException', invoiceExceptionSchema);
export default InvoiceException;
