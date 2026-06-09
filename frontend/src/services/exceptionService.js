import { apiClient } from './authService.js';

/**
 * Exceptions API calls wrapper service
 */
const exceptionService = {
  /**
   * Retrieves all exceptions with optional filters
   */
  getExceptions: async (filters = {}) => {
    try {
      const response = await apiClient.get('/exceptions', { params: filters });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching exceptions');
    }
  },

  /**
   * Retrieves a single exception by ID
   */
  getExceptionById: async (id) => {
    try {
      const response = await apiClient.get(`/exceptions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching exception details');
    }
  },

  /**
   * Assigns an exception to a user (Admin/Manager only)
   */
  assignException: async (id, userId) => {
    try {
      const response = await apiClient.patch(`/exceptions/${id}/assign`, { userId });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error assigning exception');
    }
  },

  /**
   * Marks an exception as Resolved with notes
   */
  resolveException: async (id, resolutionNotes) => {
    try {
      const response = await apiClient.patch(`/exceptions/${id}/resolve`, { resolutionNotes });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error resolving exception');
    }
  },

  /**
   * Closes an exception and triggers recovery checks
   */
  closeException: async (id, resolutionNotes) => {
    try {
      const response = await apiClient.patch(`/exceptions/${id}/close`, { resolutionNotes });
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error closing exception');
    }
  }
};

export default exceptionService;
