// client/src/api.js (EduMeet API Configuration) - CORRECTED
import axios from 'axios';

// Prioritize environment variable, then remote server, then local development server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://edumeet.onrender.com' || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout for potentially slower network conditions
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
      token = localStorage.getItem('adminToken'); // Use 'adminToken' for admin routes
    } else if (config.url.startsWith('/teachers')) {
      token = localStorage.getItem('teacherToken'); // Use 'teacherToken' for teacher routes
    } else {
      token = localStorage.getItem('userToken'); // Use 'userToken' for regular user routes
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests only in development environment
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
        case 401: // Unauthorized
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
        case 403: // Forbidden
          console.error('Access forbidden: You do not have permission to perform this action.');
          break;
        case 404: // Not Found
          console.error('API endpoint not found:', error.config.url);
          break;
        case 500: // Internal Server Error
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

// API endpoints object for better organization
export const endpoints = {
  // Auth endpoints (for regular users)
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    profile: '/auth/profile',
    verifyToken: '/auth/verify-token',
    
    // CORRECTED: Admin routes under auth
    admin: {
      pending: '/auth/admin/pending',
      users: '/auth/admin/users',
      approve: (id) => `/auth/admin/approve/${id}`,
      reject: (id) => `/auth/admin/reject/${id}`,
    }
  },

  // Teacher endpoints - CORRECTED ACCORDING TO BACKEND ROUTES
  teachers: {
    // Basic CRUD operations
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    create: '/teachers',
    update: (id) => `/teachers/${id}`,
    delete: (id) => `/teachers/${id}`,
    permanentDelete: (id) => `/teachers/${id}/permanent`,
    
    // Special routes (must come before parameterized routes)
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
    book: '/appointments',
    update: (id) => `/appointments/${id}`,
    cancel: (id) => `/appointments/${id}`,
    getByTeacher: (teacherId) => `/appointments/teacher/${teacherId}`,
    getStats: '/appointments/stats',
  },

  // Admin endpoints
  admin: {
    // Admin Auth
    register: '/admin/register',
    login: '/admin/login',
    profile: '/admin/profile',
    updateProfile: '/admin/profile',
    
    // Admin Dashboard
    dashboardStats: '/admin/dashboard/stats',
    
    // User Management
    getUsers: '/admin/users',
    deleteUser: (userId) => `/admin/users/${userId}`,
    
    // Appointment Management
    getAllAppointments: '/admin/appointments',
    
    // Teacher Management
    updateTeacherStatus: (teacherId) => `/admin/teachers/${teacherId}/status`,
  },
  messages: {
  getByRoom: (roomId) => `/messages/room/${roomId}`,
  delete: (id) => `/messages/${id}`,
  getRoomStats: (roomId) => `/messages/room/${roomId}/stats`
}
};

// Convenience methods for common API operations
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

  // Appointment Operations
  getAllAppointments: (params = {}) => api.get(endpoints.appointments.getAll, { params }),
  getAppointmentById: (id) => api.get(endpoints.appointments.getById(id)),
  bookAppointment: (appointmentData) => api.post(endpoints.appointments.book, appointmentData),
  updateAppointment: (id, data) => api.put(endpoints.appointments.update(id), data),
  cancelAppointment: (id) => api.delete(endpoints.appointments.cancel(id)),
  getTeacherAppointments: (teacherId, params = {}) => api.get(endpoints.appointments.getByTeacher(teacherId), { params }),
  getAppointmentStats: () => api.get(endpoints.appointments.getStats),

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

  // CORRECTED: User Approval Operations (Admin) - using auth endpoints
  getPendingRegistrations: () => api.get(endpoints.auth.admin.pending),
  getAllUsersForAdmin: (params = {}) => api.get(endpoints.auth.admin.users, { params }),
  approveUser: (id) => api.put(endpoints.auth.admin.approve(id)),
  rejectUser: (id, reason) => api.put(endpoints.auth.admin.reject(id), { reason }),

  // Enhanced appointment booking with better error handling
  bookAppointmentWithRetry: async (appointmentData) => {
    const maxRetries = 3;
    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Booking appointment attempt ${i + 1}/${maxRetries}`);
        const response = await api.post(endpoints.appointments.book, appointmentData);
        console.log(`✅ Appointment booked successfully on attempt ${i + 1}`);
        return response;
      } catch (error) {
        lastError = error;
        console.log(`❌ Booking attempt ${i + 1} failed:`, error.message);
        
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

    throw lastError || new Error('All appointment booking attempts failed');
  },

  // Enhanced teacher update with proper endpoint
  updateTeacherWithValidation: async (id, teacherData) => {
    try {
      console.log(`🔄 Updating teacher: PUT /teachers/${id}`);
      const response = await api.put(endpoints.teachers.update(id), teacherData);
      console.log(`✅ Teacher updated successfully`);
      return response;
    } catch (error) {
      console.error(`❌ Teacher update failed:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Helper method to handle file uploads (if needed for teacher profiles)
  uploadFile: async (file, type = 'profile') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Search functionality
  searchTeachers: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.teachers.getAll, { params });
  },

  searchAppointments: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.appointments.getAll, { params });
  },

  // Department validation helper
  validateDepartment: (department) => {
    const validDepartments = [
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
    ];
    return validDepartments.includes(department);
  },

  // Availability validation helper
  validateAvailability: (timeSlot) => {
    const validSlots = [
      '9:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 PM - 1:00 PM',
      '2:00 PM - 3:00 PM',
      '3:00 PM - 4:00 PM',
      '4:00 PM - 5:00 PM',
      '5:00 PM - 6:00 PM'
    ];
    return validSlots.includes(timeSlot);
  },

  // Teacher data validation before API call
  validateTeacherData: (teacherData) => {
    const errors = [];
    
    // Required fields validation
    if (!teacherData.name || teacherData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!teacherData.email || !/\S+@\S+\.\S+/.test(teacherData.email)) {
      errors.push('Valid email is required');
    }
    
    if (!teacherData.phone || !/^[\d]{10}$/.test(teacherData.phone)) {
      errors.push('Valid phone number is required');
    }
    
    if (!teacherData.department || !apiMethods.validateDepartment(teacherData.department)) {
      errors.push('Valid department is required');
    }
    
    if (!teacherData.subject || teacherData.subject.trim().length < 2) {
      errors.push('Subject must be at least 2 characters long');
    }
    
    if (!teacherData.experience || teacherData.experience.trim().length < 1) {
      errors.push('Experience is required');
    }
    
    if (!teacherData.qualification || teacherData.qualification.trim().length < 5) {
      errors.push('Qualification must be at least 5 characters long');
    }
    
    // Availability validation
    if (teacherData.availability && Array.isArray(teacherData.availability)) {
      const invalidSlots = teacherData.availability.filter(slot => 
        !apiMethods.validateAvailability(slot)
      );
      if (invalidSlots.length > 0) {
        errors.push(`Invalid availability slots: ${invalidSlots.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Export token management utilities
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

// Export constants for validation
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
    'cancelled',
    'completed'
  ]
};

export default api;