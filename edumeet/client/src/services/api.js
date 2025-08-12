import axios from 'axios';

// Prioritize environment variable, then remote server, then local development server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com' || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout to 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// FIXED: Helper function to get token from either storage location
const getTokenFromStorage = (tokenType = 'userToken') => {
  // First check localStorage, then sessionStorage
  let token = localStorage.getItem(tokenType);
  if (!token) {
    token = sessionStorage.getItem(tokenType);
  }
  
  if (process.env.NODE_ENV === 'development' && token) {
    console.log(`🔍 Found ${tokenType} in ${localStorage.getItem(tokenType) ? 'localStorage' : 'sessionStorage'}`);
  }
  
  return token;
};

// Request interceptor - FIXED to check both storage locations
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL
    if (config.url.startsWith('/admin')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers')) {
      token = getTokenFromStorage('teacherToken');
    } else {
      token = getTokenFromStorage('userToken');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

// Response interceptor - FIXED to clear tokens from both storage locations
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

      switch (status) {
        case 401:
          console.warn('Unauthorized: Token expired or invalid. Attempting redirection.');
          if (config.url.startsWith('/admin')) {
            tokenManager.removeAdminToken();
            window.location.href = '/admin/login';
          } else if (config.url.startsWith('/teachers')) {
            tokenManager.removeTeacherToken();
            window.location.href = '/teacher/login';
          } else {
            tokenManager.removeUserToken();
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access forbidden: You do not have permission to perform this action.');
          break;
        case 404:
          console.error('API endpoint not found:', error.config.url);
          break;
        case 500:
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

// API endpoints object
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

  // Updated appointment endpoints with new workflow
  appointments: {
    // General appointment routes
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    getStats: '/appointments/stats',
    
    // Student workflow - request appointment (needs teacher approval)
    request: '/appointments/request',
    
    // Teacher workflow - direct booking (no approval needed)
    book: '/appointments/book',
    
    // Teacher response routes - CRITICAL ENDPOINTS
    accept: (id) => `/appointments/${id}/accept`,
    reject: (id) => `/appointments/${id}/reject`,
    complete: (id) => `/appointments/${id}/complete`,
    
    // Common routes
    update: (id) => `/appointments/${id}`,
    cancel: (id) => `/appointments/${id}/cancel`,
    
    // Teacher-specific routes
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
    getPendingRegistrations: '/auth/admin/pending',
    getAllUsers: '/auth/admin/users',
    approveUser: (id) => `/auth/admin/approve/${id}`,
    rejectUser: (id) => `/auth/admin/reject/${id}`,
  },
  messages: {
    getByRoom: (roomId) => `/messages/room/${roomId}`,
    delete: (id) => `/messages/${id}`,
    getRoomStats: (roomId) => `/messages/room/${roomId}/stats`
  }
};

// API methods
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

  // FIXED: Appointment Operations with better error handling and validation
  requestAppointment: (appointmentData) => {
    console.log('🔄 Student requesting appointment:', appointmentData);
    return api.post(endpoints.appointments.request, appointmentData);
  },

  teacherBookAppointment: (appointmentData) => {
    console.log('🔄 Teacher booking appointment directly:', appointmentData);
    return api.post(endpoints.appointments.book, appointmentData);
  },

  // CRITICAL FIX: Simplified and more reliable accept/reject methods
  acceptAppointmentRequest: async (appointmentId, responseMessage = '') => {
    try {
      console.log('🔄 Accepting appointment request:', { appointmentId, responseMessage });
      
      // Validate ID format
      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }
      
      if (typeof appointmentId === 'string' && appointmentId.length !== 24) {
        throw new Error('Invalid appointment ID format');
      }
      
      // Prepare request data
      const requestData = { 
        responseMessage: responseMessage?.trim() || '' 
      };
      
      console.log('Making API call to:', endpoints.appointments.accept(appointmentId));
      console.log('Request data:', requestData);
      
      // Make the API call with proper error handling
      const response = await api.put(endpoints.appointments.accept(appointmentId), requestData);
      
      console.log('✅ Appointment accepted successfully:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ Error accepting appointment:', error);
      
      // Enhanced error handling with specific messages
      if (error.response) {
        const { status, data } = error.response;
        console.error(`HTTP ${status}:`, data);
        
        let errorMessage = data?.message || `Server error (${status})`;
        
        switch (status) {
          case 400:
            errorMessage = data?.message || 'Invalid request data';
            break;
          case 401:
            errorMessage = 'Authentication required. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to accept this appointment';
            break;
          case 404:
            errorMessage = 'Appointment not found or may have been already processed';
            break;
          case 409:
            errorMessage = 'Appointment has already been processed';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
        }
        
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  },

  // CRITICAL FIX: Simplified and more reliable reject method
  rejectAppointmentRequest: async (appointmentId, responseMessage = '') => {
    try {
      console.log('🔄 Rejecting appointment request:', { appointmentId, responseMessage });
      
      // Validate ID format
      if (!appointmentId) {
        throw new Error('Appointment ID is required');
      }
      
      if (typeof appointmentId === 'string' && appointmentId.length !== 24) {
        throw new Error('Invalid appointment ID format');
      }
      
      // Prepare request data
      const requestData = { 
        responseMessage: responseMessage?.trim() || 'Request rejected by teacher'
      };
      
      console.log('Making API call to:', endpoints.appointments.reject(appointmentId));
      console.log('Request data:', requestData);
      
      // Make the API call with proper error handling
      const response = await api.put(endpoints.appointments.reject(appointmentId), requestData);
      
      console.log('✅ Appointment rejected successfully:', response.data);
      return response;
      
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      
      if (error.response) {
        const { status, data } = error.response;
        console.error(`HTTP ${status}:`, data);
        
        let errorMessage = data?.message || `Server error (${status})`;
        
        switch (status) {
          case 400:
            errorMessage = data?.message || 'Invalid request data';
            break;
          case 401:
            errorMessage = 'Authentication required. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to reject this appointment';
            break;
          case 404:
            errorMessage = 'Appointment not found or may have been already processed';
            break;
          case 409:
            errorMessage = 'Appointment has already been processed';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
        }
        
        throw new Error(errorMessage);
      } else if (error.request) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      } else {
        throw new Error(error.message || 'An unexpected error occurred');
      }
    }
  },

  // Keep the retry methods for backward compatibility but use the simplified versions above
  acceptAppointmentWithRetry: async (appointmentId, responseMessage = '') => {
    return apiMethods.acceptAppointmentRequest(appointmentId, responseMessage);
  },

  rejectAppointmentWithRetry: async (appointmentId, responseMessage = '') => {
    return apiMethods.rejectAppointmentRequest(appointmentId, responseMessage);
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

  // Enhanced appointment booking with better error handling
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
        
        if (error.response?.status === 400 || error.response?.status === 409) {
          break; // Don't retry client errors
        }
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('All appointment request attempts failed');
  },

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

  searchAppointments: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.appointments.getAll, { params });
  },

  searchTeachers: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.teachers.getAll, { params });
  },

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

