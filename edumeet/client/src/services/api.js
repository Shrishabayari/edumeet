import axios from 'axios';

// Prioritize environment variable, then remote server, then local development server
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? 'https://edumeet.onrender.com/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ FIXED: Enhanced storage utility that prioritizes localStorage
const createSafeStorage = () => {
  // Check if localStorage is available
  const isLocalStorageAvailable = (() => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('localStorage not available:', e);
      return false;
    }
  })();

  // Check if sessionStorage is available
  const isSessionStorageAvailable = (() => {
    try {
      const testKey = '__sessionStorage_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('sessionStorage not available:', e);
      return false;
    }
  })();

  // Memory fallback ONLY for extreme cases where both storage APIs fail
  let memoryStorage = {};

  // Make memory storage globally accessible for debugging
  if (typeof window !== 'undefined') {
    window.memoryStorage = memoryStorage;
  }

  const storage = {
    // Get item with preference: localStorage -> sessionStorage -> memory
    getItem: (key) => {
      try {
        // Always try localStorage first
        if (isLocalStorageAvailable) {
          const item = localStorage.getItem(key);
          if (item !== null) {
            console.log(`🔍 Found ${key} in localStorage`);
            return item;
          }
        }
        
        // Then sessionStorage
        if (isSessionStorageAvailable) {
          const item = sessionStorage.getItem(key);
          if (item !== null) {
            console.log(`🔍 Found ${key} in sessionStorage`);
            return item;
          }
        }
        
        // Finally memory (only if both storage APIs failed)
        const memoryItem = memoryStorage[key];
        if (memoryItem !== undefined && memoryItem !== null) {
          console.log(`🔍 Found ${key} in memory storage (fallback)`);
          return memoryItem;
        }
        
        return null;
      } catch (error) {
        console.error(`Error getting item ${key}:`, error);
        return memoryStorage[key] || null;
      }
    },

    // Set item with localStorage preference
    setItem: (key, value, persistent = true) => {
      let success = false;
      
      try {
        // Always update memory storage as backup
        memoryStorage[key] = value;

        // For persistent storage (remember me), use localStorage if available
        if (persistent && isLocalStorageAvailable) {
          localStorage.setItem(key, value);
          console.log(`✅ Stored ${key} in localStorage (persistent)`);
          success = true;
        }
        // For non-persistent or if localStorage fails, use sessionStorage
        else if (!persistent && isSessionStorageAvailable) {
          sessionStorage.setItem(key, value);
          console.log(`✅ Stored ${key} in sessionStorage (session only)`);
          success = true;
        }
        // If localStorage not available but persistent requested, try sessionStorage
        else if (persistent && !isLocalStorageAvailable && isSessionStorageAvailable) {
          sessionStorage.setItem(key, value);
          console.warn(`⚠️ localStorage not available, stored ${key} in sessionStorage instead`);
          success = true;
        }
        
        // If no browser storage is available, memory is the only option
        if (!success && !isLocalStorageAvailable && !isSessionStorageAvailable) {
          console.warn(`⚠️ No browser storage available, stored ${key} in memory only`);
          success = true; // Memory storage always "succeeds"
        }
        
        return success;
      } catch (error) {
        console.error(`Error setting item ${key}:`, error);
        // Ensure memory storage is updated even if other storage fails
        memoryStorage[key] = value;
        return false;
      }
    },

    // Remove item from all storage locations
    removeItem: (key) => {
      try {
        // Clear from memory
        delete memoryStorage[key];

        // Clear from localStorage
        if (isLocalStorageAvailable) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removed ${key} from localStorage`);
        }
        
        // Clear from sessionStorage
        if (isSessionStorageAvailable) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removed ${key} from sessionStorage`);
        }
        
      } catch (error) {
        console.error(`Error removing item ${key}:`, error);
        delete memoryStorage[key];
      }
    },

    // Clear all auth-related storage
    clear: () => {
      try {
        // Clear memory storage
        memoryStorage = {};

        // Clear auth-related keys from localStorage
        if (isLocalStorageAvailable) {
          const authKeys = [
            'userToken', 'teacherToken', 'adminToken', 
            'userData', 'teacherData', 'userRole'
          ];
          authKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🧹 Cleared ${key} from localStorage`);
          });
        }

        // Clear auth-related keys from sessionStorage
        if (isSessionStorageAvailable) {
          const authKeys = [
            'userToken', 'teacherToken', 'adminToken', 
            'userData', 'teacherData', 'userRole'
          ];
          authKeys.forEach(key => {
            sessionStorage.removeItem(key);
            console.log(`🧹 Cleared ${key} from sessionStorage`);
          });
        }

        console.log('✅ All auth storage cleared');
      } catch (error) {
        console.error('Error clearing storage:', error);
        memoryStorage = {};
      }
    },

    // Get storage info for debugging
    getStorageInfo: () => {
      return {
        localStorageAvailable: isLocalStorageAvailable,
        sessionStorageAvailable: isSessionStorageAvailable,
        memoryFallbackActive: !isLocalStorageAvailable && !isSessionStorageAvailable,
        preferredStorage: isLocalStorageAvailable ? 'localStorage' : isSessionStorageAvailable ? 'sessionStorage' : 'memory',
        currentMemoryStorage: { ...memoryStorage }
      };
    }
  };

  return storage;
};

// Initialize safe storage
const safeStorage = createSafeStorage();

// Helper function to get token from storage with proper key mapping
const getTokenFromStorage = (tokenType = 'userToken') => {
  const token = safeStorage.getItem(tokenType);
  
  if (process.env.NODE_ENV === 'development' && token) {
    console.log(`🔍 Found ${tokenType}: ${token.substring(0, 20)}...`);
  }
  
  return token;
};

// Request interceptor with proper token handling and detailed logging
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL
    if (config.url.startsWith('/admin')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers')) {
      token = getTokenFromStorage('teacherToken');
    } else {
      // For appointment routes and other routes, use teacherToken if available, otherwise userToken
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 Token added to request: ${config.method?.toUpperCase()} ${config.url}`);
      console.log(`   Token: ${token.substring(0, 20)}...`);
    } else {
      console.log(`⚠️  No token found for request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      console.log(`   Headers:`, {
        'Content-Type': config.headers['Content-Type'],
        'Authorization': config.headers.Authorization ? 'Present' : 'Missing'
      });
      if (config.data) {
        console.log(`   Body:`, config.data);
      }
    }
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor with better error handling
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
          console.warn('🔒 Unauthorized: Token expired or invalid');
          
          // Clear appropriate tokens based on the request URL
          if (config.url.startsWith('/admin')) {
            tokenManager.removeAdminToken();
            if (window.location.pathname.startsWith('/admin')) {
              window.location.href = '/admin/login';
            }
          } else if (config.url.startsWith('/teachers') || config.url.includes('/appointments/')) {
            tokenManager.removeTeacherToken();
            if (window.location.pathname.startsWith('/teacher')) {
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

      // Return a more specific error message
      const errorMessage = data?.message || data?.error || `HTTP Error ${status}`;
      return Promise.reject(new Error(errorMessage));

    } else if (error.request) {
      console.error('🌐 Network Error: No response received:', error.request);
      return Promise.reject(new Error('Network error: Unable to connect to server. Please check your internet connection.'));
    } else {
      console.error('⚙️ Request Setup Error:', error.message);
      return Promise.reject(new Error(`Request configuration error: ${error.message}`));
    }
  }
);

// API endpoints (keeping existing structure)
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

// ✅ FIXED: Token manager with localStorage priority
export const tokenManager = {
  // ✅ User token methods
  setUserToken: (token, persistent = true) => {
    console.log('🔧 setUserToken called with:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      persistent,
      timestamp: new Date().toISOString(),
      storageInfo: safeStorage.getStorageInfo()
    });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setUserToken');
      return false;
    }
    
    return safeStorage.setItem('userToken', token.trim(), persistent);
  },
  
  getUserToken: () => {
    const token = safeStorage.getItem('userToken');
    if (process.env.NODE_ENV === 'development' && token) {
      console.log('🔍 Retrieved user token:', token.substring(0, 20) + '...');
    }
    return token;
  },
  
  removeUserToken: () => {
    console.log('🗑️ Removing user token');
    safeStorage.removeItem('userToken');
    safeStorage.removeItem('userData');
    safeStorage.removeItem('userRole');
    console.log('✅ User token and data cleared');
  },
  
  // ✅ FIXED: Teacher token methods with localStorage priority
  setTeacherToken: (token, persistent = true) => {
    console.log('🔧 setTeacherToken called with:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      persistent,
      timestamp: new Date().toISOString(),
      storageInfo: safeStorage.getStorageInfo()
    });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setTeacherToken');
      return false;
    }
    
    const result = safeStorage.setItem('teacherToken', token.trim(), persistent);
    
    if (result) {
      console.log('✅ Teacher token stored successfully');
      // Verify storage immediately
      const stored = safeStorage.getItem('teacherToken');
      if (stored) {
        console.log('✅ Token verified in storage:', stored.substring(0, 20) + '...');
      } else {
        console.error('❌ Token not found immediately after storage');
      }
    } else {
      console.error('❌ Failed to store teacher token');
    }
    
    return result;
  },
  
  getTeacherToken: () => {
    const token = safeStorage.getItem('teacherToken');
    if (process.env.NODE_ENV === 'development' && token) {
      console.log('🔍 Retrieved teacher token:', token.substring(0, 20) + '...');
    }
    return token;
  },
  
  removeTeacherToken: () => {
    console.log('🗑️ Removing teacher token');
    safeStorage.removeItem('teacherToken');
    safeStorage.removeItem('teacherData');
    console.log('✅ Teacher token and data cleared');
  },

  // ✅ FIXED: Teacher data management with localStorage priority
  setTeacherData: (teacherData, persistent = true) => {
    console.log('💾 setTeacherData called with:', teacherData);
    
    if (!teacherData || typeof teacherData !== 'object') {
      console.error('❌ Invalid teacher data provided to setTeacherData');
      return false;
    }
    
    try {
      const teacherDataString = JSON.stringify(teacherData);
      const result = safeStorage.setItem('teacherData', teacherDataString, persistent);
      
      if (result) {
        console.log('✅ Teacher data stored successfully in localStorage');
      } else {
        console.error('❌ Failed to store teacher data');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error serializing teacher data:', error);
      return false;
    }
  },

  getTeacherData: () => {
    try {
      const teacherDataString = safeStorage.getItem('teacherData');
      if (teacherDataString && typeof teacherDataString === 'string') {
        const parsed = JSON.parse(teacherDataString);
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Retrieved teacher data:', parsed);
        }
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error parsing teacher data:', error);
      safeStorage.removeItem('teacherData');
    }
    return null;
  },

  // ✅ FIXED: Get teacher ID from token payload (JWT decode)
  getTeacherId: () => {
    try {
      const token = tokenManager.getTeacherToken();
      if (!token) return null;

      // Decode JWT payload (basic decode without verification)
      const payload = token.split('.')[1];
      if (!payload) return null;

      const decoded = JSON.parse(atob(payload));
      return decoded.teacherId || decoded.id || decoded.sub || null;
    } catch (error) {
      console.error('❌ Error decoding teacher token:', error);
      return null;
    }
  },
  
  // Admin token methods
  setAdminToken: (token, persistent = true) => {
    console.log('🔧 setAdminToken called with:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      persistent,
      timestamp: new Date().toISOString()
    });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setAdminToken');
      return false;
    }
    
    return safeStorage.setItem('adminToken', token.trim(), persistent);
  },
  
  getAdminToken: () => {
    const token = safeStorage.getItem('adminToken');
    if (process.env.NODE_ENV === 'development' && token) {
      console.log('🔍 Retrieved admin token:', token.substring(0, 20) + '...');
    }
    return token;
  },
  
  removeAdminToken: () => {
    console.log('🗑️ Removing admin token');
    safeStorage.removeItem('adminToken');
    console.log('✅ Admin token cleared');
  },
  
  clearAllTokens: () => {
    console.log('🧹 Clearing all tokens and user data');
    safeStorage.clear();
    console.log('✅ All tokens and data cleared');
  },

  // ✅ Helper methods for user state management
  isUserLoggedIn: () => {
    const token = safeStorage.getItem('userToken');
    const hasToken = !!(token && token.trim());
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 User login status:', hasToken);
    }
    return hasToken;
  },

  isTeacherLoggedIn: () => {
    const token = safeStorage.getItem('teacherToken');
    const hasToken = !!(token && token.trim());
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Teacher login status:', hasToken);
    }
    return hasToken;
  },

  isAdminLoggedIn: () => {
    const token = safeStorage.getItem('adminToken');
    const hasToken = !!(token && token.trim());
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Admin login status:', hasToken);
    }
    return hasToken;
  },

  getCurrentUser: () => {
    try {
      const userData = safeStorage.getItem('userData');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  getCurrentTeacher: () => {
    try {
      const teacherData = safeStorage.getItem('teacherData');
      return teacherData ? JSON.parse(teacherData) : null;
    } catch (error) {
      console.error('Error parsing teacher data:', error);
      return null;
    }
  },

  getCurrentUserRole: () => {
    return safeStorage.getItem('userRole');
  },

  // Method to get current authenticated user info
  getCurrentAuthenticatedUser: () => {
    const teacher = tokenManager.getCurrentTeacher();
    const user = tokenManager.getCurrentUser();
    
    if (teacher && tokenManager.isTeacherLoggedIn()) {
      return { ...teacher, role: 'teacher', type: 'teacher' };
    } else if (user && tokenManager.isUserLoggedIn()) {
      return { ...user, role: user.role || 'student', type: 'user' };
    }
    
    return null;
  },

  // Enhanced login status checker
  getAuthenticationStatus: () => {
    return {
      isTeacherLoggedIn: tokenManager.isTeacherLoggedIn(),
      isUserLoggedIn: tokenManager.isUserLoggedIn(),
      isAdminLoggedIn: tokenManager.isAdminLoggedIn(),
      hasAnyAuth: tokenManager.isTeacherLoggedIn() || tokenManager.isUserLoggedIn() || tokenManager.isAdminLoggedIn(),
      currentUser: tokenManager.getCurrentAuthenticatedUser(),
      storageInfo: safeStorage.getStorageInfo()
    };
  },

  // ✅ Enhanced debug method to check storage state
  getStorageState: () => {
    if (process.env.NODE_ENV === 'development') {
      const state = {
        hasUserToken: !!(safeStorage.getItem('userToken')),
        hasTeacherToken: !!(safeStorage.getItem('teacherToken')),
        hasAdminToken: !!(safeStorage.getItem('adminToken')),
        hasUserData: !!(safeStorage.getItem('userData')),
        hasTeacherData: !!(safeStorage.getItem('teacherData')),
        userRole: safeStorage.getItem('userRole'),
        teacherTokenLength: safeStorage.getItem('teacherToken')?.length || 0,
        storageInfo: safeStorage.getStorageInfo()
      };
      console.log('🔍 Current storage state:', state);
      return state;
    }
    return null;
  },

  // Enhanced debug method specifically for tokens
  debugTokenState: () => {
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 Token Debug Information');
      
      const teacherToken = safeStorage.getItem('teacherToken');
      const userData = safeStorage.getItem('teacherData');
      
      console.log('Teacher Token:', teacherToken ? `${teacherToken.substring(0, 30)}...` : 'Not found');
      console.log('Teacher Data:', userData ? JSON.parse(userData) : 'Not found');
      console.log('Storage Info:', safeStorage.getStorageInfo());
      
      if (teacherToken) {
        try {
          const payload = JSON.parse(atob(teacherToken.split('.')[1]));
          console.log('Token Payload:', payload);
          console.log('Token Expiry:', new Date(payload.exp * 1000));
          console.log('Current Time:', new Date());
          console.log('Token Valid:', payload.exp * 1000 > Date.now());
        } catch (e) {
          console.error('Error decoding token:', e);
        }
      }
      
      console.groupEnd();
    }
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

  // Method to safely store token with validation
  safeSetTeacherToken: (token, persistent = true) => {
    const validation = tokenManager.validateTokenFormat(token);
    if (!validation.valid) {
      console.error('❌ Token validation failed:', validation.error);
      return { success: false, error: validation.error };
    }
    
    const result = tokenManager.setTeacherToken(token, persistent);
    return { 
      success: result, 
      error: result ? null : 'Failed to store token in localStorage' 
    };
  }
};

// ✅ Enhanced API methods with complete teacher endpoints
export const apiMethods = {
  // Enhanced teacherLogin with proper token storage
  teacherLogin: async (credentials) => {
    try {
      console.log('🔄 Attempting teacher login...');
      const response = await api.post(endpoints.teachers.login, credentials);
      console.log('✅ Login Response:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Teacher login error:', error);
      throw error;
    }
  },

  // Teacher logout
  teacherLogout: async () => {
    try {
      console.log('🔄 Attempting teacher logout...');
      const response = await api.post(endpoints.teachers.logout);
      console.log('✅ Logout Response:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Teacher logout error:', error);
      throw error;
    }
  },

  // Get teacher profile
  getTeacherProfile: async () => {
    try {
      console.log('🔄 Fetching teacher profile...');
      const response = await api.get(endpoints.teachers.profile);
      console.log('✅ Profile Response:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Get teacher profile error:', error);
      throw error;
    }
  },

  // Update teacher profile
  updateTeacherProfile: async (profileData) => {
    try {
      console.log('🔄 Updating teacher profile...');
      const response = await api.put(endpoints.teachers.profile, profileData);
      console.log('✅ Profile Update Response:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Update teacher profile error:', error);
      throw error;
    }
  },

  // Get all teachers
  getAllTeachers: async () => {
    try {
      const response = await api.get(endpoints.teachers.getAll);
      return response;
    } catch (error) {
      console.error('❌ Get all teachers error:', error);
      throw error;
    }
  },

  // User authentication methods
  userLogin: async (credentials) => {
    try {
      const response = await api.post(endpoints.auth.login, credentials);
      return response;
    } catch (error) {
      console.error('❌ User login error:', error);
      throw error;
    }
  },

  userLogout: async () => {
    try {
      const response = await api.post(endpoints.auth.logout);
      return response;
    } catch (error) {
      console.error('❌ User logout error:', error);
      throw error;
    }
  },

  // Admin authentication methods
  adminLogin: async (credentials) => {
    try {
      const response = await api.post(endpoints.admin.login, credentials);
      return response;
    } catch (error) {
      console.error('❌ Admin login error:', error);
      throw error;
    }
  },

  // Appointment methods
  getAppointments: async () => {
    try {
      const response = await api.get(endpoints.appointments.getAll);
      return response;
    } catch (error) {
      console.error('❌ Get appointments error:', error);
      throw error;
    }
  },

  createAppointment: async (appointmentData) => {
    try {
      const response = await api.post(endpoints.appointments.request, appointmentData);
      return response;
    } catch (error) {
      console.error('❌ Create appointment error:', error);
      throw error;
    }
  },

  // Book appointment (teacher creates available slot)
  bookAppointment: async (appointmentData) => {
    try {
      const response = await api.post(endpoints.appointments.book, appointmentData);
      return response;
    } catch (error) {
      console.error('❌ Book appointment error:', error);
      throw error;
    }
  },

  // Accept appointment request
  acceptAppointment: async (appointmentId) => {
    try {
      const response = await api.put(endpoints.appointments.accept(appointmentId));
      return response;
    } catch (error) {
      console.error('❌ Accept appointment error:', error);
      throw error;
    }
  },

  // Reject appointment request
  rejectAppointment: async (appointmentId, reason = '') => {
    try {
      const response = await api.put(endpoints.appointments.reject(appointmentId), { reason });
      return response;
    } catch (error) {
      console.error('❌ Reject appointment error:', error);
      throw error;
    }
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId, reason = '') => {
    try {
      const response = await api.put(endpoints.appointments.cancel(appointmentId), { reason });
      return response;
    } catch (error) {
      console.error('❌ Cancel appointment error:', error);
      throw error;
    }
  },

  // Complete appointment
  completeAppointment: async (appointmentId, notes = '') => {
    try {
      const response = await api.put(endpoints.appointments.complete(appointmentId), { notes });
      return response;
    } catch (error) {
      console.error('❌ Complete appointment error:', error);
      throw error;
    }
  },

  // Get appointments by teacher
  getAppointmentsByTeacher: async (teacherId) => {
    try {
      const response = await api.get(endpoints.appointments.getByTeacher(teacherId));
      return response;
    } catch (error) {
      console.error('❌ Get teacher appointments error:', error);
      throw error;
    }
  },

  // Get pending appointments for teacher
  getPendingAppointments: async (teacherId) => {
    try {
      const response = await api.get(endpoints.appointments.getTeacherPending(teacherId));
      return response;
    } catch (error) {
      console.error('❌ Get pending appointments error:', error);
      throw error;
    }
  },

  // Message methods
  getMessages: async (roomId) => {
    try {
      const response = await api.get(endpoints.messages.getByRoom(roomId));
      return response;
    } catch (error) {
      console.error('❌ Get messages error:', error);
      throw error;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const response = await api.delete(endpoints.messages.delete(messageId));
      return response;
    } catch (error) {
      console.error('❌ Delete message error:', error);
      throw error;
    }
  }
};