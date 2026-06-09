import { apiClient } from './authService';

/**
 * Vendor API client helper methods.
 * Autoinjects JWT Bearer token headers via apiClient interceptors.
 */
const vendorService = {
  /**
   * Retrieves all vendors
   */
  getVendors: async () => {
    try {
      const response = await apiClient.get('/vendors');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching vendors');
    }
  },

  /**
   * Retrieves a single vendor by ID
   */
  getVendorById: async (id) => {
    try {
      const response = await apiClient.get(`/vendors/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error fetching vendor details for ${id}`);
    }
  },

  /**
   * Creates a new vendor
   */
  createVendor: async (vendorData) => {
    try {
      const response = await apiClient.post('/vendors', vendorData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error creating vendor record');
    }
  },

  /**
   * Updates an existing vendor
   */
  updateVendor: async (id, vendorData) => {
    try {
      const response = await apiClient.put(`/vendors/${id}`, vendorData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error updating vendor ${id}`);
    }
  },

  /**
   * Deactivates a vendor (Admin privilege only)
   */
  deactivateVendor: async (id) => {
    try {
      const response = await apiClient.patch(`/vendors/${id}/deactivate`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error deactivating vendor ${id}`);
    }
  }
};

export default vendorService;
