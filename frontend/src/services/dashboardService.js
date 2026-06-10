import { apiClient } from './authService.js';

/**
 * Dashboard API calls wrapper service
 */
const dashboardService = {
  /**
   * Fetch KPI card summary data
   */
  getSummary: async () => {
    try {
      const response = await apiClient.get('/dashboard/summary');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve dashboard summary');
    }
  },

  /**
   * Fetch invoice counts grouped by status
   */
  getInvoiceStatus: async () => {
    try {
      const response = await apiClient.get('/dashboard/invoice-status');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve invoice status analytics');
    }
  },

  /**
   * Fetch top vendors by invoice counts
   */
  getVendors: async () => {
    try {
      const response = await apiClient.get('/dashboard/vendors');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve vendor analytics');
    }
  },

  /**
   * Fetch exceptions counts grouped by type
   */
  getExceptions: async () => {
    try {
      const response = await apiClient.get('/dashboard/exceptions');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve exception analytics');
    }
  },

  /**
   * Fetch purchase orders status counts
   */
  getPurchaseOrders: async () => {
    try {
      const response = await apiClient.get('/dashboard/purchase-orders');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve purchase order analytics');
    }
  },

  /**
   * Fetch recent activity (audit events)
   */
  getRecentActivity: async () => {
    try {
      const response = await apiClient.get('/dashboard/recent-activity');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve recent activity logs');
    }
  },

  /**
   * Fetch invoices ready for payment
   */
  getReadyForPayment: async () => {
    try {
      const response = await apiClient.get('/dashboard/ready-for-payment');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve ready for payment invoices');
    }
  }
};

export default dashboardService;
