import Vendor from '../models/Vendor.js';

/**
 * Reusable Service Layer for Vendor Operations.
 */
const vendorService = {
  /**
   * Create a new vendor
   * @param {Object} vendorData - Data for the Vendor
   * @returns {Promise<Object>} The created Vendor document
   */
  createVendor: async (vendorData) => {
    const newVendor = new Vendor(vendorData);
    return await newVendor.save();
  },

  /**
   * Retrieve all vendors sorted by creation date descending
   * @returns {Promise<Array>} List of vendors
   */
  getVendors: async () => {
    return await Vendor.find().sort({ createdAt: -1 });
  },

  /**
   * Find a specific vendor by ID
   * @param {string} id - Database ObjectId of the Vendor
   * @returns {Promise<Object|null>} The Vendor document
   */
  getVendorById: async (id) => {
    return await Vendor.findById(id);
  },

  /**
   * Update an existing vendor
   * @param {string} id - Vendor ObjectId
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} The updated Vendor document
   */
  updateVendor: async (id, updateData) => {
    return await Vendor.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  },

  /**
   * Deactivate a vendor
   * @param {string} id - Vendor ObjectId
   * @returns {Promise<Object|null>} The updated Vendor document
   */
  deactivateVendor: async (id) => {
    return await Vendor.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    );
  }
};

export default vendorService;
