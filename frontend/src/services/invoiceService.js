import { apiClient } from './authService';

/**
 * Invoice Upload and Storage API client helper methods.
 * Autoinjects Bearer JWT headers on operations.
 */
const invoiceService = {
  /**
   * Upload an invoice file using multipart/form-data
   * @param {File} file - Raw File object to upload
   */
  uploadInvoice: async (file) => {
    try {
      const formData = new FormData();
      formData.append('invoiceFile', file);
      
      const response = await apiClient.post('/invoices/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error uploading invoice');
    }
  },

  /**
   * Retrieves all registered invoices
   */
  getInvoices: async () => {
    try {
      const response = await apiClient.get('/invoices');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching invoices list');
    }
  },

  /**
   * Retrieves detail values of a specific invoice by ID
   */
  getInvoiceById: async (id) => {
    try {
      const response = await apiClient.get(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error fetching invoice ${id}`);
    }
  },

  /**
   * Deletes an invoice and clears stored file resources (Admin only)
   */
  deleteInvoice: async (id) => {
    try {
      const response = await apiClient.delete(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error purging invoice ${id}`);
    }
  },

  /**
   * Trigger OCR data extraction on the backend
   */
  triggerExtraction: async (id) => {
    try {
      const response = await apiClient.post(`/invoices/${id}/extract`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error triggering extraction for invoice ${id}`);
    }
  },

  /**
   * Retrieves review parameters (extracted data, confidence scores, file url, status) for human validation
   * @param {string} id - Invoice database ID
   */
  getReviewData: async (id) => {
    try {
      const response = await apiClient.get(`/review/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error fetching review data for invoice ${id}`);
    }
  },

  /**
   * Updates invoice parameters and flags reviewStatus as Reviewed
   * @param {string} id - Invoice database ID
   * @param {Object} reviewData - Key value pairs of updated fields
   */
  submitReview: async (id, reviewData) => {
    try {
      const response = await apiClient.put(`/review/${id}`, reviewData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error saving review for invoice ${id}`);
    }
  }
};

export default invoiceService;
