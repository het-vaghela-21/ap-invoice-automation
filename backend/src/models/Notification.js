import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['OCR', 'Validation', 'Exception', 'Payment', 'System'],
      required: [true, 'Notification type is required']
    },
    entityType: {
      type: String,
      trim: true,
      default: null
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexing for faster retrieval
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
