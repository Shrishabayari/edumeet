const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getProfile,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Validation rules for registration
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
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher'),
  
  // Conditional validation for profile fields
  body('profile.phone')
    .optional()
    .matches(/^\d{10}$/)
    .withMessage('Phone number must be exactly 10 digits'),
  
  // Student-specific validation
  body('profile.grade')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('Grade is required for students')
    .isIn(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 
           'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
    .withMessage('Please select a valid grade'),
  
  // Teacher-specific validation
  body('profile.subject')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Subject is required for teachers')
    .isIn(['Mathematics', 'English', 'Science', 'History', 'Geography', 
           'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 
           'Music', 'Physical Education'])
    .withMessage('Please select a valid subject'),
  
  body('profile.department')
    .if(body('role').equals('teacher'))
    .notEmpty()
    .withMessage('Department is required for teachers')
    .isIn(['Mathematics', 'English', 'Science', 'Social Studies', 'Languages', 
           'Arts', 'Physical Education', 'Computer Science', 'Special Education'])
    .withMessage('Please select a valid department')
];

// Validation rules for login
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Validation rules for profile update
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
    .isIn(['Mathematics', 'English', 'Science', 'History', 'Geography', 
           'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Art', 
           'Music', 'Physical Education'])
    .withMessage('Please select a valid subject'),
  
  body('profile.department')
    .optional()
    .isIn(['Mathematics', 'English', 'Science', 'Social Studies', 'Languages', 
           'Arts', 'Physical Education', 'Computer Science', 'Special Education'])
    .withMessage('Please select a valid department')
];

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/logout', logout);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfileValidation, updateProfile);

// Additional routes for user management
router.get('/verify-token', protect, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user
    }
  });
});

module.exports = router;