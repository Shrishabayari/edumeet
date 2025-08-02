// client/src/api.js (EduMeet API Configuration) - FIXED ADMIN TOKEN ISSUES
import axios from 'axios';

// API Base URL Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
                    (process.env.NODE_ENV === 'production' 
                      ? 'https://edumeet.onrender.com' 
                      : 'http://localhost:5000');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// FIXED Token Management Utilities
export const tokenManager = {
  // User tokens
  setUserToken: (token) => {
    localStorage.setItem('userToken', token);
    localStorage.setItem('userTokenTimestamp', Date.now().toString());
  },
  getUserToken: () => localStorage.getItem('userToken'),
  removeUserToken: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userTokenTimestamp');
    localStorage.removeItem('user');
  },
  
  // FIXED Admin tokens - Consistent with backend expectations
  setAdminToken: (token) => {
    // Clear conflicting tokens first
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('userToken');
    
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminTokenTimestamp', Date.now().toString());
  },
  getAdminToken: () => {
    return localStorage.getItem('adminToken');
  },
  removeAdminToken: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminTokenTimestamp');
    localStorage.removeItem('admin');
  },
  
  // Teacher tokens
  setTeacherToken: (token) => {
    // Clear conflicting tokens first
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userToken');
    
    localStorage.setItem('teacherToken', token);
    localStorage.setItem('teacherTokenTimestamp', Date.now().toString());
  },
  getTeacherToken: () => {
    return localStorage.getItem('teacherToken');
  },
  removeTeacherToken: () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherTokenTimestamp');
    localStorage.removeItem('teacher');
  },
  
  // Clear all tokens
  clearAllTokens: () => {
    localStorage.clear();
  },
  
  // FIXED Get current role based on available tokens and data
  getCurrentRole: () => {
    const adminToken = localStorage.getItem('adminToken');
    const teacherToken = localStorage.getItem('teacherToken');
    const userToken = localStorage.getItem('userToken');
    
    const adminData = localStorage.getItem('admin');
    const teacherData = localStorage.getItem('teacher');
    const userData = localStorage.getItem('user');
    
    // Check admin first
    if (adminToken && adminData) {
      try {
        const admin = JSON.parse(adminData);
        if (admin && (admin.role === 'admin' || admin.role === 'super-admin')) {
          return 'admin';
        }
      } catch (e) {
        console.error('Error parsing admin data:', e);
      }
    }
    
    // Check teacher
    if (teacherToken && teacherData) {
      try {
        const teacher = JSON.parse(teacherData);
        if (teacher && teacher.role === 'teacher') {
          return 'teacher';
        }
      } catch (e) {
        console.error('Error parsing teacher data:', e);
      }
    }
    
    // Check user
    if (userToken && userData) {
      try {
        const user = JSON.parse(userData);
        if (user) {
          return 'user';
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    
    return null;
  },
  
  // FIXED Check if any token is expired
  isTokenExpired: (role = 'user') => {
    const timestamps = {
      user: localStorage.getItem('userTokenTimestamp'),
      admin: localStorage.getItem('adminTokenTimestamp'),
      teacher: localStorage.getItem('teacherTokenTimestamp')
    };
    
    const timestamp = timestamps[role];
    if (!timestamp) return true;
    
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    return tokenAge > maxAge;
  },
  
  // FIXED Get current user data
  getCurrentUser: () => {
    const role = tokenManager.getCurrentRole();
    
    try {
      if (role === 'admin') {
        const adminData = localStorage.getItem('admin');
        return adminData ? JSON.parse(adminData) : null;
      }
      if (role === 'teacher') {
        const teacherData = localStorage.getItem('teacher');
        return teacherData ? JSON.parse(teacherData) : null;
      }
      if (role === 'user') {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
    
    return null;
  },
  
  // FIXED Check authentication status
  isAuthenticated: () => {
    const role = tokenManager.getCurrentRole();
    if (!role) return false;
    
    const isExpired = tokenManager.isTokenExpired(role);
    const hasValidToken = (() => {
      switch (role) {
        case 'admin': return !!localStorage.getItem('adminToken');
        case 'teacher': return !!localStorage.getItem('teacherToken');
        case 'user': return !!localStorage.getItem('userToken');
        default: return false;
      }
    })();
    
    return hasValidToken && !isExpired;
  }
};

// FIXED Request interceptor - Better token selection logic
api.interceptors.request.use(
  (config) => {
    let token = null;
    const url = config.url || '';

    // FIXED: More reliable URL-based token selection
    if (url.includes('/admin/') || url.startsWith('admin/') || url === '/admin' || 
        url.includes('admin') && (url.includes('login') || url.includes('dashboard') || 
        url.includes('users') || url.includes('teachers') || url.includes('appointments'))) {
      token = tokenManager.getAdminToken();
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Using ADMIN token for:', url, 'Token exists:', !!token);
      }
    } else if (url.includes('/teacher/') || url.startsWith('teacher/') || url === '/teachers/login' ||
               url.includes('/teachers/') && (url.includes('profile') || url.includes('dashboard'))) {
      token = tokenManager.getTeacherToken();
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Using TEACHER token for:', url, 'Token exists:', !!token);
      }
    } else {
      // For user routes or general routes
      token = tokenManager.getUserToken();
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Using USER token for:', url, 'Token exists:', !!token);
      }
    }

    // Add token to headers if available
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 Token added: ${token.substring(0, 20)}...`);
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('❌ No token available for:', url);
      }
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Configuration Error:', error);
    return Promise.reject(error);
  }
);

// FIXED Response interceptor - Better error handling and redirect logic
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error);

    if (error.response) {
      const { status, data, config } = error.response;
      const url = config.url || '';
      
      switch (status) {
        case 401: // Unauthorized - FIXED: Better redirect logic
          console.warn('🔒 Unauthorized: Token expired or invalid');
          
          // FIXED: More accurate URL pattern matching for redirects
          if (url.includes('/admin') || url.includes('admin')) {
            console.log('🔄 Redirecting to admin login...');
            tokenManager.removeAdminToken();
            // Use setTimeout to avoid potential issues with immediate redirect
            setTimeout(() => {
              window.location.href = '/admin/login';
            }, 100);
          } else if (url.includes('/teacher') || url.includes('teacher')) {
            console.log('🔄 Redirecting to teacher login...');
            tokenManager.removeTeacherToken();
            setTimeout(() => {
              window.location.href = '/teacher/login';
            }, 100);
          } else {
            console.log('🔄 Redirecting to user login...');
            tokenManager.removeUserToken();
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
          break;
          
        case 403:
          console.error('🚫 Access forbidden: Insufficient permissions');
          break;
          
        case 404:
          console.error('🔍 API endpoint not found:', url);
          break;
          
        case 422:
          console.error('✋ Validation Error:', data);
          break;
          
        case 429:
          console.error('⏰ Rate limit exceeded. Please try again later.');
          break;
          
        case 500:
          console.error('💥 Internal server error. Please try again later.');
          break;
          
        default:
          console.error(`❓ Unexpected error status: ${status}`);
      }

      const errorMessage = 
        data?.message || 
        data?.error || 
        data?.details || 
        `Request failed with status ${status}`;
        
      return Promise.reject(new Error(errorMessage));

    } else if (error.request) {
      console.error('🌐 Network Error - No response received:', error.request);
      return Promise.reject(new Error('Network error. Please check your internet connection and try again.'));
    } else {
      console.error('⚙️ Request Setup Error:', error.message);
      return Promise.reject(new Error(`Configuration error: ${error.message}`));
    }
  }
);

// API Endpoints Configuration
export const endpoints = {
  // User Authentication
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile', 
    updateProfile: '/auth/profile',
    verifyToken: '/auth/verify-token',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    changePassword: '/auth/change-password',
  },

  // Admin Routes - FIXED endpoint paths
  admin: {
    // Admin Authentication
    register: '/admin/register',
    login: '/admin/login',
    logout: '/admin/logout',
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    verifyToken: '/admin/verify-token', // Added for token verification
    
    // Dashboard & Stats
    dashboard: '/admin/dashboard',
    stats: '/admin/stats',
    
    // User Management
    users: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    getUserById: (userId) => `/admin/users/${userId}`,
    
    // User Approval
    pendingUsers: '/admin/users/pending',
    approveUser: (userId) => `/admin/users/${userId}/approve`,
    rejectUser: (userId) => `/admin/users/${userId}/reject`,
    
    // Teacher Management
    teachers: '/admin/teachers',
    addTeacher: '/admin/teachers',
    updateTeacher: (teacherId) => `/admin/teachers/${teacherId}`,
    deleteTeacher: (teacherId) => `/admin/teachers/${teacherId}`,
    updateTeacherStatus: (teacherId) => `/admin/teachers/${teacherId}/status`,
    
    // Appointment Management
    appointments: '/admin/appointments',
    appointmentById: (appointmentId) => `/admin/appointments/${appointmentId}`,
    
    // Reports
    reports: '/admin/reports',
    exportData: '/admin/export',
  },

  // Teacher Routes
  teachers: {
    // Public teacher routes (no auth required)
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    getByDepartment: (department) => `/teachers/department/${encodeURIComponent(department)}`,
    search: '/teachers/search',
    
    // Teacher Authentication
    login: '/teachers/login',
    logout: '/teachers/logout',
    profile: '/teachers/profile',
    updateProfile: '/teachers/profile',
    changePassword: '/teachers/change-password',
    
    // Account Setup
    sendSetupLink: '/teachers/setup/send-link',
    setupAccount: (token) => `/teachers/setup/${token}`,
    verifySetup: (token) => `/teachers/setup/verify/${token}`,
    
    // Teacher Dashboard & Stats
    dashboard: '/teachers/dashboard',
    stats: '/teachers/stats',
    
    // Availability Management
    availability: '/teachers/availability',
    updateAvailability: '/teachers/availability',
    
    // Teacher's Appointments
    appointments: '/teachers/appointments',
    appointmentById: (appointmentId) => `/teachers/appointments/${appointmentId}`,
    approveAppointment: (appointmentId) => `/teachers/appointments/${appointmentId}/approve`,
    rejectAppointment: (appointmentId) => `/teachers/appointments/${appointmentId}/reject`,
    
    // Schedule Management
    schedule: '/teachers/schedule',
    updateSchedule: '/teachers/schedule',
  },

  // Other endpoints remain the same...
  appointments: {
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    book: '/appointments',
    update: (id) => `/appointments/${id}`,
    cancel: (id) => `/appointments/${id}/cancel`,
    getByTeacher: (teacherId) => `/appointments/teacher/${teacherId}`,
    getByUser: (userId) => `/appointments/user/${userId}`,
    getByDate: (date) => `/appointments/date/${date}`,
    getByDateRange: '/appointments/date-range',
    stats: '/appointments/stats',
  },
};

// FIXED API Methods with improved admin authentication
export const apiMethods = {
  // ============ USER AUTHENTICATION ============
  auth: {
    register: (userData) => api.post(endpoints.auth.register, userData),
    login: async (credentials) => {
      try {
        const response = await api.post(endpoints.auth.login, credentials);
        if (response.data.token) {
          tokenManager.setUserToken(response.data.token);
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }
        return response;
      } catch (error) {
        console.error('User login failed:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await api.post(endpoints.auth.logout);
      } finally {
        tokenManager.removeUserToken();
      }
    },
    getProfile: () => api.get(endpoints.auth.profile),
    updateProfile: (data) => api.put(endpoints.auth.updateProfile, data),
    verifyToken: () => api.get(endpoints.auth.verifyToken),
  },

  // ============ ADMIN OPERATIONS - FIXED ============
  admin: {
    // FIXED Admin Auth with proper token and data management
    register: (adminData) => api.post(endpoints.admin.register, adminData),
    login: async (credentials) => {
      try {
        console.log('🔄 Admin login attempt...');
        const response = await api.post(endpoints.admin.login, credentials);
        
        console.log('✅ Admin login response:', response.data);
        
        // Store admin token and data
        if (response.data.token) {
          tokenManager.setAdminToken(response.data.token);
          console.log('🔑 Admin token stored');
        }
        
        if (response.data.admin) {
          localStorage.setItem('admin', JSON.stringify(response.data.admin));
          console.log('👤 Admin data stored:', response.data.admin);
        }
        
        return response;
      } catch (error) {
        console.error('❌ Admin login failed:', error);
        // Clear any partially stored data on login failure
        tokenManager.removeAdminToken();
        throw error;
      }
    },
    logout: async () => {
      try {
        console.log('🔄 Admin logout...');
        await api.post(endpoints.admin.logout);
      } catch (error) {
        console.error('Admin logout API call failed:', error);
      } finally {
        console.log('🧹 Clearing admin tokens and data...');
        tokenManager.removeAdminToken();
      }
    },
    getProfile: () => api.get(endpoints.admin.profile),
    updateProfile: (data) => api.put(endpoints.admin.updateProfile, data),
    verifyToken: () => api.get(endpoints.admin.verifyToken),
    
    // Dashboard
    getDashboardStats: () => api.get(endpoints.admin.stats),
    
    // User Management
    getAllUsers: (params = {}) => api.get(endpoints.admin.users, { params }),
    getUserById: (userId) => api.get(endpoints.admin.getUserById(userId)),
    deleteUser: (userId) => api.delete(endpoints.admin.deleteUser(userId)),
    
    // User Approval
    getPendingUsers: () => api.get(endpoints.admin.pendingUsers),
    approveUser: (userId, data = {}) => api.put(endpoints.admin.approveUser(userId), data),
    rejectUser: (userId, reason) => api.put(endpoints.admin.rejectUser(userId), { reason }),
    
    // Teacher Management
    getAllTeachers: (params = {}) => api.get(endpoints.admin.teachers, { params }),
    addTeacher: (teacherData) => api.post(endpoints.admin.addTeacher, teacherData),
    updateTeacher: (teacherId, data) => api.put(endpoints.admin.updateTeacher(teacherId), data),
    deleteTeacher: (teacherId) => api.delete(endpoints.admin.deleteTeacher(teacherId)),
    updateTeacherStatus: (teacherId, status) => 
      api.patch(endpoints.admin.updateTeacherStatus(teacherId), { status }),
    
    // Appointment Management
    getAllAppointments: (params = {}) => api.get(endpoints.admin.appointments, { params }),
    getAppointmentById: (appointmentId) => api.get(endpoints.admin.appointmentById(appointmentId)),
    
    // Reports
    getReports: (params = {}) => api.get(endpoints.admin.reports, { params }),
    exportData: (type, params = {}) => api.get(endpoints.admin.exportData, { 
      params: { type, ...params },
      responseType: 'blob' 
    }),
  },

  // ============ TEACHER OPERATIONS - FIXED ============
  teachers: {
    // Public Teacher Operations (no auth required)
    getAll: (params = {}) => api.get(endpoints.teachers.getAll, { params }),
    getById: (id) => api.get(endpoints.teachers.getById(id)),
    
    // FIXED Teacher Authentication
    login: async (credentials) => {
      try {
        const response = await api.post(endpoints.teachers.login, credentials);
        if (response.data.token) {
          tokenManager.setTeacherToken(response.data.token);
          if (response.data.teacher) {
            localStorage.setItem('teacher', JSON.stringify(response.data.teacher));
          }
        }
        return response;
      } catch (error) {
        console.error('Teacher login failed:', error);
        throw error;
      }
    },
    logout: async () => {
      try {
        await api.post(endpoints.teachers.logout);
      } finally {
        tokenManager.removeTeacherToken();
      }
    },
    getProfile: () => api.get(endpoints.teachers.profile),
    updateProfile: (data) => api.put(endpoints.teachers.updateProfile, data),
  },
};

// Development helpers
if (process.env.NODE_ENV === 'development') {
  window.eduMeetAPI = {
    api,
    endpoints,
    apiMethods,
    tokenManager,
    constants: {
      API_BASE_URL
    }
  };

  console.log('🚀 EduMeet API loaded in development mode');
  console.log('📡 API Base URL:', API_BASE_URL);
  console.log('🔧 Access API tools via window.eduMeetAPI');
  
  // Add token debugging helper
  window.debugTokens = () => {
    console.log('🔍 Current Token Status:');
    console.log('Admin Token:', tokenManager.getAdminToken());
    console.log('Teacher Token:', tokenManager.getTeacherToken());
    console.log('User Token:', tokenManager.getUserToken());
    console.log('Current Role:', tokenManager.getCurrentRole());
    console.log('Is Authenticated:', tokenManager.isAuthenticated());
    console.log('Admin Data:', localStorage.getItem('admin'));
    console.log('Teacher Data:', localStorage.getItem('teacher'));
    console.log('User Data:', localStorage.getItem('user'));
  };
}

export default api;