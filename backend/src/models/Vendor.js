import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    vendorCode: {
      type: String,
      required: [true, 'Vendor code is required'],
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
    vendorGST: {
      type: String,
      required: [true, 'Vendor GST number is required'],
      trim: true
    },
    vendorPhone: {
      type: String,
      trim: true
    },
    vendorAddress: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    mandatoryFields: {
      type: [String],
      default: ['invoiceNumber', 'poNumber', 'invoiceDate', 'totalAmount', 'gstNumber'],
      validate: {
        validator: function(v) {
          const validFields = ['invoiceNumber', 'poNumber', 'invoiceDate', 'totalAmount', 'gstNumber'];
          return v.every(field => validFields.includes(field));
        },
        message: props => `${props.value} contains invalid mandatory field name(s).`
      }
    }
  },
  {
    timestamps: true
  }
);

const Vendor = mongoose.model('Vendor', vendorSchema);

export default Vendor;
