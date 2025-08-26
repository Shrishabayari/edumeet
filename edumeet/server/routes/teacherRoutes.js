const express = require('express');
const { body, param } = require('express-validator');
const {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  permanentDeleteTeacher,
  getTeachersByDepartment,
  getTeacherStats,
  teacherLogin,
  sendAccountSetupLink,
  setupTeacherAccount,
  getTeacherProfile,
  updateTeacherProfile,
  teacherLogout,
  approveTeacher,
  rejectTeacher
} = require('../controllers/teacherControllers');
const { 
  protect, 
  authorize, 
  validateObjectId,
  authenticateAdmin,
  authenticateTeacher
} = require('../middleware/auth');

const router = express.Router();

// Validation middleware for teacher creation
const teacherValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Name can only contain letters, spaces, dots, hyphens, and apostrophes'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('department')
    .isIn([
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
    ])
    .withMessage('Please select a valid department'),
  
  body('subject')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Subject is required and must be less than 50 characters'),
  
  body('experience')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Experience is required and must be less than 50 characters'),
  
  body('qualification')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Qualification is required and must be less than 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array'),
  
  body('availability.*')
    .optional()
    .isIn([
      '9:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 PM - 1:00 PM',
      '2:00 PM - 3:00 PM',
      '3:00 PM - 4:00 PM',
      '4:00 PM - 5:00 PM',
      '5:00 PM - 6:00 PM'
    ])
    .withMessage('Invalid availability slot'),

  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

// Validation middleware for teacher updates
const updateTeacherValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s.'-]+$/)
    .withMessage('Name can only contain letters, spaces, dots, hyphens, and apostrophes'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),
  
  body('department')
    .optional()
    .isIn([
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
    ])
    .withMessage('Please select a valid department'),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Subject must be less than 50 characters'),
  
  body('experience')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Experience must be less than 50 characters'),
  
  body('qualification')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Qualification must be less than 100 characters'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array'),
  
  body('availability.*')
    .optional()
    .isIn([
      '9:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 PM - 1:00 PM',
      '2:00 PM - 3:00 PM',
      '3:00 PM - 4:00 PM',
      '4:00 PM - 5:00 PM',
      '5:00 PM - 6:00 PM'
    ])
    .withMessage('Invalid availability slot'),

  body('approvalStatus')
    .optional()
    .isIn(['pending', 'approved', 'rejected'])
    .withMessage('Invalid approval status')
];

// Validation for teacher profile updates (by teachers themselves)
const profileUpdateValidation = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array'),
  
  body('availability.*')
    .optional()
    .isIn([
      '9:00 AM - 10:00 AM',
      '10:00 AM - 11:00 AM',
      '11:00 AM - 12:00 PM',
      '12:00 PM - 1:00 PM',
      '2:00 PM - 3:00 PM',
      '3:00 PM - 4:00 PM',
      '4:00 PM - 5:00 PM',
      '5:00 PM - 6:00 PM'
    ])
    .withMessage('Invalid availability slot'),

  body('phone')
    .optional()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number')
];

// Authentication validation middlewares
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1 })
    .withMessage('Password cannot be empty')
];

const setupValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const sendSetupLinkValidation = [
  body('teacherId')
    .notEmpty()
    .withMessage('Teacher ID is required')
    .isMongoId()
    .withMessage('Invalid teacher ID format')
];

const departmentValidation = [
  param('department')
    .isIn([
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
    ])
    .withMessage('Invalid department')
];

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Get all teachers with filtering and pagination
router.get('/', getAllTeachers);

// Get teachers by department
router.get('/department/:department', departmentValidation, getTeachersByDepartment);

// Get single teacher by ID
router.get('/:id', validateObjectId('id'), getTeacherById);

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Teacher login
router.post('/login', loginValidation, teacherLogin);

// Setup teacher account (public route with token verification)
router.post('/setup-account/:token', setupValidation, setupTeacherAccount);

// ============================================
// TEACHER PROTECTED ROUTES
// ============================================

// Teacher logout
router.post('/logout', authenticateTeacher, teacherLogout);

// Get teacher's own profileteachers
router.get('/profile/me', authenticateTeacher, getTeacherProfile);

// Update teacher's own profile (limited fields)
router.put('/profile/me', authenticateTeacher, profileUpdateValidation, updateTeacherProfile);

// ============================================
// ADMIN PROTECTED ROUTES
// ============================================

// Get teacher statistics
router.get('/admin/stats', authenticateAdmin, getTeacherStats);

// Send account setup link
router.post('/admin/send-setup-link', authenticateAdmin, sendSetupLinkValidation, sendAccountSetupLink);

// Create new teacher
router.post('/admin/create', authenticateAdmin, teacherValidation, createTeacher);

// Update teacher (admin can update any field)
router.put('/admin/:id', authenticateAdmin, validateObjectId('id'), updateTeacherValidation, updateTeacher);

// Approve teacher
router.patch('/admin/:id/approve', authenticateAdmin, validateObjectId('id'), approveTeacher);

// Reject teacher
router.patch('/admin/:id/reject', authenticateAdmin, validateObjectId('id'), rejectTeacher);

// Soft delete teacher
router.delete('/admin/:id', authenticateAdmin, validateObjectId('id'), deleteTeacher);

// Permanently delete teacher
router.delete('/admin/:id/permanent', authenticateAdmin, validateObjectId('id'), permanentDeleteTeacher);

// ============================================
// LEGACY ROUTES (for backward compatibility)
// ============================================

// These routes maintain backward compatibility with existing frontend
router.get('/stats', authenticateAdmin, getTeacherStats);
router.post('/send-setup-link', authenticateAdmin, sendSetupLinkValidation, sendAccountSetupLink);
router.get('/profile', authenticateTeacher, getTeacherProfile);
router.post('/', authenticateAdmin, teacherValidation, createTeacher);
router.put('/:id', authenticateAdmin, validateObjectId('id'), updateTeacherValidation, updateTeacher);
router.delete('/:id', authenticateAdmin, validateObjectId('id'), deleteTeacher);
router.delete('/:id/permanent', authenticateAdmin, validateObjectId('id'), permanentDeleteTeacher);

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

// Handle 404 for teacher routes
router.all('*', (req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found in teacher routes`,
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /api/teachers - Get all teachers',
      'GET /api/teachers/:id - Get teacher by ID', 
      'GET /api/teachers/department/:department - Get teachers by department',
      'POST /api/teachers/login - Teacher login',
      'GET /api/teachers/profile/me - Get own profile (teacher)',
      'PUT /api/teachers/profile/me - Update own profile (teacher)',
      'POST /api/teachers/admin/create - Create teacher (admin)',
      'GET /api/teachers/admin/stats - Get statistics (admin)'
    ]
  });
});

module.exports = router;