import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required']
    },
    action: {
      type: String,
      required: [true, 'Action name is required']
    },
    previousState: {
      type: String,
      default: null
    },
    newState: {
      type: String,
      default: null
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null // null indicates system actions
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: [true, 'Timestamp is required']
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: false
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
