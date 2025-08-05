// client/src/api.js (Updated EduMeet API Configuration)
import axios from 'axios';

// Prioritize environment variable, then remote server, then local development server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com' || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token if available
api.interceptors.request.use(
  (config) => {
    let token = null;

    // Determine which token to use based on the URL
    if (config.url.startsWith('/admin')) {
      token = localStorage.getItem('adminToken');
    } else if (config.url.startsWith('/teachers')) {
      token = localStorage.getItem('teacherToken');
    } else {
      token = localStorage.getItem('userToken');
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

// Response interceptor - Handle responses and errors globally
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
            localStorage.removeItem('adminToken');
            window.location.href = '/admin/login';
          } else if (config.url.startsWith('/teachers')) {
            localStorage.removeItem('teacherToken');
            window.location.href = '/teacher/login';
          } else {
            localStorage.removeItem('userToken');
            localStorage.removeItem('user');
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

// Updated API endpoints object
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
    
    // Teacher response routes
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
  }
};

// Updated convenience methods for appointment operations
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

  // Updated Appointment Operations

  // Student workflow - Request appointment (needs teacher approval)
  requestAppointment: (appointmentData) => {
    console.log('🔄 Student requesting appointment:', appointmentData);
    return api.post(endpoints.appointments.request, appointmentData);
  },

  // Teacher workflow - Direct booking (no approval needed)
  teacherBookAppointment: (appointmentData) => {
    console.log('🔄 Teacher booking appointment directly:', appointmentData);
    return api.post(endpoints.appointments.book, appointmentData);
  },

  // Teacher response to student requests
  acceptAppointmentRequest: (id, responseMessage = '') => {
    console.log(`🔄 Teacher accepting appointment request: ${id}`);
    return api.put(endpoints.appointments.accept(id), { responseMessage });
  },

  rejectAppointmentRequest: (id, responseMessage = '') => {
    console.log(`🔄 Teacher rejecting appointment request: ${id}`);
    return api.put(endpoints.appointments.reject(id), { responseMessage });
  },

  // Complete appointment
  completeAppointment: (id) => {
    console.log(`🔄 Completing appointment: ${id}`);
    return api.put(endpoints.appointments.complete(id));
  },

  // General appointment operations
  getAllAppointments: (params = {}) => api.get(endpoints.appointments.getAll, { params }),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  cancelAppointment: (id, reason = '') => api.put(endpoints.appointments.cancel(id), { reason }),
  getAppointmentStats: () => api.get(endpoints.appointments.getStats),

  // Teacher-specific appointment queries
  getTeacherAppointments: (teacherId, params = {}) => {
    return api.get(endpoints.appointments.getByTeacher(teacherId), { params });
  },

  getTeacherPendingRequests: (teacherId) => {
    return api.get(endpoints.appointments.getTeacherPending(teacherId));
  },

  // Filtered queries for different appointment types
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

  // User Approval Operations (Admin)
  getPendingRegistrations: () => api.get(endpoints.admin.getPendingRegistrations),
  getAllUsersForAdmin: (params = {}) => api.get(endpoints.admin.getAllUsers, { params }),
  approveUser: (id) => api.put(endpoints.admin.approveUser(id)),
  rejectUser: (id, reason) => api.put(endpoints.admin.rejectUser(id), { reason }),

  // Enhanced appointment booking with better error handling and retry logic
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
        
        // If it's a validation error (400) or conflict (409), don't retry
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

  // Bulk operations for appointments
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

  // Search functionality
  searchAppointments: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.appointments.getAll, { params });
  },

  searchTeachers: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.teachers.getAll, { params });
  },

  // Validation helpers
  validateAppointmentData: (appointmentData, isTeacherBooking = false) => {
    const errors = [];
    
    // Common validations
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
    
    // For student requests, teacherId is required
    if (!isTeacherBooking && !appointmentData.teacherId) {
      errors.push('Teacher ID is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Export token management utilities (unchanged)
export const tokenManager = {
  setUserToken: (token) => localStorage.setItem('userToken', token),
  getUserToken: () => localStorage.getItem('userToken'),
  removeUserToken: () => localStorage.removeItem('userToken'),
  
  setAdminToken: (token) => localStorage.setItem('adminToken', token),
  getAdminToken: () => localStorage.getItem('adminToken'),
  removeAdminToken: () => localStorage.removeItem('adminToken'),
  
  setTeacherToken: (token) => localStorage.setItem('teacherToken', token),
  getTeacherToken: () => localStorage.getItem('teacherToken'),
  removeTeacherToken: () => localStorage.removeItem('teacherToken'),
  
  clearAllTokens: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('user');
  }
};

// Updated constants with new appointment statuses
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
    'pending',    // Student requested, waiting for teacher response
    'confirmed',  // Teacher accepted the request
    'rejected',   // Teacher rejected the request
    'cancelled',  // Cancelled by either party
    'completed',  // Appointment completed
    'booked'      // Direct booking by teacher (no approval needed)
  ],

  APPOINTMENT_TYPES: {
    STUDENT_REQUEST: 'student_request',  // Student requests, teacher approves
    TEACHER_BOOKING: 'teacher_booking'   // Teacher books directly
  }
};

export default api;