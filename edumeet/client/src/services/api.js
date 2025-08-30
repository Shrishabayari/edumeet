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

// ✅ FIXED: Enhanced memory storage with proper initialization
let memoryStorage = {
  userToken: null,
  teacherToken: null,
  adminToken: null,
  user: null,
  teacher: null,
  userRole: null
};

// ✅ CRITICAL: Make memoryStorage globally accessible for debugging
if (typeof window !== 'undefined') {
  window.memoryStorage = memoryStorage;
}

// Helper function to get token from memory storage
const getTokenFromStorage = (tokenType = 'userToken') => {
  const token = memoryStorage[tokenType];
  
  if (process.env.NODE_ENV === 'development' && token) {
    console.log(`🔍 Found ${tokenType} in memory storage`);
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

// CORRECTED: API endpoints with proper paths
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

// API methods with comprehensive error handling
export const apiMethods = {
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
  teacherLogin: (credentials) => api.post(endpoints.teachers.login, credentials),
  sendTeacherSetupLink: (data) => api.post(endpoints.teachers.sendSetupLink, data),
  setupTeacherAccount: (token, data) => api.post(endpoints.teachers.setupAccount(token), data),
  getTeacherProfile: () => api.get(endpoints.teachers.profile),
  teacherLogout: () => api.post(endpoints.teachers.logout),

  // Appointment Operations (keeping existing methods for compatibility)
  requestAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Student requesting appointment:', appointmentData);
      const response = await api.post(endpoints.appointments.request, appointmentData);
      console.log('✅ Appointment requested successfully:', response.data);
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
      console.log('✅ Teacher appointment booked successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Error booking teacher appointment:', error);
      throw error;
    }
  },

  // Enhanced acceptAppointmentRequest with comprehensive error handling
  acceptAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('\n🎯 FRONTEND: Starting appointment acceptance process');
      console.log('   Appointment ID:', id);
      console.log('   Response Message:', responseMessage);
      
      if (!id) {
        throw new Error('Appointment ID is required');
      }
      
      if (typeof id !== 'string' || id.length !== 24) {
        console.error('❌ Invalid ID format:', { id, type: typeof id, length: id?.length });
        throw new Error('Invalid appointment ID format');
      }
      
      const teacherToken = tokenManager.getTeacherToken();
      if (!teacherToken) {
        console.error('❌ No teacher token found');
        throw new Error('Authentication required. Please log in as a teacher.');
      }
      
      console.log('✅ Authentication token found');
      console.log('🔄 Making API request to:', endpoints.appointments.accept(id));
      
      const requestPayload = { 
        responseMessage: responseMessage?.trim() || '' 
      };
      
      console.log('📤 Request payload:', requestPayload);
      
      const response = await api.put(endpoints.appointments.accept(id), requestPayload);
      
      console.log('✅ FRONTEND: Appointment accepted successfully');
      console.log('📥 Response data:', response.data);
      
      return response;
      
    } catch (error) {
      console.error('\n❌ FRONTEND: Error accepting appointment');
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      
      if (error.response) {
        const { status, data } = error.response;
        console.error(`   HTTP Status: ${status}`);
        console.error('   Response data:', data);
        
        switch (status) {
          case 400:
            if (data.message?.includes('ID format')) {
              throw new Error('Invalid appointment ID. Please refresh the page and try again.');
            } else if (data.message?.includes('status')) {
              throw new Error('This appointment cannot be accepted. It may have already been processed.');
            } else {
              throw new Error(data.message || 'Invalid request. Please check the appointment details.');
            }
            
          case 401:
            tokenManager.removeTeacherToken();
            throw new Error('Your session has expired. Please log in again.');
            
          case 403:
            throw new Error('You do not have permission to accept this appointment.');
            
          case 404:
            throw new Error('Appointment not found. It may have already been processed or deleted.');
            
          case 409:
            throw new Error('This appointment has already been processed by another action.');
            
          case 429:
            throw new Error('Too many requests. Please wait a moment and try again.');
            
          case 500:
            throw new Error('Server error. Please try again in a few moments.');
            
          default:
            throw new Error(data.message || `Server error (${status}). Please try again.`);
        }
      } else if (error.request) {
        console.error('   Network error - no response received');
        throw new Error('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        console.error('   Request setup error:', error.message);
        throw new Error(error.message || 'An unexpected error occurred. Please try again.');
      }
    }
  },

  // Enhanced rejectAppointmentRequest
  rejectAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('\n🎯 FRONTEND: Starting appointment rejection process');
      console.log('   Appointment ID:', id);
      console.log('   Response Message:', responseMessage);
      
      if (!id) {
        throw new Error('Appointment ID is required');
      }
      
      if (typeof id !== 'string' || id.length !== 24) {
        console.error('❌ Invalid ID format:', { id, type: typeof id, length: id?.length });
        throw new Error('Invalid appointment ID format');
      }
      
      const teacherToken = tokenManager.getTeacherToken();
      if (!teacherToken) {
        console.error('❌ No teacher token found');
        throw new Error('Authentication required. Please log in as a teacher.');
      }
      
      console.log('✅ Authentication token found');
      console.log('🔄 Making API request to:', endpoints.appointments.reject(id));
      
      const requestPayload = { 
        responseMessage: responseMessage?.trim() || 'Request rejected by teacher' 
      };
      
      console.log('📤 Request payload:', requestPayload);
      
      const response = await api.put(endpoints.appointments.reject(id), requestPayload);
      
      console.log('✅ FRONTEND: Appointment rejected successfully');
      console.log('📥 Response data:', response.data);
      
      return response;
      
    } catch (error) {
      console.error('\n❌ FRONTEND: Error rejecting appointment');
      console.error('   Error type:', error.constructor.name);
      console.error('   Error message:', error.message);
      
      if (error.response) {
        const { status, data } = error.response;
        console.error(`   HTTP Status: ${status}`);
        console.error('   Response data:', data);
        
        // Provide user-friendly error messages
        switch (status) {
          case 400:
            if (data.message?.includes('ID format')) {
              throw new Error('Invalid appointment ID. Please refresh the page and try again.');
            } else if (data.message?.includes('status')) {
              throw new Error('This appointment cannot be rejected. It may have already been processed.');
            } else {
              throw new Error(data.message || 'Invalid request. Please check the appointment details.');
            }
            
          case 401:
            tokenManager.removeTeacherToken();
            throw new Error('Your session has expired. Please log in again.');
            
          case 403:
            throw new Error('You do not have permission to reject this appointment.');
            
          case 404:
            throw new Error('Appointment not found. It may have already been processed or deleted.');
            
          case 409:
            throw new Error('This appointment has already been processed by another action.');
            
          case 429:
            throw new Error('Too many requests. Please wait a moment and try again.');
            
          case 500:
            throw new Error('Server error. Please try again in a few moments.');
            
          default:
            throw new Error(data.message || `Server error (${status}). Please try again.`);
        }
      } else if (error.request) {
        console.error('   Network error - no response received');
        throw new Error('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        console.error('   Request setup error:', error.message);
        throw new Error(error.message || 'An unexpected error occurred. Please try again.');
      }
    }
  },

  completeAppointment: async (id) => {
    try {
      console.log(`🔄 Completing appointment: ${id}`);
      const response = await api.put(endpoints.appointments.complete(id));
      console.log('✅ Appointment completed successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Error completing appointment:', error);
      throw error;
    }
  },

  getAllAppointments: (params = {}) => api.get(endpoints.appointments.getAll, { params }),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  cancelAppointment: (id, reason = '') => api.put(endpoints.appointments.cancel(id), { reason }),
  getAppointmentStats: () => api.get(endpoints.appointments.getStats),

  // Teacher appointment methods
  getTeacherAppointments: async (teacherId, params = {}) => {
    try {
      console.log(`🔄 Fetching appointments for teacher: ${teacherId}`);
      const response = await api.get(endpoints.appointments.getByTeacher(teacherId), { params });
      console.log(`✅ Found ${response.data?.data?.length || 0} appointments for teacher`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher appointments:', error);
      throw error;
    }
  },

  getTeacherPendingRequests: async (teacherId) => {
    try {
      console.log(`🔄 Fetching pending requests for teacher: ${teacherId}`);
      const response = await api.get(endpoints.appointments.getTeacherPending(teacherId));
      console.log(`✅ Found ${response.data?.data?.length || 0} pending requests for teacher`);
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher pending requests:', error);
      throw error;
    }
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
  requestAppointmentWithRetry: async (appointmentData, maxRetries = 3) => {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Requesting appointment (attempt ${attempt}/${maxRetries})`);
        const response = await api.post(endpoints.appointments.request, appointmentData);
        console.log(`✅ Appointment requested successfully on attempt ${attempt}`);
        return response;
      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed:`, error.message);
        
        // Don't retry on client errors (400-499)
        if (error.response?.status >= 400 && error.response?.status < 500) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
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

// ✅ FIXED: Enhanced token manager with proper memory storage and validation
export const tokenManager = {
  // ✅ FIXED: User token methods with enhanced error handling and validation
  setUserToken: (token, persistent = false) => {
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
    
    memoryStorage.userToken = token.trim();
    console.log('✅ User token stored in memory successfully');
    return true;
  },
  
  getUserToken: () => {
    const token = memoryStorage.userToken;
    if (process.env.NODE_ENV === 'development' && token) {
      console.log('🔍 Retrieved user token:', token.substring(0, 20) + '...');
    }
    return token;
  },
  
  removeUserToken: () => {
    console.log('🗑️ Removing user token from memory');
    memoryStorage.userToken = null;
    memoryStorage.user = null;
    memoryStorage.userRole = null;
    console.log('✅ User token and data cleared from memory');
  },
  
  // ✅ FIXED: Enhanced teacher token methods with proper validation
  setTeacherToken: (token, persistent = false) => {
    console.log('🔧 setTeacherToken called with:', { 
      hasToken: !!token, 
      tokenLength: token?.length,
      persistent,
      timestamp: new Date().toISOString()
    });
    
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided to setTeacherToken');
      return false;
    }
    
    memoryStorage.teacherToken = token.trim();
    console.log('✅ Teacher token stored in memory successfully');
    return true;
  },
  
  getTeacherToken: () => {
    const token = memoryStorage.teacherToken;
    if (process.env.NODE_ENV === 'development' && token) {
      console.log('🔍 Retrieved teacher token:', token.substring(0, 20) + '...');
    }
    return token;
  },
  
  removeTeacherToken: () => {
    console.log('🗑️ Removing teacher token from memory');
    memoryStorage.teacherToken = null;
    memoryStorage.teacher = null;
    console.log('✅ Teacher token and data cleared from memory');
  },

  // ✅ FIXED: Enhanced teacher data management with validation
  setTeacherData: (teacherData) => {
    console.log('💾 setTeacherData called with:', teacherData);
    
    if (!teacherData || typeof teacherData !== 'object') {
      console.error('❌ Invalid teacher data provided to setTeacherData');
      return false;
    }
    
    try {
      const teacherDataString = JSON.stringify(teacherData);
      memoryStorage.teacher = teacherDataString;
      console.log('✅ Teacher data stored in memory successfully');
      return true;
    } catch (error) {
      console.error('❌ Error serializing teacher data:', error);
      return false;
    }
  },

  getTeacherData: () => {
    try {
      const teacherData = memoryStorage.teacher;
      if (teacherData && typeof teacherData === 'string') {
        const parsed = JSON.parse(teacherData);
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 Retrieved teacher data:', parsed);
        }
        return parsed;
      }
    } catch (error) {
      console.error('❌ Error parsing teacher data:', error);
      memoryStorage.teacher = null;
    }
    return null;
  },
  
  // Admin token methods
  setAdminToken: (token, persistent = false) => {
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
    
    memoryStorage.adminToken = token.trim();
    console.log('✅ Admin token stored in memory successfully');
    return true;
  },
  
  getAdminToken: () => {
    const token = memoryStorage.adminToken;
    if (process.env.NODE_ENV === 'development' && token) {
      console.log('🔍 Retrieved admin token:', token.substring(0, 20) + '...');
    }
    return token;
  },
  
  removeAdminToken: () => {
    console.log('🗑️ Removing admin token from memory');
    memoryStorage.adminToken = null;
    console.log('✅ Admin token cleared from memory');
  },
  
  clearAllTokens: () => {
    console.log('🧹 Clearing all tokens and user data');
    memoryStorage = {
      userToken: null,
      teacherToken: null,
      adminToken: null,
      user: null,
      teacher: null,
      userRole: null
    };
    // Update the global reference
    if (typeof window !== 'undefined') {
      window.memoryStorage = memoryStorage;
    }
    console.log('✅ All tokens and data cleared from memory');
  },

  // ✅ FIXED: Helper methods for user state management with proper validation
  isUserLoggedIn: () => {
    const hasToken = !!(memoryStorage.userToken && memoryStorage.userToken.trim());
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 User login status:', hasToken);
    }
    return hasToken;
  },

  isTeacherLoggedIn: () => {
    const hasToken = !!(memoryStorage.teacherToken && memoryStorage.teacherToken.trim());
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Teacher login status:', hasToken);
    }
    return hasToken;
  },

  isAdminLoggedIn: () => {
    const hasToken = !!(memoryStorage.adminToken && memoryStorage.adminToken.trim());
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Admin login status:', hasToken);
    }
    return hasToken;
  },

  getCurrentUser: () => {
    try {
      return memoryStorage.user ? JSON.parse(memoryStorage.user) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  },

  getCurrentTeacher: () => {
    try {
      return memoryStorage.teacher ? JSON.parse(memoryStorage.teacher) : null;
    } catch (error) {
      console.error('Error parsing teacher data:', error);
      return null;
    }
  },

  getCurrentUserRole: () => {
    return memoryStorage.userRole;
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
      currentUser: tokenManager.getCurrentAuthenticatedUser()
    };
  },

  // ✅ FIXED: Enhanced debug method to check storage state
  getStorageState: () => {
    if (process.env.NODE_ENV === 'development') {
      const state = {
        hasUserToken: !!(memoryStorage.userToken && memoryStorage.userToken.trim()),
        hasTeacherToken: !!(memoryStorage.teacherToken && memoryStorage.teacherToken.trim()),
        hasAdminToken: !!(memoryStorage.adminToken && memoryStorage.adminToken.trim()),
        hasUserData: !!memoryStorage.user,
        hasTeacherData: !!memoryStorage.teacher,
        userRole: memoryStorage.userRole,
        teacherTokenLength: memoryStorage.teacherToken ? memoryStorage.teacherToken.length : 0,
        teacherDataKeys: memoryStorage.teacher ? Object.keys(JSON.parse(memoryStorage.teacher) || {}).length : 0,
        memoryStorageKeys: Object.keys(memoryStorage)
      };
      console.log('🔍 Current storage state:', state);
      return state;
    }
    return null;
  },

  // ✅ NEW: Method to validate token format
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

  // ✅ NEW: Method to safely store token with validation
  safeSetTeacherToken: (token, persistent = false) => {
    const validation = tokenManager.validateTokenFormat(token);
    if (!validation.valid) {
      console.error('❌ Token validation failed:', validation.error);
      return { success: false, error: validation.error };
    }
    
    const result = tokenManager.setTeacherToken(token, persistent);
    return { 
      success: result, 
      error: result ? null : 'Failed to store token in memory storage' 
    };
  }
};

