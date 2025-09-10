import axios from 'axios';

// FIXED: Better API URL detection logic - NO /api/ suffix
const getApiUrl = () => {
  // Environment variable takes highest priority
  if (process.env.REACT_APP_API_URL) {
    console.log('🔗 Using API URL from env variable:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // Detect production environment
  const hostname = window.location.hostname;
  const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
  
  if (isProduction) {
    console.log('🔗 Production environment detected, using backend URL');
    return 'https://edumeet.onrender.com'; // Your backend URL - NO /api/ here!
  }
  
  // Development fallback
  console.log('🔗 Development environment, using localhost');
  return 'http://localhost:5000'; // NO /api/ here either!
};

const API_BASE_URL = getApiUrl();

console.log('🔗 Final API Base URL:', API_BASE_URL);
console.log('🌍 Current environment:', {
  hostname: window.location.hostname,
  origin: window.location.origin,
  nodeEnv: process.env.NODE_ENV
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Add credentials for CORS
  withCredentials: true,
});

// Enhanced helper function to get token from storage
const getTokenFromStorage = (tokenType = 'userToken') => {
  let token = localStorage.getItem(tokenType);
  if (!token) {
    token = sessionStorage.getItem(tokenType);
  }
  
  if (process.env.NODE_ENV === 'development' && token) {
    console.log(`🔍 Found ${tokenType} in ${localStorage.getItem(tokenType) ? 'localStorage' : 'sessionStorage'}`);
  }
  
  return token;
};

// FIXED: Enhanced request interceptor with better token detection
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL
    if (config.url.startsWith('/admin')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers')) {
      token = getTokenFromStorage('teacherToken');
    } else {
      // Try multiple token types for regular users
      token = getTokenFromStorage('userToken') || 
              getTokenFromStorage('studentToken');
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

// Enhanced response interceptor with better error handling
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
    getPendingRegistrations: '/auth/admin/pending',
    getAllUsers: '/auth/admin/users',
    approveUser: (id) => `/auth/admin/approve/${id}`,
    rejectUser: (id) => `/auth/admin/reject/${id}`,
  },
  
  // FIXED: Message endpoints with proper API prefix
  messages: {
    getByRoom: (roomId) => `/messages/room/${roomId}`,
    delete: (id) => `/messages/${id}`,
    getRoomStats: (roomId) => `/messages/room/${roomId}/stats`,
    getRooms: '/messages/rooms',
    searchInRoom: (roomId) => `/messages/room/${roomId}/search`
  }
};

// Constants for validation
const AVAILABILITY_SLOTS = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM', 
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM'
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

// Enhanced API methods with better error handling
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

  // FIXED: Added missing validateAppointmentData function
  validateAppointmentData: (data, isTeacherBooking = false) => {
    const errors = [];
    
    // Required field validation
    if (!data.teacherId || data.teacherId.trim() === '') {
      errors.push('Teacher selection is required');
    }
    
    if (!data.day || data.day.trim() === '') {
      errors.push('Day selection is required');
    }
    
    if (!data.time || data.time.trim() === '') {
      errors.push('Time slot selection is required');
    }
    
    if (!data.date || data.date.trim() === '') {
      errors.push('Date selection is required');
    } else {
      // Validate date format and future date
      const selectedDate = new Date(data.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(selectedDate.getTime())) {
        errors.push('Invalid date format');
      } else if (selectedDate < today) {
        errors.push('Date must be in the future');
      }
    }
    
    // Student information validation (for student requests)
    if (!isTeacherBooking) {
      if (!data.student || typeof data.student !== 'object') {
        errors.push('Student information is required');
      } else {
        if (!data.student.name || data.student.name.trim() === '') {
          errors.push('Student name is required');
        }
        
        if (!data.student.email || data.student.email.trim() === '') {
          errors.push('Student email is required');
        } else {
          // Email format validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(data.student.email)) {
            errors.push('Invalid email format');
          }
        }
      }
    }
    
    // Validate day is in allowed days
    if (data.day && !DAYS_OF_WEEK.includes(data.day)) {
      errors.push('Invalid day selection');
    }
    
    // Validate time slot is in allowed slots
    if (data.time && !AVAILABILITY_SLOTS.includes(data.time)) {
      errors.push('Invalid time slot selection');
    }
    
    // Additional teacher ID format validation (assuming MongoDB ObjectId)
    if (data.teacherId && data.teacherId.length !== 24) {
      errors.push('Invalid teacher ID format');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  },

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
      console.log('Response message:', responseMessage);
      
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
        console.error(`HTTP ${status}:`, data);
        
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

  // FIXED: Message Operations
  getMessagesForRoom: async (roomId, params = {}) => {
    try {
      console.log(`🔄 Fetching messages for room: ${roomId}`);
      const response = await api.get(endpoints.messages.getByRoom(roomId), { params });
      console.log(`✅ Messages fetched for room: ${roomId}`, response.data);
      return response;
    } catch (error) {
      console.error(`❌ Error fetching messages for room ${roomId}:`, error);
      throw error;
    }
  },

  deleteMessage: (messageId) => {
    console.log(`🔄 Deleting message: ${messageId}`);
    return api.delete(endpoints.messages.delete(messageId));
  },

  getRoomStats: (roomId) => {
    console.log(`🔄 Getting room stats: ${roomId}`);
    return api.get(endpoints.messages.getRoomStats(roomId));
  },

  getAllRooms: () => {
    console.log('🔄 Getting all rooms');
    return api.get(endpoints.messages.getRooms);
  },

  searchMessagesInRoom: (roomId, query, params = {}) => {
    console.log(`🔍 Searching messages in room ${roomId} for: ${query}`);
    return api.get(endpoints.messages.searchInRoom(roomId), { 
      params: { q: query, ...params } 
    });
  },

  // Enhanced error handling utilities
  handleApiError: (error, context = '') => {
    console.error(`API Error ${context}:`, error);
    
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return `Bad Request: ${data.message || 'Invalid data provided'}`;
        case 401:
          return 'Authentication required. Please login again.';
        case 403:
          return 'Access denied. You do not have permission for this action.';
        case 404:
          return `Resource not found: ${data.message || 'The requested item could not be found'}`;
        case 409:
          return `Conflict: ${data.message || 'This action conflicts with current state'}`;
        case 500:
          return 'Server error. Please try again later.';
        default:
          return data.message || `HTTP Error ${status}`;
      }
    } else if (error.request) {
      return 'Network error. Please check your internet connection.';
    } else {
      return error.message || 'An unexpected error occurred';
    }
  },

  // Connection test utility
  testConnection: async () => {
    try {
      console.log('🔄 Testing API connection...');
      const response = await api.get('/api/health');
      console.log('✅ API connection test successful:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ API connection test failed:', error);
      return { 
        success: false, 
        error: apiMethods.handleApiError(error, 'connection test') 
      };
    }
  }
};

