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

// ✅ ENHANCED: Safe storage utility that handles localStorage, sessionStorage, and memory fallback
const createSafeStorage = () => {
  // Check if localStorage is available
  const isLocalStorageAvailable = (() => {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
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
      return false;
    }
  })();

  // Memory fallback for environments where storage APIs aren't available
  let memoryStorage = {
    userToken: null,
    teacherToken: null,
    adminToken: null,
    userData: null,
    teacherData: null,
    userRole: null
  };

  // Make memory storage globally accessible for debugging
  if (typeof window !== 'undefined') {
    window.memoryStorage = memoryStorage;
  }

  const storage = {
    // Get item with fallback chain: localStorage -> sessionStorage -> memory
    getItem: (key) => {
      try {
        if (isLocalStorageAvailable) {
          const item = localStorage.getItem(key);
          if (item !== null) return item;
        }
        
        if (isSessionStorageAvailable) {
          const item = sessionStorage.getItem(key);
          if (item !== null) return item;
        }
        
        return memoryStorage[key] || null;
      } catch (error) {
        console.warn(`Error getting item ${key}:`, error);
        return memoryStorage[key] || null;
      }
    },

    // Set item with primary storage preference
    setItem: (key, value, persistent = true) => {
      try {
        // Update memory storage first
        memoryStorage[key] = value;

        // Try localStorage first if persistent and available
        if (persistent && isLocalStorageAvailable) {
          localStorage.setItem(key, value);
          console.log(`✅ Stored ${key} in localStorage`);
          return true;
        }
        
        // Fallback to sessionStorage if available
        if (isSessionStorageAvailable) {
          sessionStorage.setItem(key, value);
          console.log(`✅ Stored ${key} in sessionStorage`);
          return true;
        }
        
        // Memory storage as final fallback
        console.log(`✅ Stored ${key} in memory storage (localStorage/sessionStorage not available)`);
        return true;
      } catch (error) {
        console.warn(`Error setting item ${key}:`, error);
        // Ensure memory storage is updated even if other storage fails
        memoryStorage[key] = value;
        return false;
      }
    },

    // Remove item from all storage types
    removeItem: (key) => {
      try {
        memoryStorage[key] = null;

        if (isLocalStorageAvailable) {
          localStorage.removeItem(key);
        }
        
        if (isSessionStorageAvailable) {
          sessionStorage.removeItem(key);
        }
        
        console.log(`🗑️ Removed ${key} from all storage`);
      } catch (error) {
        console.warn(`Error removing item ${key}:`, error);
        memoryStorage[key] = null;
      }
    },

    // Clear all storage
    clear: () => {
      try {
        // Clear memory storage
        memoryStorage = {
          userToken: null,
          teacherToken: null,
          adminToken: null,
          userData: null,
          teacherData: null,
          userRole: null
        };

        // Clear localStorage keys
        if (isLocalStorageAvailable) {
          const keysToRemove = [
            'userToken', 'teacherToken', 'adminToken', 
            'userData', 'teacherData', 'userRole'
          ];
          keysToRemove.forEach(key => localStorage.removeItem(key));
        }

        // Clear sessionStorage keys
        if (isSessionStorageAvailable) {
          const keysToRemove = [
            'userToken', 'teacherToken', 'adminToken', 
            'userData', 'teacherData', 'userRole'
          ];
          keysToRemove.forEach(key => sessionStorage.removeItem(key));
        }

        console.log('🧹 Cleared all storage');
      } catch (error) {
        console.warn('Error clearing storage:', error);
      }
    },

    // Get storage info for debugging
    getStorageInfo: () => {
      return {
        localStorageAvailable: isLocalStorageAvailable,
        sessionStorageAvailable: isSessionStorageAvailable,
        memoryFallbackActive: !isLocalStorageAvailable && !isSessionStorageAvailable,
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

// ✅ ENHANCED: Token manager with proper localStorage integration
export const tokenManager = {
  // ✅ User token methods
  setUserToken: (token, persistent = true) => {
    console.log('🔧 setUserToken called with:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      persistent,
      timestamp: new Date().toISOString()
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
  
  // ✅ FIXED: Enhanced teacher token methods with localStorage
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

  // ✅ FIXED: Enhanced teacher data management with localStorage
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
        console.log('✅ Teacher data stored successfully');
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
      error: result ? null : 'Failed to store token in storage' 
    };
  }
};

// API methods (keeping existing structure but adding enhanced error handling)
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

  // Other API methods remain the same...
  // (keeping existing methods for brevity)
};

// Constants (keeping existing)
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

export default api;