// routes/adminRoutes.js - CORRECTED
const express = require('express');
const { body } = require('express-validator');
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getDashboardStats,
  getUsers,
  getAllAppointments,
  updateTeacherStatus,
  deleteUser
} = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin registration validation
const adminRegisterValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits')
];

// Admin login validation
const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Admin profile update validation
const adminProfileUpdateValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('department')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Department must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits')
];

// Teacher status update validation
const teacherStatusValidation = [
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended')
];

// Public Auth routes (no authentication required)
router.post('/register', adminRegisterValidation, registerAdmin);
router.post('/login', adminLoginValidation, loginAdmin);

// Protected routes (authentication required)
router.use(authenticateAdmin); // Apply authentication middleware to all routes below

// Admin profile management
router.get('/profile', getAdminProfile);
router.put('/profile', adminProfileUpdateValidation, updateAdminProfile);

// Dashboard and statistics
router.get('/dashboard', getDashboardStats);
router.get('/dashboard/stats', getDashboardStats); // Alternative endpoint

// User management
router.get('/users', getUsers);
router.delete('/users/:userId', deleteUser);

// Appointment management
router.get('/appointments', getAllAppointments);

// Teacher management
router.patch('/teachers/:teacherId/status', teacherStatusValidation, updateTeacherStatus);

// Health check endpoint for admin routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin routes are working correctly',
    timestamp: new Date().toISOString(),
    admin: {
      id: req.admin._id,
      name: req.admin.name,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

// Admin logout endpoint
router.post('/logout', (req, res) => {
  // In a stateless JWT system, logout is typically handled client-side
  // by removing the token from localStorage
  res.status(200).json({
    success: true,
    message: 'Logout successful. Please remove token from client storage.'
  });
});

module.exports = router;