// FIXED: Enhanced token management utilities
export const tokenManager = {
  // User token methods
  setUserToken: (token, persistent = false) => {
    console.log('🔧 Setting user token:', { 
      tokenPreview: token?.substring(0, 20) + '...', 
      persistent 
    });
    
    if (persistent) {
      localStorage.setItem('userToken', token);
      sessionStorage.removeItem('userToken');
      console.log('✅ Token stored in localStorage');
    } else {
      sessionStorage.setItem('userToken', token);
      localStorage.removeItem('userToken');
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
    console.log('🗑️ User tokens and data cleared');
  },
  
  // Admin token methods
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
    console.log('🗑️ Admin tokens cleared');
  },
  
  // Teacher token methods
  setTeacherToken: (token, persistent = false) => {
    console.log('🔧 Setting teacher token:', { 
      tokenPreview: token?.substring(0, 20) + '...', 
      persistent 
    });
    
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
    console.log('🗑️ Teacher tokens and data cleared');
  },
  
  clearAllTokens: () => {
    localStorage.clear();
    sessionStorage.clear();
    console.log('🗑️ All tokens and storage cleared');
  },

  // Helper methods
  isUserLoggedIn: () => !!getTokenFromStorage('userToken'),
  
  isTeacherLoggedIn: () => !!getTokenFromStorage('teacherToken'),
  
  isAdminLoggedIn: () => !!getTokenFromStorage('adminToken'),

  getCurrentUser: () => {
    let user = localStorage.getItem('user');
    if (!user) {
      user = sessionStorage.getItem('user');
    }
    return user ? JSON.parse(user) : null;
  },

  getCurrentTeacher: () => {
    let teacher = localStorage.getItem('teacher');
    if (!teacher) {
      teacher = sessionStorage.getItem('teacher');
    }
    return teacher ? JSON.parse(teacher) : null;
  },

  getCurrentUserRole: () => {
    let role = localStorage.getItem('userRole');
    if (!role) {
      role = sessionStorage.getItem('userRole');
    }
    return role;
  },

  // Token validation utility
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
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

  // Message-related constants
  MESSAGE_ROOMS: [
    { id: 'general', name: 'General Discussion' },
    { id: 'cs101', name: 'CS101 - Computer Science' },
    { id: 'math101', name: 'Math101 - Mathematics' },
    { id: 'physics101', name: 'Physics101 - Physics' },
  ],

  REACTION_TYPES: [
    { id: 'heart', emoji: '❤️', label: 'Heart' },
    { id: 'thumbs', emoji: '👍', label: 'Thumbs Up' },
    { id: 'star', emoji: '⭐', label: 'Star' }
  ]
};

export default api;