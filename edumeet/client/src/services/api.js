// FIXED API CLIENT - services/api.js

import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? 'https://edumeet.onrender.com/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Enhanced token retrieval with better error handling
const getTokenFromStorage = (tokenType = 'userToken') => {
  try {
    // Check localStorage first (persistent storage)
    let token = localStorage.getItem(tokenType);
    if (token && token.trim() !== '') {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Found ${tokenType} in localStorage`);
      }
      return token.trim();
    }
    
    // Fallback to sessionStorage (temporary storage)
    token = sessionStorage.getItem(tokenType);
    if (token && token.trim() !== '') {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Found ${tokenType} in sessionStorage`);
      }
      return token.trim();
    }
  } catch (error) {
    console.error(`Error retrieving ${tokenType}:`, error);
  }
  
  return null;
};

// FIXED Request interceptor with better token handling
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Enhanced URL-based token logic
    const url = config.url || '';
    
    if (url.includes('/admin/') || url.startsWith('/admin')) {
      token = getTokenFromStorage('adminToken');
    } else if (url.includes('/teachers/') || url.startsWith('/teachers')) {
      token = getTokenFromStorage('teacherToken');
    } else if (url.includes('/appointments/')) {
      // For appointments, prioritize teacher token, then user token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken');
    } else if (url.includes('/messages/')) {
      // For messages, use any available token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
    } else if (url.includes('/auth/profile') || url.includes('/auth/verify-token')) {
      token = getTokenFromStorage('userToken');
    } else if (!url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/auth/logout')) {
      // Default fallback for protected routes
      token = getTokenFromStorage('userToken');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 Token added to request: ${config.method?.toUpperCase()} ${config.url}`);
      }
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️  No token found for request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// FIXED Response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      if (response.data?.success === false) {
        console.warn(`   Response indicates failure:`, response.data);
      }
    }
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error);

    if (error.response) {
      const { status, data, config } = error.response;
      console.error(`HTTP Error ${status} for ${config.method?.toUpperCase()} ${config.url}:`, data);

      switch (status) {
        case 401:
          console.warn('🔒 Unauthorized: Token expired or invalid. Clearing tokens and redirecting.');
          // Determine which tokens to clear based on the failed request URL
          if (config.url.includes('/admin/')) {
            tokenManager.removeAdminToken();
            if (window.location.pathname.includes('/admin')) {
              window.location.href = '/admin/login';
            }
          } else if (config.url.includes('/teachers/') || config.url.includes('/appointments/')) {
            tokenManager.removeTeacherToken();
            if (window.location.pathname.includes('/teacher')) {
              window.location.href = '/teacher/login';
            }
          } else {
            tokenManager.removeUserToken();
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
          break;
          
        case 403:
          console.error('🚫 Access forbidden: Insufficient permissions');
          break;
          
        case 404:
          console.error('🔍 Not found:', config.url);
          break;
          
        case 409:
          console.error('⚠️ Conflict:', data.message || 'Resource conflict');
          break;
          
        case 429:
          console.error('⏰ Rate limit exceeded');
          break;
          
        case 500:
          console.error('💥 Internal server error');
          break;
          
        default:
          console.error(`❓ Unexpected error status: ${status}`);
      }
    } else if (error.request) {
      console.error('🌐 Network Error: No response received');
    } else {
      console.error('⚙️ Request Setup Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// FIXED API endpoints
export const endpoints = {
  // Auth endpoints
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    updateProfile: '/auth/profile',
    verifyToken: '/auth/verify-token',
    getPendingRegistrations: '/auth/pending-registrations',
    approveUser: (id) => `/auth/approve/${id}`,
    rejectUser: (id) => `/auth/reject/${id}`,
    getAllUsers: '/auth/users',
    getUserStats: '/auth/stats',
  },

  // Teacher endpoints
  teachers: {
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    getByDepartment: (department) => `/teachers/department/${department}`,
    getStats: '/teachers/stats',
    create: '/teachers',
    update: (id) => `/teachers/${id}`,
    delete: (id) => `/teachers/${id}`,
    login: '/teachers/login',
    logout: '/teachers/logout',
    profile: '/teachers/profile',
    sendSetupLink: '/teachers/send-setup-link',
    setupAccount: (token) => `/teachers/setup-account/${token}`,
  },

  // FIXED Appointment endpoints
  appointments: {
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    getStats: '/appointments/stats',
    request: '/appointments/request',
    book: '/appointments/book',
    // FIXED: These should use PUT method with proper endpoints
    accept: (id) => `/appointments/${id}/accept`,
    reject: (id) => `/appointments/${id}/reject`,
    complete: (id) => `/appointments/${id}/complete`,
    cancel: (id) => `/appointments/${id}/cancel`,
    update: (id) => `/appointments/${id}`,
    getByTeacher: (teacherId) => `/appointments/teacher/${teacherId}`,
    getTeacherPending: (teacherId) => `/appointments/teacher/${teacherId}/pending`,
  },

  // Admin endpoints
  admin: {
    register: '/admin/register',
    login: '/admin/login',
    logout: '/admin/logout',
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    dashboardStats: '/admin/dashboard/stats',
    getUsers: '/admin/users',
    getUserById: (id) => `/admin/users/${id}`,
    updateUser: (id) => `/admin/users/${id}`,
    deleteUser: (id) => `/admin/users/${id}`,
    approveUser: (id) => `/admin/users/${id}/approve`,
    rejectUser: (id) => `/admin/users/${id}/reject`,
    getPendingRegistrations: '/admin/users/pending',
    getUserStats: '/admin/users/stats',
    getTeachers: '/admin/teachers',
    getTeacherById: (id) => `/admin/teachers/${id}`,
    updateTeacher: (id) => `/admin/teachers/${id}`,
    deleteTeacher: (id) => `/admin/teachers/${id}`,
    getAppointments: '/admin/appointments',
    getAppointmentById: (id) => `/admin/appointments/${id}`,
    updateAppointment: (id) => `/admin/appointments/${id}`,
    deleteAppointment: (id) => `/admin/appointments/${id}`,
    getSystemSettings: '/admin/settings',
    updateSystemSettings: '/admin/settings',
    getSystemStats: '/admin/stats',
  },
  
  // Message endpoints
  messages: {
    getByRoom: (roomId) => `/messages/room/${roomId}`,
    delete: (id) => `/messages/${id}`,
    getRoomStats: (roomId) => `/messages/room/${roomId}/stats`,
    create: '/messages',
    update: (id) => `/messages/${id}`,
  },
  
  health: '/health'
};

// Token management utilities (keeping existing structure but improving)
export const tokenManager = {
  setUserToken: (token, persistent = true) => {
    console.log('🔧 Setting user token:', { hasToken: !!token, persistent });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setUserToken');
      return false;
    }
    
    const cleanToken = token.trim();
    
    try {
      if (persistent) {
        localStorage.setItem('userToken', cleanToken);
        sessionStorage.removeItem('userToken');
      } else {
        sessionStorage.setItem('userToken', cleanToken);
        localStorage.removeItem('userToken');
      }
      return true;
    } catch (error) {
      console.error('Error setting user token:', error);
      return false;
    }
  },
  
  getUserToken: () => getTokenFromStorage('userToken'),
  
  removeUserToken: () => {
    try {
      localStorage.removeItem('userToken');
      sessionStorage.removeItem('userToken');
      localStorage.removeItem('userData');
      sessionStorage.removeItem('userData');
      localStorage.removeItem('userRole');
      sessionStorage.removeItem('userRole');
    } catch (error) {
      console.error('Error removing user token:', error);
    }
  },
  
  setTeacherToken: (token, persistent = true) => {
    console.log('🔧 Setting teacher token:', { 
      hasToken: !!token, 
      persistent, 
      preview: token?.substring(0, 20) + '...' 
    });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setTeacherToken');
      return false;
    }
    
    const cleanToken = token.trim();
    
    try {
      if (persistent) {
        localStorage.setItem('teacherToken', cleanToken);
        sessionStorage.removeItem('teacherToken');
        console.log('✅ Teacher token stored in localStorage (persistent)');
      } else {
        sessionStorage.setItem('teacherToken', cleanToken);
        localStorage.removeItem('teacherToken');
        console.log('✅ Teacher token stored in sessionStorage (temporary)');
      }
      return true;
    } catch (error) {
      console.error('Error setting teacher token:', error);
      return false;
    }
  },
  
  getTeacherToken: () => getTokenFromStorage('teacherToken'),
  
  removeTeacherToken: () => {
    console.log('🗑️ Removing teacher token from all storage');
    try {
      localStorage.removeItem('teacherToken');
      sessionStorage.removeItem('teacherToken');
      localStorage.removeItem('teacher');
      sessionStorage.removeItem('teacher');
    } catch (error) {
      console.error('Error removing teacher token:', error);
    }
  },
  
  setAdminToken: (token, persistent = true) => {
    console.log('🔧 Setting admin token:', { hasToken: !!token, persistent });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setAdminToken');
      return false;
    }
    
    const cleanToken = token.trim();
    
    try {
      if (persistent) {
        localStorage.setItem('adminToken', cleanToken);
        sessionStorage.removeItem('adminToken');
      } else {
        sessionStorage.setItem('adminToken', cleanToken);
        localStorage.removeItem('adminToken');
      }
      return true;
    } catch (error) {
      console.error('Error setting admin token:', error);
      return false;
    }
  },
  
  getAdminToken: () => getTokenFromStorage('adminToken'),
  
  removeAdminToken: () => {
    try {
      localStorage.removeItem('adminToken');
      sessionStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      sessionStorage.removeItem('adminData');
    } catch (error) {
      console.error('Error removing admin token:', error);
    }
  },
  
  clearAllTokens: () => {
    console.log('🧹 Clearing all tokens and user data');
    
    try {
      // Clear all tokens
      localStorage.removeItem('userToken');
      localStorage.removeItem('teacherToken');
      localStorage.removeItem('adminToken');
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('teacherToken');
      sessionStorage.removeItem('adminToken');
      
      // Clear all user data
      localStorage.removeItem('userData');
      localStorage.removeItem('teacher');
      localStorage.removeItem('adminData');
      localStorage.removeItem('userRole');
      sessionStorage.removeItem('userData');
      sessionStorage.removeItem('teacher');
      sessionStorage.removeItem('adminData');
      sessionStorage.removeItem('userRole');
      
      console.log('✅ All tokens and data cleared');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  // Helper methods
  isUserLoggedIn: () => !!getTokenFromStorage('userToken'),
  isTeacherLoggedIn: () => !!getTokenFromStorage('teacherToken'),
  isAdminLoggedIn: () => !!getTokenFromStorage('adminToken'),

  getCurrentUser: () => {
    try {
      let userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  getCurrentTeacher: () => {
    try {
      let teacherData = localStorage.getItem('teacher') || sessionStorage.getItem('teacher');
      return teacherData ? JSON.parse(teacherData) : null;
    } catch (error) {
      console.error('Error parsing teacher data:', error);
      return null;
    }
  },

  getCurrentAdmin: () => {
    try {
      let adminData = localStorage.getItem('adminData') || sessionStorage.getItem('adminData');
      return adminData ? JSON.parse(adminData) : null;
    } catch (error) {
      console.error('Error parsing admin data:', error);
      return null;
    }
  },

  getTeacherId: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?._id || teacher?.id || null;
    } catch (error) {
      console.error('Error getting teacher ID:', error);
      return null;
    }
  },

  getUserId: () => {
    try {
      const user = tokenManager.getCurrentUser();
      return user?._id || user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  },

  getAdminId: () => {
    try {
      const admin = tokenManager.getCurrentAdmin();
      return admin?._id || admin?.id || null;
    } catch (error) {
      console.error('Error getting admin ID:', error);
      return null;
    }
  }
};

// FIXED API methods with better error handling and response processing
export const apiMethods = {
  // Auth Operations
  register: async (userData) => {
    try {
      const response = await api.post(endpoints.auth.register, userData);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      const response = await api.post(endpoints.auth.login, credentials);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  logout: () => api.post(endpoints.auth.logout),
  getProfile: () => api.get(endpoints.auth.profile),
  updateProfile: (data) => api.put(endpoints.auth.updateProfile, data),

  // Teacher Operations
  teacherLogin: async (credentials) => {
    try {
      console.log('🔄 Attempting teacher login');
      const response = await api.post(endpoints.teachers.login, credentials);
      console.log('✅ Teacher login response received');
      return response;
    } catch (error) {
      console.error('❌ Teacher login error:', error);
      throw error;
    }
  },

  teacherLogout: () => api.post(endpoints.teachers.logout),
  getTeacherProfile: () => api.get(endpoints.teachers.profile),
  getAllTeachers: (params = {}) => api.get(endpoints.teachers.getAll, { params }),
  getTeacherById: (id) => api.get(endpoints.teachers.getById(id)),
  getTeachersByDepartment: (department) => api.get(endpoints.teachers.getByDepartment(department)),
  getTeacherStats: () => api.get(endpoints.teachers.getStats),

  // FIXED Appointment Operations
  requestAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Student requesting appointment:', appointmentData);
      const response = await api.post(endpoints.appointments.request, appointmentData);
      return response;
    } catch (error) {
      console.error('❌ Error requesting appointment:', error);
      throw error;
    }
  },

  teacherBookAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Teacher booking appointment directly:', appointmentData);
      const response = await api.post(endpoints.appointments.book, appointmentData);
      return response;
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      throw error;
    }
  },

  // FIXED: Accept appointment request with better error handling and validation
  acceptAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Accepting appointment request:', { id, responseMessage });
      
      if (!id) {
        throw new Error('Appointment ID is required');
      }

      const payload = { 
        responseMessage: responseMessage?.trim() || 'Request accepted'
      };

      const response = await api.put(endpoints.appointments.accept(id), payload);
      console.log('✅ Appointment accepted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error accepting appointment:', error);
      
      // Enhanced error processing
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to accept appointment';
      const statusCode = error?.response?.status;
      
      // Create enhanced error object
      const enhancedError = new Error(errorMessage);
      enhancedError.statusCode = statusCode;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },

  // FIXED: Reject appointment request with better error handling and validation
  rejectAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Rejecting appointment request:', { id, responseMessage });
      
      if (!id) {
        throw new Error('Appointment ID is required');
      }

      const payload = { 
        responseMessage: responseMessage?.trim() || 'Request rejected'
      };

      const response = await api.put(endpoints.appointments.reject(id), payload);
      console.log('✅ Appointment rejected successfully');
      return response;
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      
      // Enhanced error processing
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to reject appointment';
      const statusCode = error?.response?.status;
      
      // Create enhanced error object
      const enhancedError = new Error(errorMessage);
      enhancedError.statusCode = statusCode;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  },

  completeAppointment: (id) => api.put(endpoints.appointments.complete(id)),
  cancelAppointment: (id, reason = '') => api.put(endpoints.appointments.cancel(id), { reason }),

  getAllAppointments: (params = {}) => api.get(endpoints.appointments.getAll, { params }),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  getAppointmentStats: () => api.get(endpoints.appointments.getStats),

  // FIXED: Teacher appointment methods with better error handling
  getTeacherAppointments: async (teacherId, params = {}) => {
    try {
      if (!teacherId) {
        throw new Error('Teacher ID is required');
      }
      
      const response = await api.get(endpoints.appointments.getByTeacher(teacherId), { params });
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher appointments:', error);
      throw error;
    }
  },

  getTeacherPendingRequests: async (teacherId) => {
    try {
      if (!teacherId) {
        throw new Error('Teacher ID is required');
      }
      
      const response = await api.get(endpoints.appointments.getTeacherPending(teacherId));
      return response;
    } catch (error) {
      console.error('❌ Error fetching pending requests:', error);
      throw error;
    }
  },

  // Admin Operations
  adminLogin: async (credentials) => {
    try {
      const response = await api.post(endpoints.admin.login, credentials);
      return response;
    } catch (error) {
      console.error('❌ Admin login error:', error);
      throw error;
    }
  },

  adminRegister: (adminData) => api.post(endpoints.admin.register, adminData),
  adminLogout: () => api.post(endpoints.admin.logout),
  getAdminProfile: () => api.get(endpoints.admin.profile),
  updateAdminProfile: (data) => api.put(endpoints.admin.updateProfile, data),
  getDashboardStats: () => api.get(endpoints.admin.dashboardStats),

  // User management via auth controller
  getPendingRegistrations: () => api.get(endpoints.auth.getPendingRegistrations),
  getAllUsersForAdmin: (params = {}) => api.get(endpoints.auth.getAllUsers, { params }),
  approveUser: (id) => api.put(endpoints.auth.approveUser(id)),
  rejectUser: (id, reason) => api.put(endpoints.auth.rejectUser(id), { reason }),
  getUserStats: () => api.get(endpoints.auth.getUserStats),

  // Message Operations
  getMessagesByRoom: (roomId) => api.get(endpoints.messages.getByRoom(roomId)),
  deleteMessage: (id) => api.delete(endpoints.messages.delete(id)),
  getRoomStats: (roomId) => api.get(endpoints.messages.getRoomStats(roomId)),

  // Health check
  healthCheck: () => api.get(endpoints.health),

  // FIXED: Enhanced appointment validation
  validateAppointmentData: (appointmentData, isTeacherBooking = false) => {
    const errors = [];
    
    if (!appointmentData.day) {
      errors.push('Day is required');
    }
    
    if (!appointmentData.time) {
      errors.push('Time is required');
    }
    
    if (!appointmentData.date) {
      errors.push('Date is required');
    } else {
      const appointmentDate = new Date(appointmentData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        errors.push('Appointment date must be today or in the future');
      }
    }
    
    if (!appointmentData.student?.name) {
      errors.push('Student name is required');
    }
    
    if (!appointmentData.student?.email) {
      errors.push('Student email is required');
    }
    
    if (!isTeacherBooking && !appointmentData.teacherId) {
      errors.push('Teacher ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Constants
export const constants = {
  DEPARTMENTS: [
    'Computer Science',
    'Mathematics', 
    'Physics',
    'Chemistry',
    'Biology',
    'English',
    'History',
    'Economics',
    'Business Administration',
    'Psychology'
  ],
  
  AVAILABILITY_SLOTS: [
    '9:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM', 
    '11:00 AM - 12:00 PM',
    '12:00 PM - 1:00 PM',
    '2:00 PM - 3:00 PM',
    '3:00 PM - 4:00 PM',
    '4:00 PM - 5:00 PM',
    '5:00 PM - 6:00 PM'
  ],
  
  APPOINTMENT_STATUSES: [
    'pending',
    'confirmed', 
    'rejected',
    'cancelled',
    'completed',
    'booked'
  ],

  APPOINTMENT_TYPES: {
    STUDENT_REQUEST: 'student_request',
    TEACHER_BOOKING: 'teacher_booking'
  },

  USER_ROLES: ['student', 'teacher', 'admin'],
  APPROVAL_STATUSES: ['pending', 'approved', 'rejected']
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  window.tokenManager = tokenManager;
  window.apiMethods = apiMethods;
  window.api = api;
  
  console.log('🛠️ Development mode: API utilities available on window object');
}

export default api;