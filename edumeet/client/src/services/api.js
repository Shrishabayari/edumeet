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

// Helper function to generate default availability
const generateDefaultAvailability = () => {
  return [
    { day: 'Monday', slots: ['9:00 AM', '10:00 AM', '2:00 PM', '3:00 PM'] },
    { day: 'Tuesday', slots: ['9:00 AM', '11:00 AM', '1:00 PM', '4:00 PM'] },
    { day: 'Wednesday', slots: ['10:00 AM', '2:00 PM', '3:00 PM'] },
    { day: 'Thursday', slots: ['9:00 AM', '1:00 PM', '2:00 PM', '4:00 PM'] },
    { day: 'Friday', slots: ['9:00 AM', '10:00 AM', '11:00 AM', '3:00 PM'] }
  ];
};

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
    if (!teacherId || teacherId === 'undefined') {
      console.error('Invalid teacher ID provided:', teacherId);
      throw new Error('Teacher ID is required');
    }

    try {
      const response = await api.get(`/teachers/${teacherId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching teacher:', error);
      throw error;
    }
  },

  // Updated getTeacherAvailability function with better error handling
  getTeacherAvailability: async (teacherId) => {
    // Add validation
    if (!teacherId || teacherId === 'undefined') {
      console.error('Invalid teacher ID provided:', teacherId);
      throw new Error('Teacher ID is required');
    }

    try {
      // First, try to get availability from the specific endpoint
      const response = await api.get(`/teachers/${teacherId}/availability`);
      
      // Handle different response formats
      if (response.data) {
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data.availability && Array.isArray(response.data.availability)) {
          return response.data.availability;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          return response.data.data;
        }
      }
      
      // If no valid availability found, return default
      console.warn('No valid availability data found, returning default');
      return generateDefaultAvailability();
      
    } catch (error) {
      console.warn('Availability endpoint not found, trying teacher endpoint:', error.message);
      
      // Fallback: Try to get teacher data which might include availability
      try {
        const teacherResponse = await api.get(`/teachers/${teacherId}`);
        let teacherData = teacherResponse.data;
        
        // Handle nested data structure
        if (teacherData && teacherData.data) {
          teacherData = teacherData.data;
        }
        
        // Check if we got valid teacher data
        if (!teacherData) {
          throw new Error('Teacher not found');
        }
        
        // If teacher has availability property, return it
        if (teacherData.availability && Array.isArray(teacherData.availability)) {
          return teacherData.availability;
        }
        
        // If teacher has schedule property, return it
        if (teacherData.schedule && Array.isArray(teacherData.schedule)) {
          return teacherData.schedule;
        }
        
        // Return default availability structure
        console.warn('No availability data found for teacher, returning default schedule');
        return generateDefaultAvailability();
        
      } catch (teacherError) {
        console.error('Error fetching teacher data:', teacherError);
        // Return default availability instead of throwing error
        console.warn('Falling back to default availability');
        return generateDefaultAvailability();
      }
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

  // Book new appointment - Fixed with better error handling
  bookAppointment: async (appointmentData) => {
    try {
      console.log('Booking appointment with data:', appointmentData);
      
      // Validate required fields
      if (!appointmentData.teacherId) {
        throw new Error('Teacher ID is required');
      }
      if (!appointmentData.day) {
        throw new Error('Day is required');
      }
      if (!appointmentData.time) {
        throw new Error('Time is required');
      }
      if (!appointmentData.student?.name) {
        throw new Error('Student name is required');
      }
      if (!appointmentData.student?.email) {
        throw new Error('Student email is required');
      }
      
      // Ensure the data is properly formatted
      const formattedData = {
        teacherId: appointmentData.teacherId,
        day: appointmentData.day,
        time: appointmentData.time,
        date: appointmentData.date,
        student: {
          name: appointmentData.student.name,
          email: appointmentData.student.email,
          phone: appointmentData.student.phone || '',
          subject: appointmentData.student.subject || '',
          message: appointmentData.student.message || ''
        }
      };
      
      const response = await api.post('/appointments', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error booking appointment:', error);
      
      // Re-throw with more context
      if (error.response && error.response.data) {
        throw new Error(error.response.data.message || 'Failed to book appointment');
      } else if (error.message) {
        throw error;
      } else {
        throw new Error('Network error or server unavailable');
      }
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