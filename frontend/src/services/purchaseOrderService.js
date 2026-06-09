import { apiClient } from './authService';

/**
 * Purchase Order API client helper methods.
 * Automatic authorization Bearer header injection is handled by the apiClient interceptors.
 */
const purchaseOrderService = {
  /**
   * Retrieves all purchase orders
   */
  getPOs: async () => {
    try {
      const response = await apiClient.get('/po');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching purchase orders');
    }
  },

  /**
   * Retrieves details of a specific purchase order by ID
   */
  getPOById: async (id) => {
    try {
      const response = await apiClient.get(`/po/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error fetching PO ${id}`);
    }
  },

  /**
   * Creates a new purchase order document
   */
  createPO: async (poData) => {
    try {
      const response = await apiClient.post('/po', poData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error creating purchase order');
    }
  },

  /**
   * Updates an existing purchase order document details
   */
  updatePO: async (id, poData) => {
    try {
      const response = await apiClient.put(`/po/${id}`, poData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error updating PO ${id}`);
    }
  },

  /**
   * Cancels a purchase order document (Admin privilege only)
   */
  cancelPO: async (id) => {
    try {
      const response = await apiClient.patch(`/po/${id}/cancel`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error cancelling PO ${id}`);
    }
  }
};

export default purchaseOrderService;
