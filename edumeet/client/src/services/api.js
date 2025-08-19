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

    // Determine which token to use based on the URL
    if (config.url.startsWith('/admin')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers')) {
      token = getTokenFromStorage('teacherToken');
    } else {
      // For appointment routes and other routes, prioritize teacherToken, then userToken
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken');
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
          if (config.url.startsWith('/admin')) {
            tokenManager.removeAdminToken();
            window.location.href = '/admin/login';
          } else if (config.url.startsWith('/teachers')) {
            tokenManager.removeTeacherToken();
            localStorage.removeItem('teacher'); // Also remove teacher data
            window.location.href = '/teacher/login';
          } else {
            tokenManager.removeUserToken();
            localStorage.removeItem('userData'); // Also remove user data
            window.location.href = '/login';
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

// API endpoints
export const endpoints = {
  // Auth endpoints (for regular users)
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    verifyToken: '/auth/verify-token',
  },

  // Teacher endpoints
  teachers: {
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    create: '/teachers',
    update: (id) => `/teachers/${id}`,
    delete: (id) => `/teachers/${id}`,
    permanentDelete: (id) => `/teachers/${id}/permanent`,
    getStats: '/teachers/stats',
    getByDepartment: (department) => `/teachers/department/${department}`,
    
    // Teacher Authentication routes
    login: '/teachers/login',
    sendSetupLink: '/teachers/send-setup-link',
    setupAccount: (token) => `/teachers/setup-account/${token}`,
    profile: '/teachers/profile',
    logout: '/teachers/logout',
  },

  // Appointment endpoints
  appointments: {
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    getStats: '/appointments/stats',
    request: '/appointments/request',
    book: '/appointments/book',
    accept: (id) => `/appointments/${id}/accept`,
    reject: (id) => `/appointments/${id}/reject`,
    complete: (id) => `/appointments/${id}/complete`,
    update: (id) => `/appointments/${id}`,
    cancel: (id) => `/appointments/${id}/cancel`,
    getByTeacher: (teacherId) => `/appointments/teacher/${teacherId}`,
    getTeacherPending: (teacherId) => `/appointments/teacher/${teacherId}/pending`,
  },

  // Admin endpoints
  admin: {
    register: '/admin/register',
    login: '/admin/login',
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    dashboardStats: '/admin/dashboard/stats',
    getUsers: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    getAllAppointments: '/admin/appointments',
    updateTeacherStatus: (teacherId) => `/admin/teachers/${teacherId}/status`,
    getPendingRegistrations: '/admin/users/pending',
    getAllUsers: '/admin/users',
    approveUser: (id) => `/admin/users/${id}/approve`,
    rejectUser: (id) => `/admin/users/${id}/reject`,
  },
  
  messages: {
    getByRoom: (roomId) => `/messages/room/${roomId}`,
    delete: (id) => `/messages/${id}`,
    getRoomStats: (roomId) => `/messages/room/${roomId}/stats`
  }
};

// Simplified token management utilities
export const tokenManager = {
  // User token methods
  setUserToken: (token, persistent = false) => {
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
  setTeacherToken: (token, persistent = false) => {
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
    localStorage.removeItem('teacher'); // Also remove teacher data
    sessionStorage.removeItem('teacher');
  },
  
  // Admin token methods
  setAdminToken: (token, persistent = false) => {
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

  // Get current teacher ID
  getTeacherId: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?._id || teacher?.id || null;
    } catch (error) {
      console.error('Error getting teacher ID:', error);
      return null;
    }
  },

  // Get current user ID
  getUserId: () => {
    try {
      const user = tokenManager.getCurrentUser();
      return user?._id || user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  },

  // Get current admin ID
  getAdminId: () => {
    try {
      const admin = tokenManager.getCurrentAdmin();
      return admin?._id || admin?.id || null;
    } catch (error) {
      console.error('Error getting admin ID:', error);
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

  // Debug token state (for development)
  debugTokenState: () => {
    if (process.env.NODE_ENV === 'development') {
      const state = {
        hasUserToken: !!getTokenFromStorage('userToken'),
        hasTeacherToken: !!getTokenFromStorage('teacherToken'),
        hasAdminToken: !!getTokenFromStorage('adminToken'),
        hasUserData: !!(localStorage.getItem('userData') || sessionStorage.getItem('userData')),
        hasTeacherData: !!(localStorage.getItem('teacher') || sessionStorage.getItem('teacher')),
        userRole: localStorage.getItem('userRole') || sessionStorage.getItem('userRole'),
        teacherTokenLength: getTokenFromStorage('teacherToken')?.length || 0,
        userTokenLength: getTokenFromStorage('userToken')?.length || 0,
        adminTokenLength: getTokenFromStorage('adminToken')?.length || 0,
        storageCheck: {
          localStorageAvailable: (() => {
            try {
              localStorage.setItem('__test__', 'test');
              localStorage.removeItem('__test__');
              return true;
            } catch { return false; }
          })(),
          sessionStorageAvailable: (() => {
            try {
              sessionStorage.setItem('__test__', 'test');
              sessionStorage.removeItem('__test__');
              return true;
            } catch { return false; }
          })(),
          teacherTokenLocation: (() => {
            if (localStorage.getItem('teacherToken')) return 'localStorage';
            if (sessionStorage.getItem('teacherToken')) return 'sessionStorage';
            return 'none';
          })()
        },
        currentTeacher: tokenManager.getCurrentTeacher(),
        authStatus: tokenManager.getAuthenticationStatus()
      };
      
      console.log('🔍 Token Debug State:', state);
      return state;
    } else {
      console.warn('debugTokenState is only available in development mode');
      return null;
    }
  },

  // Enhanced debug method for storage state
  getStorageState: () => {
    return tokenManager.debugTokenState();
  },

  // Method to validate token format
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

  // Helper to check if user is authenticated and has required data
  isValidAuth: (userType = 'teacher') => {
    switch (userType.toLowerCase()) {
      case 'teacher':
        return tokenManager.isTeacherLoggedIn() && !!tokenManager.getCurrentTeacher();
      case 'user':
      case 'student':
        return tokenManager.isUserLoggedIn() && !!tokenManager.getCurrentUser();
      case 'admin':
        return tokenManager.isAdminLoggedIn() && !!tokenManager.getCurrentAdmin();
      default:
        return false;
    }
  },

  // Method to refresh token data from storage
  refreshFromStorage: () => {
    const teacherToken = getTokenFromStorage('teacherToken');
    const userToken = getTokenFromStorage('userToken');
    const adminToken = getTokenFromStorage('adminToken');
    
    console.log('🔄 Refreshing tokens from storage:', {
      hasTeacherToken: !!teacherToken,
      hasUserToken: !!userToken,
      hasAdminToken: !!adminToken
    });
    
    return {
      teacherToken,
      userToken,
      adminToken,
      teacherData: tokenManager.getCurrentTeacher(),
      userData: tokenManager.getCurrentUser(),
      adminData: tokenManager.getCurrentAdmin()
    };
  },

  // Additional utility methods commonly needed
  getTeacherName: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?.name || teacher?.fullName || teacher?.firstName + ' ' + teacher?.lastName || 'Unknown Teacher';
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

  getTeacherDepartment: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?.department || null;
    } catch (error) {
      console.error('Error getting teacher department:', error);
      return null;
    }
  },

  // Check if teacher data is complete
  isTeacherDataComplete: () => {
    const teacher = tokenManager.getCurrentTeacher();
    return !!(teacher?.name || teacher?.fullName) && !!teacher?.email && !!teacher?._id;
  },

  // Safe getter for any teacher property
  getTeacherProperty: (property) => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?.[property] || null;
    } catch (error) {
      console.error(`Error getting teacher property ${property}:`, error);
      return null;
    }
  }
};

