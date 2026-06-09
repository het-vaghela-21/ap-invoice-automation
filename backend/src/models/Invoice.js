import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceFileUrl: {
      type: String,
      required: [true, 'Invoice file URL is required']
    },
    invoicePublicId: {
      type: String,
      required: [true, 'Invoice file storage public ID is required']
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true
    },
    extractionStatus: {
      type: String,
      enum: ['Pending', 'Processing', 'Completed', 'Failed'],
      required: [true, 'Extraction status is required'],
      default: 'Pending'
    },
    matchingStatus: {
      type: String,
      enum: ['NotMatched', 'Matched', 'Mismatch'],
      required: [true, 'Matching status is required'],
      default: 'NotMatched'
    },
    extractedData: {
      invoiceNumber: {
        type: String,
        default: null
      },
      poNumber: {
        type: String,
        default: null
      },
      vendorName: {
        type: String,
        default: null
      },
      invoiceDate: {
        type: String,
        default: null
      },
      totalAmount: {
        type: Number,
        default: null
      },
      taxAmount: {
        type: Number,
        default: null
      },
      gstNumber: {
        type: String,
        default: null
      }
    },
    confidenceScores: {
      invoiceNumber: {
        type: Number,
        default: null
      },
      poNumber: {
        type: Number,
        default: null
      },
      vendorName: {
        type: Number,
        default: null
      },
      invoiceDate: {
        type: Number,
        default: null
      },
      totalAmount: {
        type: Number,
        default: null
      },
      taxAmount: {
        type: Number,
        default: null
      },
      gstNumber: {
        type: Number,
        default: null
      }
    },
    matchedVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vendor',
      default: null
    },
    matchedPO: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      default: null
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user reference is required']
    },
    reviewStatus: {
      type: String,
      enum: ['PendingReview', 'Awaiting Extraction', 'Awaiting Review', 'Reviewed', 'ReadyForPayment'],
      required: [true, 'Review status is required'],
      default: 'Awaiting Extraction'
    },
    validationStatus: {
      type: String,
      enum: ['Pending', 'MissingRequiredFields', 'ReadyForReview', 'Reviewed', 'POMatched', 'ReadyForPayment', 'Rejected'],
      required: [true, 'Validation status is required'],
      default: 'Pending'
    },
    invoiceDecision: {
      type: String,
      enum: ['Pending', 'Accepted', 'Rejected'],
      default: 'Pending',
      required: [true, 'Invoice decision is required']
    },
    vendorSimilarityScore: {
      type: Number,
      default: 0
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    currentStatus: {
      type: String,
      enum: ['Uploaded', 'Extracted', 'UnderReview', 'Validated', 'ReadyForPayment', 'Exception'],
      required: [true, 'Current status is required'],
      default: 'Uploaded'
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true
        },
        updatedAt: {
          type: Date,
          default: Date.now,
          required: true
        }
      }
    ],
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save middleware to enforce that currentStatus can only be modified through WorkflowService
invoiceSchema.pre('save', function (next) {
  if (this.isNew) {
    if (!this.currentStatus) {
      this.currentStatus = 'Uploaded';
    }
    if (!this.statusHistory || this.statusHistory.length === 0) {
      this.statusHistory = [{
        status: this.currentStatus,
        updatedAt: new Date()
      }];
    }
    this.lastUpdatedAt = new Date();
  } else if (this.isModified('currentStatus')) {
    if (!this._isWorkflowTransition) {
      return next(new Error('Direct status updates are not allowed. Please use WorkflowService.'));
    }
    this.statusHistory.push({
      status: this.currentStatus,
      updatedAt: new Date()
    });
    this.lastUpdatedAt = new Date();
  }
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
