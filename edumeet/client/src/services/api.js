import axios from 'axios';

// API URL configuration
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://edumeet.onrender.com/api'  // Your backend URL
  : 'http://localhost:5000/api';

console.log('API_URL:', API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Changed from true to false for simpler CORS
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('API Request:', {
      method: config.method,
      url: config.url,
      fullURL: config.baseURL + config.url,
      data: config.data
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error Details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      request: error.request,
      config: error.config
    });

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      console.error(`API Error ${status}:`, data);
      
      switch (status) {
        case 401:
          console.warn('Authentication failed - removing token');
          localStorage.removeItem('token');
          
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/admin/login';
          }
          break;
          
        case 403:
          console.warn('Access forbidden');
          break;
          
        case 404:
          console.warn('Resource not found');
          break;
          
        case 500:
          console.error('Server error');
          break;
          
        default:
          console.error(`API Error ${status}:`, data?.message || 'Unknown error');
      }
      
      // Return structured error
      return Promise.reject({
        status,
        message: data?.message || `Request failed with status ${status}`,
        data: data,
        response: error.response
      });
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received:', error.request);
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection and server status.',
        data: null,
        request: error.request
      });
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: -1,
        message: `Request failed to send: ${error.message}`,
        data: null
      });
    }
  }
);

// Helper functions for common API operations
export const apiHelpers = {
  // Set auth token manually
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
    }
  },
  
  // Clear auth token
  clearAuthToken: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },
  
  // Get current token
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  
  // Test API connection
  testConnection: async () => {
    try {
      const response = await api.get('/health');
      console.log('API Connection Test:', response.data);
      return true;
    } catch (error) {
      console.error('API Connection Test Failed:', error);
      return false;
    }
  }
};

// Export the configured axios instance
export default api;