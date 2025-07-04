const express = require('express');
const { body } = require('express-validator');
const {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  permanentDeleteTeacher,
  getTeachersByDepartment,
  getTeacherStats
} = require('../controllers/teacherControllers');

const router = express.Router();

// Validation middleware
const teacherValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage('Name can only contain letters, spaces, and dots'),
  
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
    .isLength({ min: 2, max: 50 })
    .withMessage('Subject must be between 2 and 50 characters'),
  
  body('experience')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Experience is required and must be less than 50 characters'),
  
  body('qualification')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Qualification must be between 5 and 100 characters'),
  
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
    .withMessage('Invalid availability slot')
];

const updateTeacherValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s.]+$/)
    .withMessage('Name can only contain letters, spaces, and dots'),
  
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
    .isLength({ min: 2, max: 50 })
    .withMessage('Subject must be between 2 and 50 characters'),
  
  body('experience')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Experience must be less than 50 characters'),
  
  body('qualification')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Qualification must be between 5 and 100 characters'),
  
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
    .withMessage('Invalid availability slot')
];

// Routes (Fixed route ordering)
// Special routes first
router.get('/stats', getTeacherStats);
router.get('/department/:department', getTeachersByDepartment);

// CRUD routes
router.get('/', getAllTeachers);
router.get('/:id', getTeacherById);
router.post('/', teacherValidation, createTeacher);  // Fixed: Changed from '/teachers' to '/'
router.put('/:id', updateTeacherValidation, updateTeacher);
router.delete('/:id', deleteTeacher);
router.delete('/:id/permanent', permanentDeleteTeacher);

module.exports = router;