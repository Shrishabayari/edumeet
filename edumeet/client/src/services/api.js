// client/src/api.js (EduMeet API Configuration)
import axios from 'axios';

// Prioritize environment variable, then remote server, then local development server
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://edumeet-server.onrender.com' || 'http://localhost:5000';

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
  },

  // Teacher endpoints
  teachers: {
    getAll: '/teachers',
    getById: (id) => `/teachers/${id}`,
    create: '/teachers',
    update: (id) => `/teachers/${id}`,
    delete: (id) => `/teachers/${id}`,
    permanentDelete: (id) => `/teachers/${id}/permanent`,
    getByDepartment: (department) => `/teachers/department/${department}`,
    getStats: '/teachers/stats',
    
    // Teacher Auth
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
    
    // User approval (from auth routes)
    getPendingRegistrations: '/auth/admin/pending',
    getAllUsers: '/auth/admin/users',
    approveUser: (id) => `/auth/admin/approve/${id}`,
    rejectUser: (id) => `/auth/admin/reject/${id}`,
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

  // User Approval Operations (Admin)
  getPendingRegistrations: () => api.get(endpoints.admin.getPendingRegistrations),
  getAllUsersForAdmin: (params = {}) => api.get(endpoints.admin.getAllUsers, { params }),
  approveUser: (id) => api.put(endpoints.admin.approveUser(id)),
  rejectUser: (id, reason) => api.put(endpoints.admin.rejectUser(id), { reason }),

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

  // Enhanced teacher update with multiple endpoint attempts
  updateTeacherWithFallback: async (id, teacherData) => {
    const endpoints = [
      { url: `/teachers/${id}`, method: 'PUT' },
      { url: `/teachers/${id}`, method: 'PATCH' },
      { url: `/admin/teachers/${id}`, method: 'PUT' },
      { url: `/admin/teachers/${id}`, method: 'PATCH' },
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Trying teacher update: ${endpoint.method} ${endpoint.url}`);
        const response = await api.request({
          method: endpoint.method,
          url: endpoint.url,
          data: teacherData
        });
        console.log(`✅ Success with: ${endpoint.method} ${endpoint.url}`);
        return response;
      } catch (error) {
        lastError = error;
        console.log(`❌ Failed with: ${endpoint.method} ${endpoint.url} - ${error.response?.status || error.message}`);
        
        // If we get a non-404 error, it might be a different issue, so break
        if (error.response?.status !== 404) {
          break;
        }
      }
    }

    throw lastError || new Error('All teacher update endpoints failed');
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
    const params = { q: query, ...filters };
    return api.get(endpoints.teachers.getAll, { params });
  },

  searchAppointments: (query, filters = {}) => {
    const params = { search: query, ...filters };
    return api.get(endpoints.appointments.getAll, { params });
  },

  // Bulk operations
  bulkUpdateTeachers: (teacherIds, updateData) => {
    return api.patch('/teachers/bulk-update', { ids: teacherIds, data: updateData });
  },

  bulkDeleteAppointments: (appointmentIds) => {
    return api.delete('/appointments/bulk-delete', { data: { ids: appointmentIds } });
  },
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

export default api;