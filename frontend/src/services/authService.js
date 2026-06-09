import axios from 'axios';

// Load base API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create a configured Axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Configure API client request interceptors to inject authorization headers automatically.
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Auth API calls wrapper service
 */
const authService = {
  /**
   * Registers a new user
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error during registration');
    }
  },

  /**
   * Logs in a user and returns { token, user }
   */
  login: async (credentials) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Network error during login');
    }
  },

  /**
   * Retrieves the currently logged-in user profile
   */
  getCurrentUser: async () => {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve current user profile');
    }
  },

  /**
   * Retrieves all users (potential assignees)
   */
  getUsers: async () => {
    try {
      const response = await apiClient.get('/auth/users');
      return response.data;
    } catch (error) {
      throw error.response?.data || new Error('Failed to retrieve assignees');
    }
  }
};

export default authService;
export { apiClient };
