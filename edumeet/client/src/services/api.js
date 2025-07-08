// client/src/api.js (EduMeet - Fixed endpoints to match backend)
import axios from 'axios';

// API URL configuration with fallbacks
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://edumeet.onrender.com/api' 
    : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for Render cold starts
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL
    if (config.url.startsWith('/admin')) {
      token = localStorage.getItem('adminToken'); // Use 'adminToken' for admin routes
    } else if (config.url.startsWith('/teachers')) {
      token = localStorage.getItem('teacherToken'); // Use 'teacherToken' for teacher routes
    } else {
      token = localStorage.getItem('studentToken'); // Use 'studentToken' for student routes
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests only in development environment
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      if (token) {
        console.log(`   Token Used: ${token.substring(0, 20)}...`);
      } else {
        console.log('   No token sent for this request.');
      }
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle responses and errors globally
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      console.log('Response data:', response.data);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error);

    if (error.response) {
      const { status, data, config } = error.response;
      console.error(`HTTP Error ${status}:`, data);

      // Log available routes if provided by backend
      if (data?.availableRoutes) {
        console.log('Available routes:', data.availableRoutes);
      }

      switch (status) {
        case 401: // Unauthorized
          console.warn('Unauthorized: Token expired or invalid. Attempting redirection.');
          if (config.url.startsWith('/admin')) {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminData');
            window.location.href = '/admin/login';
          } else if (config.url.startsWith('/teachers')) {
            localStorage.removeItem('teacherToken');
            localStorage.removeItem('teacherData');
            window.location.href = '/teacher/login';
          } else {
            localStorage.removeItem('studentToken');
            localStorage.removeItem('studentData');
            window.location.href = '/student/login';
          }
          break;
        case 403: // Forbidden
          console.error('Access forbidden: You do not have permission to perform this action.');
          break;
        case 404: // Not Found
          console.error('API endpoint not found:', error.config.url);
          break;
        case 500: // Internal Server Error
          console.error('Internal server error. Please try again later.');
          break;
        default:
          console.error('Unexpected error status:', status);
      }

      const errorMessage = data?.message || data?.error || `HTTP Error ${status}. Please try again.`;
      return Promise.reject(new Error(errorMessage));

    } else if (error.request) {
      console.error('No response received from server:', error.request);
      return Promise.reject(new Error('Cannot connect to server. Please check your internet connection or try again later.'));
    } else {
      console.error('Request setup error:', error.message);
      return Promise.reject(new Error(`Request configuration error: ${error.message}`));
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

// API endpoints object for better organization
export const endpoints = {
  // Teacher endpoints (general access)
  teachers: {
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    getAvailability: (id) => `/teachers/${id}/availability`,
    updateAvailability: (id) => `/teachers/${id}/availability`,
    login: '/teachers/login',
    register: '/teachers/register',
    profile: '/teachers/profile',
  },

  // Student endpoints
  students: {
    profile: '/students/profile',
    updateProfile: '/students/profile',
  },

  // Appointment endpoints
  appointments: {
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    getByTeacher: (teacherId) => `/appointments/teacher/${teacherId}`,
    create: '/appointments',
    update: (id) => `/appointments/${id}`,
    cancel: (id) => `/appointments/${id}`,
    confirm: (id) => `/appointments/${id}/confirm`,
    reject: (id) => `/appointments/${id}/reject`,
  },

  // Admin specific endpoints - FIXED to match backend
  admin: {
    // Admin Auth
    login: '/admin/login',
    register: '/admin/register',
    // Changed from '/admin/profile' to what your backend actually supports
    // You'll need to check your backend routes - this might be '/admin/me' or similar
    profile: '/admin/me', // or '/admin/profile' if that's what your backend supports
    
    // Dashboard & Analytics - FIXED
    dashboardStats: '/admin/dashboard-stats', // Changed from '/admin/dashboard/stats'
    
    // User Management
    users: '/admin/users',
    deleteUser: (id) => `/admin/users/${id}`,
    
    // Teacher Management
    teachers: '/admin/teachers',
    updateTeacherStatus: (id) => `/admin/teachers/${id}/status`,
    
    // Appointment Management
    appointments: '/admin/appointments',
  },

  // Health check
  health: '/health',
};

// Convenience methods for common API operations
export const apiMethods = {
  // Teacher Operations
  getAllTeachers: () => api.get(endpoints.teachers.getAll),
  getTeacherById: (id) => {
    if (!id || id === 'undefined') {
      throw new Error('Teacher ID is required');
    }
    return api.get(endpoints.teachers.getById(id));
  },
  
  getTeacherAvailability: async (teacherId) => {
    if (!teacherId || teacherId === 'undefined') {
      throw new Error('Teacher ID is required');
    }

    try {
      // First, try to get availability from the specific endpoint
      const response = await api.get(endpoints.teachers.getAvailability(teacherId));
      
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
        const teacherResponse = await api.get(endpoints.teachers.getById(teacherId));
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

  updateTeacherAvailability: (teacherId, availability) => 
    api.put(endpoints.teachers.updateAvailability(teacherId), { availability }),

  // Teacher Auth Operations
  teacherLogin: (credentials) => api.post(endpoints.teachers.login, credentials),
  teacherRegister: (data) => api.post(endpoints.teachers.register, data),
  teacherGetProfile: () => api.get(endpoints.teachers.profile),
  teacherUpdateProfile: (data) => api.put(endpoints.teachers.profile, data),

  // Student Operations
  studentGetProfile: (email) => api.get(endpoints.students.profile, { params: { email } }),
  studentUpdateProfile: (data) => api.post(endpoints.students.updateProfile, data),

  // Appointment Operations
  getAllAppointments: () => api.get(endpoints.appointments.getAll),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  getTeacherAppointments: (teacherId) => api.get(endpoints.appointments.getByTeacher(teacherId)),
  
  createAppointment: (appointmentData) => {
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
    
    return api.post(endpoints.appointments.create, formattedData);
  },
  
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  cancelAppointment: (id) => api.delete(endpoints.appointments.cancel(id)),
  confirmAppointment: (id) => api.patch(endpoints.appointments.confirm(id)),
  rejectAppointment: (id, reason) => api.patch(endpoints.appointments.reject(id), { reason }),

  // Admin Operations - FIXED
  adminLogin: (credentials) => api.post(endpoints.admin.login, credentials),
  adminRegister: (data) => api.post(endpoints.admin.register, data),
  adminGetProfile: () => api.get(endpoints.admin.profile),
  adminUpdateProfile: (data) => api.put(endpoints.admin.profile, data),
  adminGetDashboardStats: () => api.get(endpoints.admin.dashboardStats), // Now uses correct endpoint
  adminGetUsers: () => api.get(endpoints.admin.users),
  adminDeleteUser: (userId, userType) => api.delete(endpoints.admin.deleteUser(userId), { params: { type: userType } }),
  adminUpdateTeacherStatus: (teacherId, status) => api.patch(endpoints.admin.updateTeacherStatus(teacherId), { status }),
  adminGetAllAppointments: () => api.get(endpoints.admin.appointments),

  // Health check
  testConnection: () => api.get(endpoints.health),
};

// Token management utilities
export const tokenManager = {
  // Set token for specific user type
  setToken: (token, userType = 'student') => {
    const tokenKey = `${userType}Token`;
    if (token) {
      localStorage.setItem(tokenKey, token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },

  // Get token for specific user type
  getToken: (userType = 'student') => {
    const tokenKey = `${userType}Token`;
    return localStorage.getItem(tokenKey);
  },

  // Clear token for specific user type
  clearToken: (userType = 'student') => {
    const tokenKey = `${userType}Token`;
    const dataKey = `${userType}Data`;
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(dataKey);
    delete api.defaults.headers.common['Authorization'];
  },

  // Clear all tokens
  clearAllTokens: () => {
    ['student', 'teacher', 'admin'].forEach(userType => {
      this.clearToken(userType);
    });
  },

  // Check if user is authenticated
  isAuthenticated: (userType = 'student') => {
    return !!this.getToken(userType);
  },

  // Initialize token from localStorage (call this on app start)
  initializeToken: (userType = 'student') => {
    const token = this.getToken(userType);
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log(`Token initialized for ${userType}:`, token.substring(0, 20) + '...');
    }
  },
};

// Backward compatibility - Legacy API objects
export const adminAPI = {
  login: apiMethods.adminLogin,
  register: apiMethods.adminRegister,
  getProfile: apiMethods.adminGetProfile,
  updateProfile: apiMethods.adminUpdateProfile,
  getDashboardStats: apiMethods.adminGetDashboardStats,
  getUsers: apiMethods.adminGetUsers,
  getAllAppointments: apiMethods.adminGetAllAppointments,
  updateTeacherStatus: apiMethods.adminUpdateTeacherStatus,
  deleteUser: apiMethods.adminDeleteUser,
  logout: () => tokenManager.clearToken('admin'),
};

export const teacherAPI = {
  getTeachers: apiMethods.getAllTeachers,
  getTeacher: apiMethods.getTeacherById,
  getTeacherAvailability: apiMethods.getTeacherAvailability,
  updateTeacherAvailability: apiMethods.updateTeacherAvailability,
  login: apiMethods.teacherLogin,
  register: apiMethods.teacherRegister,
  getProfile: apiMethods.teacherGetProfile,
  updateProfile: apiMethods.teacherUpdateProfile,
};

export const appointmentAPI = {
  getAppointments: apiMethods.getAllAppointments,
  getTeacherAppointments: apiMethods.getTeacherAppointments,
  getAppointment: apiMethods.getAppointmentById,
  bookAppointment: apiMethods.createAppointment,
  updateAppointment: apiMethods.updateAppointment,
  cancelAppointment: apiMethods.cancelAppointment,
  confirmAppointment: apiMethods.confirmAppointment,
  rejectAppointment: apiMethods.rejectAppointment,
};

export const studentAPI = {
  getProfile: apiMethods.studentGetProfile,
  updateProfile: apiMethods.studentUpdateProfile,
};

export const apiHelpers = {
  setAuthToken: (token) => tokenManager.setToken(token),
  clearAuthToken: () => tokenManager.clearAllTokens(),
  getToken: () => tokenManager.getToken(),
  isAuthenticated: () => tokenManager.isAuthenticated(),
  initializeToken: () => tokenManager.initializeToken(),
  testConnection: apiMethods.testConnection,
  logout: () => tokenManager.clearAllTokens(),
};

// Default export for backward compatibility
export default {
  adminAPI,
  teacherAPI,
  appointmentAPI,
  studentAPI,
  apiHelpers,
  api
};