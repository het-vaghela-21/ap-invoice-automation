import { apiClient } from './authService.js';

/**
 * Payment API calls wrapper service
 */
const paymentService = {
  /**
   * Fetch all payment records with pagination, search, and status filtering.
   */
  getPayments: async (params = {}) => {
    try {
      const response = await apiClient.get('/payments', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve payment records');
    }
  },

  /**
   * Fetch specific payment details by record ID.
   */
  getPaymentById: async (id) => {
    try {
      const response = await apiClient.get(`/payments/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve payment details');
    }
  },

  /**
   * Transition invoice to Paid status and create payment logs.
   */
  markPaid: async (invoiceId, paymentData = {}) => {
    try {
      const response = await apiClient.post(`/payments/${invoiceId}/mark-paid`, paymentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to mark invoice as paid');
    }
  },

  /**
   * Toggle hold status for an invoice payment.
   */
  putOnHold: async (invoiceId, holdData = {}) => {
    try {
      const response = await apiClient.post(`/payments/${invoiceId}/hold`, holdData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to update hold status');
    }
  }
};

export default paymentService;
