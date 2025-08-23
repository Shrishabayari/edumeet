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
  withCredentials: true,
});

// Token retrieval helper
const getTokenFromStorage = (tokenType = 'userToken') => {
  let token = localStorage.getItem(tokenType);
  if (token) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Found ${tokenType} in localStorage`);
    }
    return token;
  }
  
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
    if (config.url.startsWith('/admin') || config.url.includes('/admin/')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers') || config.url.includes('/teachers/')) {
      token = getTokenFromStorage('teacherToken');
    } else if (config.url.startsWith('/appointments') || config.url.includes('/appointments/')) {
      // For appointments, prioritize teacher token, then user token, then admin token
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/auth') || config.url.includes('/auth/')) {
      if (config.url.includes('/profile') || config.url.includes('/verify-token')) {
        token = getTokenFromStorage('userToken');
      }
    } else if (config.url.startsWith('/messages') || config.url.includes('/messages/')) {
      token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
    } else {
      token = getTokenFromStorage('userToken');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔑 Token added to request: ${config.method?.toUpperCase()} ${config.url}`);
      }
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

// Response interceptor with proper error handling
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
      
      switch (status) {
        case 401:
          console.warn('🔒 Unauthorized: Token expired or invalid');
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
      }
    }
    
    return Promise.reject(error);
  }
);

// CORRECTED API endpoints based on your backend routes
export const endpoints = {
  // Auth endpoints
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    updateProfile: '/auth/profile',
    verifyToken: '/auth/verify-token',
    getPendingRegistrations: '/auth/admin/pending',
    getAllUsers: '/auth/admin/users',
    getUserStats: '/auth/admin/stats',
    approveUser: (id) => `/auth/admin/approve/${id}`,
    rejectUser: (id) => `/auth/admin/reject/${id}`,
  },

  // Teacher endpoints
  teachers: {
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    getByDepartment: (department) => `/teachers/department/${department}`,
    login: '/teachers/login',
    logout: '/teachers/logout',
    setupAccount: (token) => `/teachers/setup-account/${token}`,
    getProfile: '/teachers/profile/me',
    updateProfile: '/teachers/profile/me',
    getStats: '/teachers/admin/stats',
    create: '/teachers/admin/create',
    update: (id) => `/teachers/admin/${id}`,
    delete: (id) => `/teachers/admin/${id}`,
    permanentDelete: (id) => `/teachers/admin/${id}/permanent`,
    approve: (id) => `/teachers/admin/${id}/approve`,
    reject: (id) => `/teachers/admin/${id}/reject`,
    sendSetupLink: '/teachers/admin/send-setup-link',
  },

  // CORRECTED Appointment endpoints to match your backend routes exactly
  appointments: {
    // Statistics route (must be first to avoid conflicts with /:id routes)
    getStats: '/appointments/stats',
    
    // Student and teacher actions
    request: '/appointments/request',  // Student request appointment
    book: '/appointments/book',        // Teacher direct booking
    
    // Teacher-specific routes for current authenticated teacher
    getTeacherPending: '/appointments/teacher/pending',
    getTeacherAppointments: '/appointments/teacher/appointments',
    
    // Teacher-specific routes with teacherId parameter
    getTeacherPendingById: (teacherId) => `/appointments/teacher/${teacherId}/pending`,
    getTeacherAppointmentsById: (teacherId) => `/appointments/teacher/${teacherId}`,
    
    // Action routes with appointment ID
    accept: (id) => `/appointments/${id}/accept`,
    reject: (id) => `/appointments/${id}/reject`,
    complete: (id) => `/appointments/${id}/complete`,
    cancel: (id) => `/appointments/${id}/cancel`,
    
    // Generic CRUD routes
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    update: (id) => `/appointments/${id}`,
    delete: (id) => `/appointments/${id}`,
  },

  // Admin endpoints
  admin: {
    register: '/admin/register',
    login: '/admin/login',
    logout: '/admin/logout',
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    dashboardStats: '/admin/dashboard/stats',
    dashboard: '/admin/dashboard',
    getUsers: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    getAppointments: '/admin/appointments',
    updateTeacherStatus: (teacherId) => `/admin/teachers/${teacherId}/status`,
    health: '/admin/health',
  },
  
  // Message endpoints
  messages: {
    getByRoom: (roomId) => `/messages/room/${roomId}`,
    delete: (messageId) => `/messages/${messageId}`,
    getRoomStats: (roomId) => `/messages/room/${roomId}/stats`,
    getAllRooms: '/messages/rooms',
    searchInRoom: (roomId) => `/messages/room/${roomId}/search`,
  },
  
  health: '/health'
};

