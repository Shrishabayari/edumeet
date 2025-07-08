const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile,
  getPendingRegistrations,
  approveUser,
  rejectUser,
  getAllUsers
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// Registration validation
const registerValidation = [
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
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('Role must be student or teacher'),
  
  body('profile.phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('profile.grade')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Grade is required for students')
    .isIn(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
           'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
    .withMessage('Please select a valid grade'),
  
  body('profile.subject')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Subject is required for teachers'),
  
  body('profile.department')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Department is required for teachers')
];

// Login validation
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Update profile validation
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('profile.phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  body('profile.grade')
    .optional()
    .isIn(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
           'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
    .withMessage('Please select a valid grade'),
  
  body('profile.subject')
    .optional()
    .notEmpty()
    .withMessage('Subject cannot be empty'),
  
  body('profile.department')
    .optional()
    .notEmpty()
    .withMessage('Department cannot be empty')
];

// Rejection validation
const rejectValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Rejection reason must be between 5 and 500 characters')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, updateProfile);

// Token verification
router.get('/verify-token', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user
    }
  });
});

// Admin only routes
router.get('/admin/pending', protect, restrictTo('admin'), getPendingRegistrations);
router.get('/admin/users', protect, restrictTo('admin'), getAllUsers);
router.put('/admin/approve/:id', protect, restrictTo('admin'), approveUser);
router.put('/admin/reject/:id', protect, restrictTo('admin'), rejectValidation, rejectUser);

module.exports = router;