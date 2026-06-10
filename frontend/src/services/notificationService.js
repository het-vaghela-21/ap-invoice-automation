import { apiClient } from './authService';

const notificationService = {
  /**
   * Fetch paginated notifications for current user with optional search query
   */
  getNotifications: async (page = 1, limit = 10, search = '') => {
    try {
      const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}&q=${encodeURIComponent(search)}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching notifications list');
    }
  },

  /**
   * Fetch all unread notifications for current user
   */
  getUnreadNotifications: async () => {
    try {
      const response = await apiClient.get('/notifications/unread');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error fetching unread notifications');
    }
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id) => {
    try {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error(`Network error marking notification ${id} as read`);
    }
  },

  /**
   * Mark all unread notifications as read
   */
  markAllAsRead: async () => {
    try {
      const response = await apiClient.patch('/notifications/read-all');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error marking all notifications as read');
    }
  }
};

export default notificationService;