// Constants (keeping existing for compatibility)
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

// ✅ FIXED: Create API client function for backward compatibility
export const createApiClient = () => {
  const handleErrors = async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(JSON.stringify({
        status: response.status,
        message: data.message || `Request failed with status ${response.status}`,
        errors: data.errors || undefined,
        data,
      }));
    }
    return data;
  };

  const request = async (method, endpoint, body = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Get token from memory storage instead of localStorage
    const token = tokenManager.getTeacherToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 API Request: ${method} ${API_BASE_URL}${endpoint}`);
        if (token) {
          console.log(`   Token Used: ${token.substring(0, 20)}...`);
        } else {
          console.log('   No token sent for this request.');
        }
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const result = await handleErrors(response);

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API Response: ${response.status} ${endpoint}`);
        console.log('Response data:', result);
      }
      return result;
    } catch (error) {
      console.error('❌ API Error:', error);

      let parsedError = {};
      try {
        parsedError = JSON.parse(error.message);
      } catch {
        parsedError = { message: error.message || 'An unknown error occurred.' };
      }

      if (parsedError.status === 401) {
        console.warn('Unauthorized: Token expired or invalid. Clearing tokens and redirecting to login.');
        tokenManager.removeTeacherToken();
        window.location.href = '/teacher/login';
      }
      
      throw parsedError; 
    }
  };

  return {
    post: (endpoint, body) => request('POST', endpoint, body),
    get: (endpoint) => request('GET', endpoint),
    put: (endpoint, body) => request('PUT', endpoint, body),
    delete: (endpoint) => request('DELETE', endpoint),
  };
};

export default api;