// Token management utilities
export const tokenManager = {
  setUserToken: (token, persistent = true) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided');
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
  },
  
  setTeacherToken: (token, persistent = true) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided');
      return false;
    }
    
    const cleanToken = token.trim();
    
    if (persistent) {
      localStorage.setItem('teacherToken', cleanToken);
      sessionStorage.removeItem('teacherToken');
    } else {
      sessionStorage.setItem('teacherToken', cleanToken);
      localStorage.removeItem('teacherToken');
    }
    return true;
  },
  
  getTeacherToken: () => getTokenFromStorage('teacherToken'),
  
  removeTeacherToken: () => {
    localStorage.removeItem('teacherToken');
    sessionStorage.removeItem('teacherToken');
    localStorage.removeItem('teacher');
    sessionStorage.removeItem('teacher');
  },
  
  setAdminToken: (token, persistent = true) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      console.error('❌ Invalid token provided');
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
  
  clearAllTokens: () => {
    localStorage.clear();
    sessionStorage.clear();
  },

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

  getTeacherName: () => {
    try {
      const teacher = tokenManager.getCurrentTeacher();
      return teacher?.name || 'Unknown Teacher';
    } catch (error) {
      console.error('Error getting teacher name:', error);
      return 'Unknown Teacher';
    }
  },

  // Added the missing debugTokenState function
  debugTokenState: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Token Debug State:');
      console.log('- User Token:', !!getTokenFromStorage('userToken') ? 'Present' : 'Missing');
      console.log('- Teacher Token:', !!getTokenFromStorage('teacherToken') ? 'Present' : 'Missing');
      console.log('- Admin Token:', !!getTokenFromStorage('adminToken') ? 'Present' : 'Missing');
      
      const teacherData = tokenManager.getCurrentTeacher();
      console.log('- Teacher Data:', teacherData ? 'Present' : 'Missing');
      if (teacherData) {
        console.log('  - Teacher ID:', teacherData._id || teacherData.id || 'Missing');
        console.log('  - Teacher Name:', teacherData.name || 'Missing');
        console.log('  - Teacher Email:', teacherData.email || 'Missing');
      }
      
      console.log('- Current Path:', window.location.pathname);
    }
  }
};

