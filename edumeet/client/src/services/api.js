import axios from 'axios';

// API URL configuration
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://edumeet.onrender.com/api'  // Your backend URL
  : 'http://localhost:5000/api';

console.log('API_URL:', API_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

// In-memory token storage (alternative to localStorage)
let authToken = null;

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
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
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
          console.warn('Authentication failed - clearing token');
          authToken = null;
          
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
      return Promise.reject(new Error(data?.message || `Request failed with status ${status}`));
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received:', error.request);
      return Promise.reject(new Error('Network error. Please check your connection and server status.'));
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
      return Promise.reject(new Error(`Request failed to send: ${error.message}`));
    }
  }
);

// Teacher API endpoints
export const teacherAPI = {
  // Get all teachers
  getTeachers: async () => {
    try {
      const response = await api.get('/teachers');
      return response.data;
    } catch (error) {
      console.error('Error fetching teachers:', error);
      throw error;
    }
  },

  // Get specific teacher
  getTeacher: async (teacherId) => {
    try {
      const response = await api.get(`/teachers/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher:', error);
      throw error;
    }
  },

  // Get teacher availability
  getTeacherAvailability: async (teacherId) => {
    try {
      const response = await api.get(`/teachers/${teacherId}/availability`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher availability:', error);
      throw error;
    }
  },

  // Update teacher availability
  updateTeacherAvailability: async (teacherId, availability) => {
    try {
      const response = await api.put(`/teachers/${teacherId}/availability`, { availability });
      return response.data;
    } catch (error) {
      console.error('Error updating teacher availability:', error);
      throw error;
    }
  },

  // Teacher login
  login: async (credentials) => {
    try {
      const response = await api.post('/teachers/login', credentials);
      
      if (response.data.token) {
        authToken = response.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error during teacher login:', error);
      throw error;
    }
  },

  // Teacher register
  register: async (teacherData) => {
    try {
      const response = await api.post('/teachers/register', teacherData);
      return response.data;
    } catch (error) {
      console.error('Error during teacher registration:', error);
      throw error;
    }
  },

  // Get teacher profile
  getProfile: async () => {
    try {
      const response = await api.get('/teachers/profile');
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      throw error;
    }
  },

  // Update teacher profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/teachers/profile', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating teacher profile:', error);
      throw error;
    }
  }
};

// Appointment API endpoints
export const appointmentAPI = {
  // Get all appointments (for students)
  getAppointments: async () => {
    try {
      const response = await api.get('/appointments');
      return response.data;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  },

  // Get appointments for a specific teacher
  getTeacherAppointments: async (teacherId) => {
    try {
      const response = await api.get(`/appointments/teacher/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher appointments:', error);
      throw error;
    }
  },

  // Get specific appointment
  getAppointment: async (appointmentId) => {
    try {
      const response = await api.get(`/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointment:', error);
      throw error;
    }
  },

  // Book new appointment
  bookAppointment: async (appointmentData) => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    } catch (error) {
      console.error('Error booking appointment:', error);
      throw error;
    }
  },

  // Update appointment
  updateAppointment: async (appointmentId, appointmentData) => {
    try {
      const response = await api.put(`/appointments/${appointmentId}`, appointmentData);
      return response.data;
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId) => {
    try {
      const response = await api.delete(`/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error canceling appointment:', error);
      throw error;
    }
  },

  // Confirm appointment (for teachers)
  confirmAppointment: async (appointmentId) => {
    try {
      const response = await api.patch(`/appointments/${appointmentId}/confirm`);
      return response.data;
    } catch (error) {
      console.error('Error confirming appointment:', error);
      throw error;
    }
  },

  // Reject appointment (for teachers)
  rejectAppointment: async (appointmentId, reason) => {
    try {
      const response = await api.patch(`/appointments/${appointmentId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      throw error;
    }
  }
};

// Student API endpoints
export const studentAPI = {
  // Get student profile
  getProfile: async (email) => {
    try {
      const response = await api.get(`/students/profile?email=${email}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student profile:', error);
      throw error;
    }
  },

  // Create or update student profile
  updateProfile: async (studentData) => {
    try {
      const response = await api.post('/students/profile', studentData);
      return response.data;
    } catch (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }
  }
};

// General API helpers
export const apiHelpers = {
  // Set auth token manually
  setAuthToken: (token) => {
    if (token) {
      authToken = token;
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      authToken = null;
      delete api.defaults.headers.common['Authorization'];
    }
  },
  
  // Clear auth token
  clearAuthToken: () => {
    authToken = null;
    delete api.defaults.headers.common['Authorization'];
  },
  
  // Get current token
  getToken: () => {
    return authToken;
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    return !!authToken;
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
  },
  
  // Logout function
  logout: () => {
    authToken = null;
    delete api.defaults.headers.common['Authorization'];
  }
};

// Default export for backward compatibility
export default {
  teacherAPI,
  appointmentAPI,
  studentAPI,
  apiHelpers,
  api
};