// API methods
export const apiMethods = {
  // Enhanced teacher login
  teacherLogin: async (credentials) => {
    try {
      console.log('🔄 Attempting teacher login with credentials:', { email: credentials.email });
      const response = await api.post(endpoints.teachers.login, credentials);
      console.log('✅ Teacher login successful:', {
        hasToken: !!response.data.token,
        hasTeacherData: !!(response.data.data?.teacher || response.data.teacher)
      });
      return response;
    } catch (error) {
      console.error('❌ Teacher login error:', error);
      throw error;
    }
  },

  // Auth Operations
  register: (userData) => api.post(endpoints.auth.register, userData),
  login: (credentials) => api.post(endpoints.auth.login, credentials),
  logout: () => api.post(endpoints.auth.logout),
  getProfile: () => api.get(endpoints.auth.profile),
  updateProfile: (data) => api.put(endpoints.auth.profile, data),
  verifyToken: () => api.get(endpoints.auth.verifyToken),

  // Teacher Operations
  getAllTeachers: (params = {}) => api.get(endpoints.teachers.getAll, { params }),
  getTeacherById: (id) => api.get(endpoints.teachers.getById(id)),
  createTeacher: (teacherData) => api.post(endpoints.teachers.create, teacherData),
  updateTeacher: (id, teacherData) => api.put(endpoints.teachers.update(id), teacherData),
  deleteTeacher: (id) => api.delete(endpoints.teachers.delete(id)),
  permanentDeleteTeacher: (id) => api.delete(endpoints.teachers.permanentDelete(id)),
  getTeachersByDepartment: (department) => api.get(endpoints.teachers.getByDepartment(department)),
  getTeacherStats: () => api.get(endpoints.teachers.getStats),

  // Teacher Auth Operations
  sendTeacherSetupLink: (data) => api.post(endpoints.teachers.sendSetupLink, data),
  setupTeacherAccount: (token, data) => api.post(endpoints.teachers.setupAccount(token), data),
  getTeacherProfile: () => api.get(endpoints.teachers.profile),
  teacherLogout: () => api.post(endpoints.teachers.logout),

  // Appointment Operations
  requestAppointment: (appointmentData) => {
    console.log('🔄 Student requesting appointment:', appointmentData);
    return api.post(endpoints.appointments.request, appointmentData);
  },

  teacherBookAppointment: (appointmentData) => {
    console.log('🔄 Teacher booking appointment directly:', appointmentData);
    return api.post(endpoints.appointments.book, appointmentData);
  },

  acceptAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Accepting appointment request:', id);
      
      if (!id || id.length !== 24) {
        throw new Error('Invalid appointment ID format');
      }
      
      const response = await api.put(endpoints.appointments.accept(id), { 
        responseMessage: responseMessage.trim() 
      });
      
      console.log('✅ Appointment accepted successfully:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ Error accepting appointment:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        
        switch (status) {
          case 404:
            throw new Error('Appointment not found or may have been already processed');
          case 400:
            throw new Error(data.message || 'Invalid request - check appointment status');
          case 403:
            throw new Error('You do not have permission to accept this appointment');
          case 409:
            throw new Error('Appointment has already been processed');
          default:
            throw new Error(data.message || `Server error (${status}). Please try again.`);
        }
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  },

  rejectAppointmentRequest: (id, responseMessage = '') => {
    console.log(`🔄 Teacher rejecting appointment request: ${id}`);
    return api.put(endpoints.appointments.reject(id), { responseMessage });
  },

  completeAppointment: (id) => {
    console.log(`🔄 Completing appointment: ${id}`);
    return api.put(endpoints.appointments.complete(id));
  },

  getAllAppointments: (params = {}) => api.get(endpoints.appointments.getAll, { params }),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  cancelAppointment: (id, reason = '') => api.put(endpoints.appointments.cancel(id), { reason }),
  getAppointmentStats: () => api.get(endpoints.appointments.getStats),

  getTeacherAppointments: (teacherId, params = {}) => {
    return api.get(endpoints.appointments.getByTeacher(teacherId), { params });
  },

  getTeacherPendingRequests: (teacherId) => {
    return api.get(endpoints.appointments.getTeacherPending(teacherId));
  },

  getConfirmedAppointments: (params = {}) => {
    return api.get(endpoints.appointments.getAll, { 
      params: { ...params, status: 'confirmed' } 
    });
  },

  getDirectBookings: (params = {}) => {
    return api.get(endpoints.appointments.getAll, { 
      params: { ...params, status: 'booked', createdBy: 'teacher' } 
    });
  },

  getPendingRequests: (params = {}) => {
    return api.get(endpoints.appointments.getAll, { 
      params: { ...params, status: 'pending', createdBy: 'student' } 
    });
  },

  // Admin Operations
  adminRegister: (adminData) => api.post(endpoints.admin.register, adminData),
  adminLogin: (credentials) => api.post(endpoints.admin.login, credentials),
  getAdminProfile: () => api.get(endpoints.admin.profile),
  updateAdminProfile: (data) => api.put(endpoints.admin.updateProfile, data),
  getDashboardStats: () => api.get(endpoints.admin.dashboardStats),
  getUsers: (params = {}) => api.get(endpoints.admin.getUsers, { params }),
  deleteUser: (userId) => api.delete(endpoints.admin.deleteUser(userId)),
  getAdminAppointments: (params = {}) => api.get(endpoints.admin.getAllAppointments, { params }),
  updateTeacherStatus: (teacherId, statusData) => api.patch(endpoints.admin.updateTeacherStatus(teacherId), statusData),

  getPendingRegistrations: () => api.get(endpoints.admin.getPendingRegistrations),
  getAllUsersForAdmin: (params = {}) => api.get(endpoints.admin.getAllUsers, { params }),
  approveUser: (id) => api.put(endpoints.admin.approveUser(id)),
  rejectUser: (id, reason) => api.put(endpoints.admin.rejectUser(id), { reason }),

  // Enhanced appointment booking with retry logic
  requestAppointmentWithRetry: async (appointmentData) => {
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Requesting appointment attempt ${i + 1}/${maxRetries}`);
        const response = await api.post(endpoints.appointments.request, appointmentData);
        console.log(`✅ Appointment requested successfully on attempt ${i + 1}`);
        return response;
      } catch (error) {
        lastError = error;
        console.log(`❌ Request attempt ${i + 1} failed:`, error.message);
        
        // Don't retry for client errors (400, 409)
        if (error.response?.status === 400 || error.response?.status === 409) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('All appointment request attempts failed');
  },

  // Bulk operations
  bulkUpdateAppointments: async (updates) => {
    const results = [];
    for (const update of updates) {
      try {
        const result = await apiMethods.updateAppointment(update.id, update.data);
        results.push({ success: true, id: update.id, data: result.data });
      } catch (error) {
        results.push({ success: false, id: update.id, error: error.message });
      }
    }
    return results;
  },

  // Search operations
  searchAppointments: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.appointments.getAll, { params });
  },

  searchTeachers: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.teachers.getAll, { params });
  },

  // Validation helper
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
  }
};

// Development helper for debugging
if (process.env.NODE_ENV === 'development') {
  window.tokenManager = tokenManager;
  window.apiMethods = apiMethods;
  window.getTokenFromStorage = getTokenFromStorage;
  
  console.log('🛠️ Development mode: tokenManager, apiMethods, and getTokenFromStorage available on window object');
}

export default api;