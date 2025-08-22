import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? 'https://edumeet.onrender.com/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookie-based auth if used
});

// Simplified token retrieval helper
const getTokenFromStorage = (tokenType = 'userToken') => {
  // Check localStorage first (persistent storage)
  let token = localStorage.getItem(tokenType);
  if (token) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Found ${tokenType} in localStorage`);
    }
    return token;
  }
  
  // Fallback to sessionStorage (temporary storage)
  token = sessionStorage.getItem(tokenType);
  if (token && process.env.NODE_ENV === 'development') {
    console.log(`🔍 Found ${tokenType} in sessionStorage`);
  }
  
  return token;
};

// Request interceptor with proper token handling
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL - CORRECTED LOGIC
    if (config.url.startsWith('/admin') || config.url.includes('/admin/')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers') || config.url.includes('/teachers/')) {
      token = getTokenFromStorage('teacherToken');
    } else if (config.url.startsWith('/auth') || config.url.includes('/auth/')) {
      // For auth routes, use appropriate token or none for login/register
      if (config.url.includes('/profile') || config.url.includes('/verify-token')) {
        token = getTokenFromStorage('userToken');
      }
      // No token needed for login/register/logout
    } else if (config.url.startsWith('/appointments') || config.url.includes('/appointments/')) {
      // For appointments, prioritize teacher token, then user token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken');
    } else if (config.url.startsWith('/messages') || config.url.includes('/messages/')) {
      // For messages, use any available token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
    } else {
      // Default fallback
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

// Response interceptor with proper error handling and redirects
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
          } else if (config.url.includes('/teachers/')) {
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

// CORRECTED API endpoints based on your backend routes
export const endpoints = {
  // Auth endpoints (for regular users) - CORRECTED
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    updateProfile: '/auth/profile',
    verifyToken: '/auth/verify-token',
    
    // Admin functions accessible through auth controller
    getPendingRegistrations: '/auth/admin/pending',
    getAllUsers: '/auth/admin/users',
    getUserStats: '/auth/admin/stats',
    approveUser: (id) => `/auth/admin/approve/${id}`,
    rejectUser: (id) => `/auth/admin/reject/${id}`,
  },

  // Teacher endpoints - CORRECTED to match your backend
  teachers: {
    // Public endpoints
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    getByDepartment: (department) => `/teachers/department/${department}`,
    
    // Authentication routes
    login: '/teachers/login',
    logout: '/teachers/logout',
    setupAccount: (token) => `/teachers/setup-account/${token}`,
    
    // Teacher profile routes
    getProfile: '/teachers/profile/me',
    updateProfile: '/teachers/profile/me',
    
    // Admin-only endpoints - CORRECTED paths
    getStats: '/teachers/admin/stats',
    create: '/teachers/admin/create',
    update: (id) => `/teachers/admin/${id}`,
    delete: (id) => `/teachers/admin/${id}`,
    permanentDelete: (id) => `/teachers/admin/${id}/permanent`,
    approve: (id) => `/teachers/admin/${id}/approve`,
    reject: (id) => `/teachers/admin/${id}/reject`,
    sendSetupLink: '/teachers/admin/send-setup-link',
    
    // Legacy endpoints (for backward compatibility)
    legacyCreate: '/teachers',
    legacyUpdate: (id) => `/teachers/${id}`,
    legacyDelete: (id) => `/teachers/${id}`,
    legacyPermanentDelete: (id) => `/teachers/${id}/permanent`,
    legacyGetStats: '/teachers/stats',
    legacySendSetupLink: '/teachers/send-setup-link',
  },

  // Appointment endpoints - CORRECTED
  appointments: {
    // Statistics route (comes first to avoid conflicts)
    getStats: '/appointments/stats',
    
    // Student and teacher actions
    request: '/appointments/request',  // Student request appointment
    book: '/appointments/book',        // Teacher direct booking
    
    // Teacher-specific routes (current teacher)
    getTeacherPending: '/appointments/teacher/pending',
    getTeacherAppointments: '/appointments/teacher/appointments',
    
    // Specific teacher routes (with ID)
    getTeacherPendingById: (teacherId) => `/appointments/teacher/${teacherId}/pending`,
    getByTeacher: (teacherId) => `/appointments/teacher/${teacherId}`,
    
    // Action routes
    accept: (id) => `/appointments/${id}/accept`,
    reject: (id) => `/appointments/${id}/reject`,
    complete: (id) => `/appointments/${id}/complete`,
    cancel: (id) => `/appointments/${id}/cancel`,
    
    // Generic CRUD routes
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    update: (id) => `/appointments/${id}`,
    delete: (id) => `/appointments/${id}`,  // Admin only
  },

  // Admin endpoints - CORRECTED to match your adminRoutes
  admin: {
    // Auth
    register: '/admin/register',
    login: '/admin/login',
    logout: '/admin/logout',
    
    // Profile
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    
    // Dashboard
    dashboardStats: '/admin/dashboard/stats',
    dashboard: '/admin/dashboard', // Alternative endpoint
    
    // User Management  
    getUsers: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    
    // Appointment Management
    getAppointments: '/admin/appointments',
    
    // Teacher Management
    updateTeacherStatus: (teacherId) => `/admin/teachers/${teacherId}/status`,
    
    // Health check
    health: '/admin/health',
  },
  
  // Message endpoints - CORRECTED to match your messageRoutes
  messages: {
    getByRoom: (roomId) => `/messages/room/${roomId}`,
    delete: (messageId) => `/messages/${messageId}`,
    getRoomStats: (roomId) => `/messages/room/${roomId}/stats`,
    getAllRooms: '/messages/rooms',
    searchInRoom: (roomId) => `/messages/room/${roomId}/search`,
  },
  
  // Health check
  health: '/health'
};

// Token management utilities - Enhanced and corrected
export const tokenManager = {
  // User token methods
  setUserToken: (token, persistent = true) => {
    console.log('🔧 Setting user token:', { hasToken: !!token, persistent });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setUserToken');
      return false;
    }
    
    const cleanToken = token.trim();
    
    if (persistent) {
      localStorage.setItem('userToken', cleanToken);
      sessionStorage.removeItem('userToken');
    } else {
      sessionStorage.setItem('userToken', cleanToken);
      localStorage.removeItem('userToken');
    }
    
    return true;
  },
  
  getUserToken: () => getTokenFromStorage('userToken'),
  
  removeUserToken: () => {
    localStorage.removeItem('userToken');
    sessionStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('userRole');
  },
  
  // Teacher token methods
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
  },
  
  getTeacherToken: () => getTokenFromStorage('teacherToken'),
  
  removeTeacherToken: () => {
    console.log('🗑️ Removing teacher token from all storage');
    localStorage.removeItem('teacherToken');
    sessionStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    sessionStorage.removeItem('teacher');
  },
  
  // Admin token methods
  setAdminToken: (token, persistent = true) => {
    console.log('🔧 Setting admin token:', { hasToken: !!token, persistent });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setAdminToken');
      return false;
    }
    
    const cleanToken = token.trim();
    
    if (persistent) {
      localStorage.setItem('adminToken', cleanToken);
      sessionStorage.removeItem('adminToken');
    } else {
      sessionStorage.setItem('adminToken', cleanToken);
      localStorage.removeItem('adminToken');
    }
    
    return true;
  },
  
  getAdminToken: () => getTokenFromStorage('adminToken'),
  
  removeAdminToken: () => {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    sessionStorage.removeItem('adminData');
  },
  
  // Clear all tokens and data
  clearAllTokens: () => {
    console.log('🧹 Clearing all tokens and user data');
    
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
  },

  // Helper methods for authentication status
  isUserLoggedIn: () => !!getTokenFromStorage('userToken'),
  isTeacherLoggedIn: () => !!getTokenFromStorage('teacherToken'),
  isAdminLoggedIn: () => !!getTokenFromStorage('adminToken'),

  // Get current user data
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

  // Get IDs
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
  },

  // Get authentication status
  getAuthenticationStatus: () => {
    return {
      isTeacherLoggedIn: tokenManager.isTeacherLoggedIn(),
      isUserLoggedIn: tokenManager.isUserLoggedIn(),
      isAdminLoggedIn: tokenManager.isAdminLoggedIn(),
      hasAnyAuth: tokenManager.isTeacherLoggedIn() || tokenManager.isUserLoggedIn() || tokenManager.isAdminLoggedIn(),
      currentTeacher: tokenManager.getCurrentTeacher(),
      currentUser: tokenManager.getCurrentUser(),
      currentAdmin: tokenManager.getCurrentAdmin(),
    };
  },

  // Enhanced utility methods
  getTeacherName: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?.name || 'Unknown Teacher';
    } catch (error) {
      console.error('Error getting teacher name:', error);
      return 'Unknown Teacher';
    }
  },

  getTeacherEmail: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?.email || null;
    } catch (error) {
      console.error('Error getting teacher email:', error);
      return null;
    }
  },

  // Validation methods
  validateTokenFormat: (token) => {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token must be a non-empty string' };
    }
    
    if (token.trim() === '') {
      return { valid: false, error: 'Token cannot be empty or whitespace only' };
    }
    
    // Basic JWT format check (3 parts separated by dots)
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format (should have 3 parts)' };
    }
    
    return { valid: true, error: null };
  },

  // Debug methods (development only)
  debugTokenState: () => {
    if (process.env.NODE_ENV === 'development') {
      const state = {
        hasUserToken: !!getTokenFromStorage('userToken'),
        hasTeacherToken: !!getTokenFromStorage('teacherToken'),
        hasAdminToken: !!getTokenFromStorage('adminToken'),
        currentTeacher: tokenManager.getCurrentTeacher(),
        currentUser: tokenManager.getCurrentUser(),
        currentAdmin: tokenManager.getCurrentAdmin(),
        authStatus: tokenManager.getAuthenticationStatus()
      };
      
      console.log('🔍 Token Debug State:', state);
      return state;
    }
    return null;
  }
};

// CORRECTED API methods to match backend implementation
export const apiMethods = {
  // Enhanced Auth Operations - CORRECTED
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
  verifyToken: () => api.get(endpoints.auth.verifyToken),

  // Auth admin functions (accessible via auth routes)
  getPendingRegistrations: () => api.get(endpoints.auth.getPendingRegistrations),
  getAllUsersForAdmin: (params = {}) => api.get(endpoints.auth.getAllUsers, { params }),
  getUserStats: () => api.get(endpoints.auth.getUserStats),
  approveUser: (id) => api.put(endpoints.auth.approveUser(id)),
  rejectUser: (id, reason) => api.put(endpoints.auth.rejectUser(id), { reason }),

  // Teacher Operations - CORRECTED
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
  getTeacherProfile: () => api.get(endpoints.teachers.getProfile),
  updateTeacherProfile: (data) => api.put(endpoints.teachers.updateProfile, data),
  setupTeacherAccount: (token, data) => api.post(endpoints.teachers.setupAccount(token), data),

  // Public teacher operations
  getAllTeachers: (params = {}) => api.get(endpoints.teachers.getAll, { params }),
  getTeacherById: (id) => api.get(endpoints.teachers.getById(id)),
  getTeachersByDepartment: (department) => api.get(endpoints.teachers.getByDepartment(department)),

  // Admin-only teacher operations - CORRECTED paths
  getTeacherStats: () => api.get(endpoints.teachers.getStats),
  createTeacher: (teacherData) => api.post(endpoints.teachers.create, teacherData),
  updateTeacher: (id, teacherData) => api.put(endpoints.teachers.update(id), teacherData),
  deleteTeacher: (id) => api.delete(endpoints.teachers.delete(id)),
  permanentDeleteTeacher: (id) => api.delete(endpoints.teachers.permanentDelete(id)),
  approveTeacher: (id) => api.patch(endpoints.teachers.approve(id)),
  rejectTeacher: (id) => api.patch(endpoints.teachers.reject(id)),
  sendTeacherSetupLink: (data) => api.post(endpoints.teachers.sendSetupLink, data),

  // Legacy teacher operations (for backward compatibility)
  createTeacherLegacy: (teacherData) => api.post(endpoints.teachers.legacyCreate, teacherData),
  updateTeacherLegacy: (id, teacherData) => api.put(endpoints.teachers.legacyUpdate(id), teacherData),
  deleteTeacherLegacy: (id) => api.delete(endpoints.teachers.legacyDelete(id)),
  permanentDeleteTeacherLegacy: (id) => api.delete(endpoints.teachers.legacyPermanentDelete(id)),
  getTeacherStatsLegacy: () => api.get(endpoints.teachers.legacyGetStats),
  sendTeacherSetupLinkLegacy: (data) => api.post(endpoints.teachers.legacySendSetupLink, data),

  // Appointment Operations - CORRECTED
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

  acceptAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Accepting appointment request:', id);
      const response = await api.put(endpoints.appointments.accept(id), { 
        responseMessage: responseMessage.trim() 
      });
      console.log('✅ Appointment accepted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error accepting appointment:', error);
      throw error;
    }
  },

  rejectAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Rejecting appointment request:', id);
      const response = await api.put(endpoints.appointments.reject(id), { 
        responseMessage: responseMessage.trim() 
      });
      return response;
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      throw error;
    }
  },

  completeAppointment: (id) => api.put(endpoints.appointments.complete(id)),
  cancelAppointment: (id, reason = '') => api.put(endpoints.appointments.cancel(id), { reason }),

  // Appointment queries
  getAllAppointments: (params = {}) => api.get(endpoints.appointments.getAll, { params }),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  deleteAppointment: (id) => api.delete(endpoints.appointments.delete(id)), // Admin only
  getAppointmentStats: () => api.get(endpoints.appointments.getStats),

  // Teacher-specific appointment queries - CORRECTED
  getTeacherPendingRequests: () => api.get(endpoints.appointments.getTeacherPending),
  getTeacherAppointments: (params = {}) => api.get(endpoints.appointments.getTeacherAppointments, { params }),
  getTeacherPendingRequestsById: (teacherId) => api.get(endpoints.appointments.getTeacherPendingById(teacherId)),
  getTeacherAppointmentsById: (teacherId, params = {}) => api.get(endpoints.appointments.getByTeacher(teacherId), { params }),

  // Admin Operations - CORRECTED to match your adminRoutes
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
  getDashboard: () => api.get(endpoints.admin.dashboard),

  // Admin user management
  getAdminUsers: (params = {}) => api.get(endpoints.admin.getUsers, { params }),
  deleteAdminUser: (userId) => api.delete(endpoints.admin.deleteUser(userId)),

  // Admin appointment management
  getAdminAppointments: (params = {}) => api.get(endpoints.admin.getAppointments, { params }),

  // Admin teacher management
  updateTeacherStatus: (teacherId, data) => api.patch(endpoints.admin.updateTeacherStatus(teacherId), data),

  // Admin health check
  adminHealthCheck: () => api.get(endpoints.admin.health),

  // Message Operations - CORRECTED
  getMessagesByRoom: (roomId, params = {}) => api.get(endpoints.messages.getByRoom(roomId), { params }),
  deleteMessage: (messageId) => api.delete(endpoints.messages.delete(messageId)),
  getRoomStats: (roomId) => api.get(endpoints.messages.getRoomStats(roomId)),
  getAllRooms: () => api.get(endpoints.messages.getAllRooms),
  searchMessagesInRoom: (roomId, searchQuery, params = {}) => {
    return api.get(endpoints.messages.searchInRoom(roomId), { 
      params: { q: searchQuery, ...params } 
    });
  },

  // Health check
  healthCheck: () => api.get(endpoints.health),

  // Enhanced appointment utilities
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
      if (appointmentDate < new Date()) {
        errors.push('Appointment date must be in the future');
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