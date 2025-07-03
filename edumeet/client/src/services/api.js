// services/api.js - Updated configuration
import axios from 'axios';

// API URL configuration
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://edumeet.onrender.com/api'  // Your backend URL
  : 'http://localhost:5000/api';

console.log('API_URL:', API_URL); // Debug log

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Increased timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CORS with credentials
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
    // Return response data directly
    return response;
  },
  (error) => {
    console.error('API Error:', error);

    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token expired or invalid
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
        message: data?.message || 'An error occurred',
        data: data
      });
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received');
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your connection.',
        data: null
      });
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: -1,
        message: 'Request failed to send',
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
  }
};

// Export the configured axios instance
export default api;