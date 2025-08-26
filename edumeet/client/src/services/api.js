import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? 'https://edumeet.onrender.com/api' : 'http://localhost:5000/api');

const apiInstance = axios.create({
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

// Request interceptor with proper token handling based on your auth middleware
apiInstance.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL - matching your backend routes
    if (config.url.startsWith('/admin') || config.url.includes('/admin/')) {
      token = getTokenFromStorage('adminToken');
    } else if (config.url.startsWith('/teachers') || config.url.includes('/teachers/')) {
      // Teachers routes - check if it's a protected route
      if (config.url.includes('/profile/me') || config.url.includes('/logout') || 
          config.url.includes('/admin/') || config.url === '/teachers/stats' ||
          config.url.includes('/send-setup-link')) {
        token = getTokenFromStorage('teacherToken') || getTokenFromStorage('adminToken');
      }
    } else if (config.url.startsWith('/appointments') || config.url.includes('/appointments/')) {
      // Appointments - most routes require authentication
      if (config.url !== '/appointments/request') { // Only public route
        token = getTokenFromStorage('teacherToken') || getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
      }
    } else if (config.url.startsWith('/auth') || config.url.includes('/auth/')) {
      if (config.url.includes('/profile') || config.url.includes('/verify-token') || 
          config.url.includes('/admin/')) {
        token = getTokenFromStorage('userToken') || getTokenFromStorage('adminToken');
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
apiInstance.interceptors.response.use(
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

// CORRECTED API endpoints matching your exact backend routes
export const endpoints = {
  // Auth endpoints - matching authRoutes.js
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    updateProfile: '/auth/profile',
    verifyToken: '/auth/verify-token',
    // Admin routes within auth
    getPendingRegistrations: '/auth/admin/pending',
    getAllUsers: '/auth/admin/users',
    getUserStats: '/auth/admin/stats',
    approveUser: (id) => `/auth/admin/approve/${id}`,
    rejectUser: (id) => `/auth/admin/reject/${id}`,
  },

  // Teacher endpoints - matching teacherRoutes.js structure
  teachers: {
    // Public routes (no auth required)
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    getByDepartment: (department) => `/teachers/department/${department}`,
    
    // Authentication routes
    login: '/teachers/login',
    setupAccount: (token) => `/teachers/setup-account/${token}`,
    
    // Teacher protected routes (authenticateTeacher)
    logout: '/teachers/logout',
    getProfile: '/teachers/profile/me',
    updateProfile: '/teachers/profile/me',
    
    // Admin protected routes (authenticateAdmin) with /admin prefix
    getStats: '/teachers/admin/stats',
    sendSetupLink: '/teachers/admin/send-setup-link',
    create: '/teachers/admin/create',
    update: (id) => `/teachers/admin/${id}`,
    approve: (id) => `/teachers/admin/${id}/approve`,
    reject: (id) => `/teachers/admin/${id}/reject`,
    delete: (id) => `/teachers/admin/${id}`,
    permanentDelete: (id) => `/teachers/admin/${id}/permanent`,
    
    // Legacy routes (backward compatibility)
    legacyStats: '/teachers/stats',
    legacyCreate: '/teachers',
    legacyUpdate: (id) => `/teachers/${id}`,
    legacyDelete: (id) => `/teachers/${id}`,
    legacyPermanentDelete: (id) => `/teachers/${id}/permanent`,
    legacySendSetupLink: '/teachers/send-setup-link',
    legacyProfile: '/teachers/profile',
  },

  // Appointment endpoints - matching appointmentRoutes.js EXACT structure
  appointments: {
    // 1. Statistics route (must be first to avoid conflicts)
    stats: '/appointments/stats',
    
    // 2. Student routes (authenticated)
    studentRequest: '/appointments/student/request',
    studentAppointments: '/appointments/student/appointments',
    studentCancel: (id) => `/appointments/student/${id}/cancel`,
    
    // 3. Public student request (no auth - backward compatibility)
    request: '/appointments/request',
    
    // 4. Teacher direct booking
    book: '/appointments/book',
    
    // 5. Teacher-specific routes
    // Current teacher's routes
    teacherPending: '/appointments/teacher/pending',
    teacherAppointments: '/appointments/teacher/appointments',
    
    // Specific teacher's routes (with teacherId parameter)
    teacherPendingById: (teacherId) => `/appointments/teacher/${teacherId}/pending`,
    teacherAppointmentsById: (teacherId) => `/appointments/teacher/${teacherId}`,
    
    // 6. Action routes with ID
    accept: (id) => `/appointments/${id}/accept`,
    reject: (id) => `/appointments/${id}/reject`,
    complete: (id) => `/appointments/${id}/complete`,
    cancel: (id) => `/appointments/${id}/cancel`,
    
    // 7. Generic CRUD routes (must be last)
    getAll: '/appointments',
    getById: (id) => `/appointments/${id}`,
    update: (id) => `/appointments/${id}`,
    delete: (id) => `/appointments/${id}`,
  },

  // Admin endpoints - matching adminRoutes.js
  admin: {
    // Public routes
    register: '/admin/register',
    login: '/admin/login',
    
    // Protected routes (all require authenticateAdmin)
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    dashboardStats: '/admin/dashboard/stats',
    dashboard: '/admin/dashboard',
    getUsers: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    getAllAppointments: '/admin/appointments',
    updateTeacherStatus: (teacherId) => `/admin/teachers/${teacherId}/status`,
    health: '/admin/health',
    logout: '/admin/logout',
  },
  
  // Message endpoints - matching messageRoutes.js
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

// Token management utilities (unchanged as they were correct)
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

// CORRECTED API methods matching your backend routes exactly
export const apiMethods = {
  // =============================================================================
  // AUTH OPERATIONS - matching authRoutes.js
  // =============================================================================
  register: (userData) => apiInstance.post(endpoints.auth.register, userData),
  login: (credentials) => apiInstance.post(endpoints.auth.login, credentials),
  logout: () => apiInstance.post(endpoints.auth.logout),
  getProfile: () => apiInstance.get(endpoints.auth.profile),
  updateProfile: (data) => apiInstance.put(endpoints.auth.updateProfile, data),
  verifyToken: () => apiInstance.get(endpoints.auth.verifyToken),
  
  // Admin auth operations
  getPendingRegistrations: () => apiInstance.get(endpoints.auth.getPendingRegistrations),
  getAllUsers: () => apiInstance.get(endpoints.auth.getAllUsers),
  getUserStats: () => apiInstance.get(endpoints.auth.getUserStats),
  approveUser: (id) => apiInstance.put(endpoints.auth.approveUser(id)),
  rejectUser: (id, reason) => apiInstance.put(endpoints.auth.rejectUser(id), { reason }),

  // =============================================================================
  // TEACHER OPERATIONS - matching teacherRoutes.js structure
  // =============================================================================
  
  // Public teacher operations (no auth required)
  getAllTeachers: (params = {}) => apiInstance.get(endpoints.teachers.getAll, { params }),
  getTeacherById: (id) => apiInstance.get(endpoints.teachers.getById(id)),
  getTeachersByDepartment: (department) => apiInstance.get(endpoints.teachers.getByDepartment(department)),
  
  // Teacher authentication
  teacherLogin: async (credentials) => {
    try {
      console.log('🔄 Attempting teacher login');
      const response = await apiInstance.post(endpoints.teachers.login, credentials);
      console.log('✅ Teacher login response received');
      return response;
    } catch (error) {
      console.error('❌ Teacher login error:', error);
      throw error;
    }
  },
  
  setupTeacherAccount: (token, data) => apiInstance.post(endpoints.teachers.setupAccount(token), data),
  
  // Teacher protected operations
  teacherLogout: () => apiInstance.post(endpoints.teachers.logout),
  getTeacherProfile: () => apiInstance.get(endpoints.teachers.getProfile),
  updateTeacherProfile: (data) => apiInstance.put(endpoints.teachers.updateProfile, data),
  
  // Admin operations on teachers (require admin token)
  getTeacherStats: () => apiInstance.get(endpoints.teachers.getStats),
  createTeacher: (data) => apiInstance.post(endpoints.teachers.create, data),
  updateTeacher: (id, data) => apiInstance.put(endpoints.teachers.update(id), data),
  approveTeacher: (id) => apiInstance.patch(endpoints.teachers.approve(id)),
  rejectTeacher: (id) => apiInstance.patch(endpoints.teachers.reject(id)),
  deleteTeacher: (id) => apiInstance.delete(endpoints.teachers.delete(id)),
  permanentDeleteTeacher: (id) => apiInstance.delete(endpoints.teachers.permanentDelete(id)),
  sendTeacherSetupLink: (teacherId) => apiInstance.post(endpoints.teachers.sendSetupLink, { teacherId }),

  // =============================================================================
  // APPOINTMENT OPERATIONS - matching appointmentRoutes.js EXACT structure
  // =============================================================================
  
  // 1. Statistics
  getAppointmentStats: async (params = {}) => {
    try {
      console.log('🔄 Fetching appointment statistics');
      const response = await apiInstance.get(endpoints.appointments.stats, { params });
      console.log('✅ Statistics fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching statistics:', error);
      throw error;
    }
  },

  // 2. Authenticated student operations
  studentRequestAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Authenticated student requesting appointment:', appointmentData);
      const response = await apiInstance.post(endpoints.appointments.studentRequest, appointmentData);
      console.log('✅ Student appointment request sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Error in student appointment request:', error);
      throw error;
    }
  },

  getStudentAppointments: async (params = {}) => {
    try {
      console.log('🔄 Fetching student appointments');
      const response = await apiInstance.get(endpoints.appointments.studentAppointments, { params });
      console.log('✅ Student appointments fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching student appointments:', error);
      throw error;
    }
  },

  cancelStudentAppointment: async (id, reason = '') => {
    try {
      console.log('🔄 Student cancelling appointment:', id);
      const response = await apiInstance.put(endpoints.appointments.studentCancel(id), { reason });
      console.log('✅ Student appointment cancelled successfully');
      return response;
    } catch (error) {
      console.error('❌ Error cancelling student appointment:', error);
      throw error;
    }
  },

  // 3. Public student request (backward compatibility)
  requestAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Public student requesting appointment:', appointmentData);
      const response = await apiInstance.post(endpoints.appointments.request, appointmentData);
      console.log('✅ Public appointment request sent successfully');
      return response;
    } catch (error) {
      console.error('❌ Error in public appointment request:', error);
      throw error;
    }
  },

  // 4. Teacher direct booking
  teacherBookAppointment: async (appointmentData) => {
    try {
      console.log('🔄 Teacher booking appointment directly:', appointmentData);
      const response = await apiInstance.post(endpoints.appointments.book, appointmentData);
      console.log('✅ Teacher appointment booked successfully');
      return response;
    } catch (error) {
      console.error('❌ Error in teacher booking appointment:', error);
      throw error;
    }
  },

  // 5. Teacher pending requests
  getTeacherPendingRequests: async () => {
    try {
      console.log('🔄 Fetching current teacher pending requests');
      const response = await apiInstance.get(endpoints.appointments.teacherPending);
      console.log('✅ Teacher pending requests fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher pending requests:', error);
      throw error;
    }
  },

  getTeacherPendingRequestsById: async (teacherId) => {
    try {
      console.log('🔄 Fetching pending requests for teacher:', teacherId);
      const response = await apiInstance.get(endpoints.appointments.teacherPendingById(teacherId));
      console.log('✅ Teacher pending requests by ID fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher pending requests by ID:', error);
      throw error;
    }
  },

  // 6. Teacher appointments
  getTeacherAppointments: async (params = {}) => {
    try {
      console.log('🔄 Fetching current teacher appointments');
      const response = await apiInstance.get(endpoints.appointments.teacherAppointments, { params });
      console.log('✅ Teacher appointments fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher appointments:', error);
      throw error;
    }
  },

  getTeacherAppointmentsById: async (teacherId, params = {}) => {
    try {
      console.log('🔄 Fetching appointments for teacher:', teacherId);
      const response = await apiInstance.get(endpoints.appointments.teacherAppointmentsById(teacherId), { params });
      console.log('✅ Teacher appointments by ID fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching teacher appointments by ID:', error);
      throw error;
    }
  },

  // 7. Appointment actions
  acceptAppointmentRequest: async (id, responseMessage = '') => {
    try {
      console.log('🔄 Accepting appointment request:', id);
      const response = await apiInstance.put(endpoints.appointments.accept(id), { 
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
      const response = await apiInstance.put(endpoints.appointments.reject(id), { 
        responseMessage: responseMessage.trim() 
      });
      console.log('✅ Appointment rejected successfully');
      return response;
    } catch (error) {
      console.error('❌ Error rejecting appointment:', error);
      throw error;
    }
  },

  completeAppointment: async (id) => {
    try {
      console.log('🔄 Completing appointment:', id);
      const response = await apiInstance.put(endpoints.appointments.complete(id));
      console.log('✅ Appointment completed successfully');
      return response;
    } catch (error) {
      console.error('❌ Error completing appointment:', error);
      throw error;
    }
  },

  cancelAppointment: async (id, reason = '') => {
    try {
      console.log('🔄 Cancelling appointment:', id);
      const response = await apiInstance.put(endpoints.appointments.cancel(id), { reason });
      console.log('✅ Appointment cancelled successfully');
      return response;
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      throw error;
    }
  },

  // 8. Generic appointment operations
  getAllAppointments: async (params = {}) => {
    try {
      console.log('🔄 Fetching all appointments with params:', params);
      const response = await apiInstance.get(endpoints.appointments.getAll, { params });
      console.log('✅ All appointments fetched successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching all appointments:', error);
      throw error;
    }
  },

  getAppointmentById: async (id) => {
    try {
      console.log('🔄 Fetching appointment by ID:', id);
      const response = await apiInstance.get(endpoints.appointments.getById(id));
      console.log('✅ Appointment fetched by ID successfully');
      return response;
    } catch (error) {
      console.error('❌ Error fetching appointment by ID:', error);
      throw error;
    }
  },

  updateAppointment: async (id, data) => {
    try {
      console.log('🔄 Updating appointment:', id, data);
      const response = await apiInstance.put(endpoints.appointments.update(id), data);
      console.log('✅ Appointment updated successfully');
      return response;
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
      throw error;
    }
  },

  deleteAppointment: async (id) => {
    try {
      console.log('🔄 Deleting appointment:', id);
      const response = await apiInstance.delete(endpoints.appointments.delete(id));
      console.log('✅ Appointment deleted successfully');
      return response;
    } catch (error) {
      console.error('❌ Error deleting appointment:', error);
      throw error;
    }
  },

  // =============================================================================
  // ADMIN OPERATIONS - matching adminRoutes.js
  // =============================================================================
  adminLogin: (credentials) => apiInstance.post(endpoints.admin.login, credentials),
  adminLogout: () => apiInstance.post(endpoints.admin.logout),
  getAdminProfile: () => apiInstance.get(endpoints.admin.profile),
  updateAdminProfile: (data) => apiInstance.put(endpoints.admin.updateProfile, data),
  getDashboardStats: () => apiInstance.get(endpoints.admin.dashboardStats),
  getAdminUsers: () => apiInstance.get(endpoints.admin.getUsers),
  deleteAdminUser: (userId) => apiInstance.delete(endpoints.admin.deleteUser(userId)),
  getAdminAppointments: () => apiInstance.get(endpoints.admin.getAllAppointments),
  updateTeacherStatus: (teacherId, data) => apiInstance.patch(endpoints.admin.updateTeacherStatus(teacherId), data),

  // =============================================================================
  // MESSAGE OPERATIONS - matching messageRoutes.js
  // =============================================================================
  getMessagesByRoom: (roomId, params = {}) => apiInstance.get(endpoints.messages.getByRoom(roomId), { params }),
  deleteMessage: (messageId) => apiInstance.delete(endpoints.messages.delete(messageId)),
  getRoomStats: (roomId) => apiInstance.get(endpoints.messages.getRoomStats(roomId)),
  getAllRooms: () => apiInstance.get(endpoints.messages.getAllRooms),
  searchMessagesInRoom: (roomId, params = {}) => apiInstance.get(endpoints.messages.searchInRoom(roomId), { params }),

  // =============================================================================
  // UTILITY OPERATIONS
  // =============================================================================
  healthCheck: () => apiInstance.get(endpoints.health),

  // Appointment data validation helper
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

// Constants matching your backend validation
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
  APPROVAL_STATUSES: ['pending', 'approved', 'rejected'],
  
  DAYS_OF_WEEK: [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ],
  
  GRADES: [
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
    'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'
  ]
};

// Helper functions for data processing
export const helpers = {
  // Format date for API consumption
  formatDate: (date) => {
    if (!date) return null;
    const d = new Date(date);
    return d.toISOString().split('T')[0]; // YYYY-MM-DD format
  },
  
  // Format time for display
  formatTime: (time) => {
    if (!time) return '';
    return time.trim();
  },
  
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  // Validate phone format
  isValidPhone: (phone) => {
    if (!phone || phone.trim() === '') return true; // Optional field
    const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
    return phoneRegex.test(phone.trim());
  },
  
  // Extract error messages from API response
  extractErrorMessage: (error) => {
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      return error.response.data.errors.map(err => err.message || err).join(', ');
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  },
  
  // Extract validation errors for form display
  extractValidationErrors: (error) => {
    const errors = {};
    if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
      error.response.data.errors.forEach(err => {
        if (err.field) {
          errors[err.field] = err.message;
        }
      });
    }
    return errors;
  },
  
  // Format appointment status for display
  formatStatus: (status) => {
    const statusMap = {
      'pending': 'Pending',
      'confirmed': 'Confirmed',
      'rejected': 'Rejected',
      'cancelled': 'Cancelled',
      'completed': 'Completed',
      'booked': 'Booked'
    };
    return statusMap[status] || status;
  },
  
  // Get status color for UI
  getStatusColor: (status) => {
    const colorMap = {
      'pending': 'orange',
      'confirmed': 'green',
      'rejected': 'red',
      'cancelled': 'gray',
      'completed': 'blue',
      'booked': 'purple'
    };
    return colorMap[status] || 'gray';
  },
  
  // Check if date is in the past
  isPastDate: (date) => {
    if (!date) return false;
    const today = new Date();
    const checkDate = new Date(date);
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  },
  
  // Generate room ID for messaging
  generateRoomId: (teacherId, studentId) => {
    return `room_${teacherId}_${studentId}`;
  }
};

// Enhanced error handling class
export class ApiError extends Error {
  constructor(message, statusCode, errors = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
  
  static fromAxiosError(error) {
    const message = helpers.extractErrorMessage(error);
    const statusCode = error.response?.status || 500;
    const errors = helpers.extractValidationErrors(error);
    return new ApiError(message, statusCode, errors);
  }
}

// DEFAULT EXPORT - This is what your components are importing
const api = {
  // Axios instance
  instance: apiInstance,
  
  // All the methods from apiMethods
  ...apiMethods,
  
  // Token management
  tokenManager,
  
  // Endpoints
  endpoints,
  
  // Constants
  constants,
  
  // Helper functions
  helpers,
  
  // Error class
  ApiError
};

export default api;

// Development helper - only available in development mode
if (process.env.NODE_ENV === 'development') {
  window.tokenManager = tokenManager;
  window.apiMethods = apiMethods;
  window.api = api;
  window.endpoints = endpoints;
  window.helpers = helpers;
  
  // Add debug functions to window
  window.debugAPI = {
    checkTokens: tokenManager.debugTokenState,
    testEndpoint: async (endpoint, method = 'GET', data = null) => {
      try {
        const response = await apiInstance({
          method,
          url: endpoint,
          data
        });
        console.log('Test response:', response);
        return response;
      } catch (error) {
        console.error('Test error:', error);
        throw error;
      }
    },
    clearAllData: () => {
      tokenManager.clearAllTokens();
      console.log('All tokens and data cleared');
    }
  };
}