// CORRECTED API methods to match your backend implementation exactly
export const apiMethods = {
  // Auth Operations
  register: (userData) => api.post(endpoints.auth.register, userData),
  login: (credentials) => api.post(endpoints.auth.login, credentials),
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
  setupTeacherAccount: (token, data) => api.post(endpoints.teachers.setupAccount(token), data),
  getAllTeachers: (params = {}) => api.get(endpoints.teachers.getAll, { params }),
  getTeacherById: (id) => api.get(endpoints.teachers.getById(id)),

  // CORRECTED Appointment Operations - Matching your backend exactly
  
  // 1. Student requesting appointment (no auth required on backend)
  requestAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Student requesting appointment:', appointmentData);
      const response = await api.post(endpoints.appointments.request, appointmentData);
      console.log('✅ Appointment request sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Error requesting appointment:', error);
      throw error;
    }
  },

  // 2. Teacher booking appointment directly (requires teacher auth)
  teacherBookAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Teacher booking appointment directly:', appointmentData);
      const response = await api.post(endpoints.appointments.book, appointmentData);
      console.log('✅ Appointment booked successfully');
      return response;
    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      throw error;
    }
  },

  // 3. Teacher accepting appointment request (requires teacher auth)
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

  // 4. Teacher rejecting appointment request (requires teacher auth)
  rejectAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Rejecting appointment request:', id);
      const response = await api.put(endpoints.appointments.reject(id), { 
        responseMessage: responseMessage.trim() 
      });
      console.log('✅ Appointment rejected successfully');
      return response;
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      throw error;
    }
  },

  // 5. Complete appointment (requires teacher/admin auth)
  completeAppointment: async (id) => {
    try {
      console.log('🔄 Completing appointment:', id);
      const response = await api.put(endpoints.appointments.complete(id));
      console.log('✅ Appointment completed successfully');
      return response;
    } catch (error) {
      console.error('❌ Error completing appointment:', error);
      throw error;
    }
  },

  // 6. Cancel appointment (requires teacher/admin auth)
  cancelAppointment: async (id, reason = '') => {
    try {
      console.log('🔄 Cancelling appointment:', id);
      const response = await api.put(endpoints.appointments.cancel(id), { reason });
      console.log('✅ Appointment cancelled successfully');
      return response;
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      throw error;
    }
  },

  // 7. Get appointment statistics (requires auth)
  getAppointmentStats: async (teacherId = null) => {
    try {
      console.log('🔄 Fetching appointment statistics');
      const params = teacherId ? { teacherId } : {};
      const response = await api.get(endpoints.appointments.getStats, { params });
      console.log('✅ Statistics fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      throw error;
    }
  },

  // 8. Get all appointments (requires teacher/admin auth)
  getAllAppointments: async (params = {}) => {
    try {
      console.log('🔄 Fetching all appointments with params:', params);
      const response = await api.get(endpoints.appointments.getAll, { params });
      console.log('✅ Appointments fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
      throw error;
    }
  },

  // 9. Get appointment by ID (requires auth with access check)
  getAppointmentById: async (id) => {
    try {
      console.log('🔄 Fetching appointment by ID:', id);
      const response = await api.get(endpoints.appointments.getById(id));
      console.log('✅ Appointment fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching appointment:', error);
      throw error;
    }
  },

  // 10. Update appointment (requires teacher/admin auth)
  updateAppointment: async (id, data) => {
    try {
      console.log('🔄 Updating appointment:', id, data);
      const response = await api.put(endpoints.appointments.update(id), data);
      console.log('✅ Appointment updated successfully');
      return response;
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
      throw error;
    }
  },

  // 11. Delete appointment (requires admin auth)
  deleteAppointment: async (id) => {
    try {
      console.log('🔄 Deleting appointment:', id);
      const response = await api.delete(endpoints.appointments.delete(id));
      console.log('✅ Appointment deleted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error deleting appointment:', error);
      throw error;
    }
  },

  // 12. Get current teacher's pending requests (requires teacher auth)
  getTeacherPendingRequests: async () => {
    try {
      console.log('🔄 Fetching teacher pending requests');
      const response = await api.get(endpoints.appointments.getTeacherPending);
      console.log('✅ Pending requests fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching pending requests:', error);
      throw error;
    }
  },

  // 13. Get current teacher's appointments (requires teacher auth)
  getTeacherAppointments: async (params = {}) => {
    try {
      console.log('🔄 Fetching teacher appointments with params:', params);
      const response = await api.get(endpoints.appointments.getTeacherAppointments, { params });
      console.log('✅ Teacher appointments fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher appointments:', error);
      throw error;
    }
  },

  // 14. Get specific teacher's pending requests by ID (requires teacher/admin auth)
  getTeacherPendingRequestsById: async (teacherId) => {
    try {
      console.log('🔄 Fetching pending requests for teacher:', teacherId);
      const response = await api.get(endpoints.appointments.getTeacherPendingById(teacherId));
      console.log('✅ Teacher pending requests fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher pending requests:', error);
      throw error;
    }
  },

  // 15. Get specific teacher's appointments by ID (requires teacher/admin auth)
  getTeacherAppointmentsById: async (teacherId, params = {}) => {
    try {
      console.log('🔄 Fetching appointments for teacher:', teacherId, 'with params:', params);
      const response = await api.get(endpoints.appointments.getTeacherAppointmentsById(teacherId), { params });
      console.log('✅ Teacher appointments by ID fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher appointments by ID:', error);
      throw error;
    }
  },

  // Admin Operations
  adminLogin: (credentials) => api.post(endpoints.admin.login, credentials),
  adminLogout: () => api.post(endpoints.admin.logout),
  getAdminProfile: () => api.get(endpoints.admin.profile),
  getDashboardStats: () => api.get(endpoints.admin.dashboardStats),

  // Message Operations
  getMessagesByRoom: (roomId, params = {}) => api.get(endpoints.messages.getByRoom(roomId), { params }),
  deleteMessage: (messageId) => api.delete(endpoints.messages.delete(messageId)),

  // Health check
  healthCheck: () => api.get(endpoints.health),

  // Appointment data validation
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
      errors.push('Teacher ID is required for student requests');
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

  USER_ROLES: ['student', 'teacher', 'admin'],
  APPROVAL_STATUSES: ['pending', 'approved', 'rejected']
};

// Development helper
if (process.env.NODE_ENV === 'development') {
  window.tokenManager = tokenManager;
  window.apiMethods = apiMethods;
  window.api = api;
}

export default api;