// FIXED: Token management utilities - now handle both storage types
export const tokenManager = {
  // User token methods - FIXED to handle both storage types
  setUserToken: (token, persistent = false) => {
    console.log('🔧 setUserToken called with:', { token: token?.substring(0, 20) + '...', persistent });
    
    if (persistent) {
      localStorage.setItem('userToken', token);
      sessionStorage.removeItem('userToken'); // Clear from session
      console.log('✅ Token stored in localStorage');
    } else {
      sessionStorage.setItem('userToken', token);
      localStorage.removeItem('userToken'); // Clear from localStorage  
      console.log('✅ Token stored in sessionStorage');
    }
  },
  
  getUserToken: () => getTokenFromStorage('userToken'),
  
  removeUserToken: () => {
    localStorage.removeItem('userToken');
    sessionStorage.removeItem('userToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('userRole');
  },
  
  // Admin token methods - FIXED to handle both storage types
  setAdminToken: (token, persistent = false) => {
    if (persistent) {
      localStorage.setItem('adminToken', token);
      sessionStorage.removeItem('adminToken');
    } else {
      sessionStorage.setItem('adminToken', token);
      localStorage.removeItem('adminToken');
    }
  },
  
  getAdminToken: () => getTokenFromStorage('adminToken'),
  
  removeAdminToken: () => {
    localStorage.removeItem('adminToken');
    sessionStorage.removeItem('adminToken');
  },
  
  // Teacher token methods - FIXED to handle both storage types
  setTeacherToken: (token, persistent = false) => {
    if (persistent) {
      localStorage.setItem('teacherToken', token);
      sessionStorage.removeItem('teacherToken');
    } else {
      sessionStorage.setItem('teacherToken', token);
      localStorage.removeItem('teacherToken');
    }
  },
  
  getTeacherToken: () => getTokenFromStorage('teacherToken'),
  
  removeTeacherToken: () => {
    localStorage.removeItem('teacherToken');
    sessionStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    sessionStorage.removeItem('teacher');
  },
  
  clearAllTokens: () => {
    localStorage.clear();
    sessionStorage.clear();
  },

  // Helper method to check if user is logged in
  isUserLoggedIn: () => {
    return !!getTokenFromStorage('userToken');
  },

  // Helper method to check if teacher is logged in
  isTeacherLoggedIn: () => {
    return !!getTokenFromStorage('teacherToken');
  },

  // Helper method to check if admin is logged in
  isAdminLoggedIn: () => {
    return !!getTokenFromStorage('adminToken');
  },

  // Helper method to get current user info from either storage
  getCurrentUser: () => {
    let user = localStorage.getItem('user');
    if (!user) {
      user = sessionStorage.getItem('user');
    }
    return user ? JSON.parse(user) : null;
  },

  // Helper method to get current teacher info from either storage
  getCurrentTeacher: () => {
    let teacher = localStorage.getItem('teacher');
    if (!teacher) {
      teacher = sessionStorage.getItem('teacher');
    }
    return teacher ? JSON.parse(teacher) : null;
  },

  // Helper method to get current user role
  getCurrentUserRole: () => {
    let role = localStorage.getItem('userRole');
    if (!role) {
      role = sessionStorage.getItem('userRole');
    }
    return role;
  },

  // Helper method to store user data
  setUserData: (userData, persistent = false) => {
    const userDataString = JSON.stringify(userData);
    if (persistent) {
      localStorage.setItem('user', userDataString);
      sessionStorage.removeItem('user');
    } else {
      sessionStorage.setItem('user', userDataString);
      localStorage.removeItem('user');
    }
  },

  // Helper method to store teacher data
  setTeacherData: (teacherData, persistent = false) => {
    const teacherDataString = JSON.stringify(teacherData);
    if (persistent) {
      localStorage.setItem('teacher', teacherDataString);
      sessionStorage.removeItem('teacher');
    } else {
      sessionStorage.setItem('teacher', teacherDataString);
      localStorage.removeItem('teacher');
    }
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

  // API Response Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  }
};

// ADDED: Utility functions for common operations
export const utils = {
  // Format date for display
  formatDate: (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  },

  // Format time for display
  formatTime: (timeString) => {
    if (!timeString) return 'N/A';
    return timeString.includes(' - ') ? timeString.split(' - ')[0] : timeString;
  },

  // Validate appointment ID format
  isValidAppointmentId: (id) => {
    return id && typeof id === 'string' && id.length === 24;
  },

  // Create error message from API response
  extractErrorMessage: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },

  // Delay function for retry mechanisms
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Debounce function for API calls
  debounce: (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }
};

export default api;