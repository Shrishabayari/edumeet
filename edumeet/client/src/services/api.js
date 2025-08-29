import axios from 'axios';

// CORRECTED API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? 'https://edumeet.onrender.com/api' : 'http://localhost:5000/api');

console.log('🔧 API Base URL:', API_BASE_URL);

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
  if (token && token !== 'undefined' && token !== 'null') {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Found ${tokenType} in localStorage`);
    }
    return token;
  }
  
  // Fallback to sessionStorage (temporary storage)
  token = sessionStorage.getItem(tokenType);
  if (token && token !== 'undefined' && token !== 'null' && process.env.NODE_ENV === 'development') {
    console.log(`🔍 Found ${tokenType} in sessionStorage`);
  }
  
  return token;
};

// CORRECTED Request interceptor with proper token handling
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL - CORRECTED LOGIC
    if (config.url.includes('/admin')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.includes('/teachers')) {
      token = getTokenFromStorage('teacherToken');
    } else if (config.url.includes('/auth')) {
      // For auth routes, use appropriate token or none for login/register
      if (config.url.includes('/profile') || config.url.includes('/verify-token')) {
        token = getTokenFromStorage('userToken');
      }
      // No token needed for login/register/logout
    } else if (config.url.includes('/appointments')) {
      // For appointments, prioritize teacher token, then user token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken');
    } else if (config.url.includes('/messages')) {
      // For messages, use any available token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
    } else {
      // Default fallback
      token = getTokenFromStorage('userToken');
    }

    if (token && token !== 'undefined' && token !== 'null') {
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

// CORRECTED Response interceptor with proper error handling and redirects
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
          if (config.url.includes('/admin')) {
            tokenManager.removeAdminToken();
            if (window.location.pathname.includes('/admin') && !window.location.pathname.includes('/login')) {
              window.location.href = '/admin/login';
            }
          } else if (config.url.includes('/teacher')) {
            tokenManager.removeTeacherToken();
            if (window.location.pathname.includes('/teacher') && !window.location.pathname.includes('/login')) {
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
    
    // Dashboard - CORRECTED: Try multiple endpoints
    dashboard: '/admin/dashboard',
    dashboardStats: '/admin/dashboard/stats',
    
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

// CORRECTED Token management utilities
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
  
  // Admin token methods - CORRECTED
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
    localStorage.removeItem('admin');
    sessionStorage.removeItem('admin');
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
    localStorage.removeItem('admin');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('userData');
    sessionStorage.removeItem('teacher');
    sessionStorage.removeItem('admin');
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
      let adminData = localStorage.getItem('admin') || sessionStorage.getItem('admin');
      return adminData ? JSON.parse(adminData) : null;
    } catch (error) {
      console.error('Error parsing admin data:', error);
      return null;
    }
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
      };
      
      console.log('🔍 Token Debug State:', state);
      return state;
    }
    return null;
  }
};

// CORRECTED API methods
export const apiMethods = {
  // Admin Operations - CORRECTED to match your adminRoutes
  adminLogin: async (credentials) => {
    try {
      console.log('🔄 Attempting admin login');
      const response = await api.post(endpoints.admin.login, credentials);
      console.log('✅ Admin login response received');
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
  
  // CORRECTED: Try multiple dashboard endpoints
  getDashboardStats: async () => {
    try {
      // First try the main dashboard endpoint
      const response = await api.get(endpoints.admin.dashboard);
      return response;
    } catch (error) {
      console.log('Main dashboard endpoint failed, trying stats endpoint...');
      // Fallback to stats endpoint
      const response = await api.get(endpoints.admin.dashboardStats);
      return response;
    }
  },

  // Enhanced Auth Operations
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
  getTeacherProfile: () => api.get(endpoints.teachers.getProfile),
  updateTeacherProfile: (data) => api.put(endpoints.teachers.updateProfile, data),

  // Health check
  healthCheck: () => api.get(endpoints.health),
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  window.tokenManager = tokenManager;
  window.apiMethods = apiMethods;
  window.api = api;
  
  console.log('🛠️ Development mode: API utilities available on window object');
  console.log('🔧 API Base URL:', API_BASE_URL);
}

export default api;