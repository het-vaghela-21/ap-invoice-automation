import PurchaseOrder from '../models/PurchaseOrder.js';

/**
 * Reusable Service Layer for Purchase Order Operations.
 */
const purchaseOrderService = {
  /**
   * Create a new purchase order
   * @param {Object} poData - Data for the PO
   * @param {string} userId - ID of the creating user
   * @returns {Promise<Object>} The created PurchaseOrder document
   */
  createPO: async (poData, userId) => {
    // Inject the creator's ID
    const newPO = new PurchaseOrder({
      ...poData,
      createdBy: userId
    });
    return await newPO.save();
  },

  /**
   * Retrieve all purchase orders sorted by creation date descending
   * @returns {Promise<Array>} List of purchase orders
   */
  getPOs: async () => {
    return await PurchaseOrder.find()
      .populate('vendorId')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
  },

  /**
   * Find a specific purchase order by ID
   * @param {string} id - Database ObjectId of the PO
   * @returns {Promise<Object|null>} The PurchaseOrder document
   */
  getPOById: async (id) => {
    return await PurchaseOrder.findById(id)
      .populate('vendorId')
      .populate('createdBy', 'firstName lastName email');
  },

  /**
   * Update an existing purchase order
   * @param {string} id - PO ObjectId
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object|null>} The updated PurchaseOrder document
   */
  updatePO: async (id, updateData) => {
    // Run validators on updates to ensure schema invariants hold
    return await PurchaseOrder.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('vendorId').populate('createdBy', 'firstName lastName email');
  },

  /**
   * Set a purchase order status to Cancelled
   * @param {string} id - PO ObjectId
   * @returns {Promise<Object|null>} The updated PurchaseOrder document
   */
  cancelPO: async (id) => {
    return await PurchaseOrder.findByIdAndUpdate(
      id,
      { $set: { status: 'Cancelled' } },
      { new: true }
    ).populate('vendorId').populate('createdBy', 'firstName lastName email');
  }
};

export default purchaseOrderService;
