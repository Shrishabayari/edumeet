const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  // Student perspective
  bookAppointmentStudent,
  getStudentAppointments,
  addStudentMessage,
  
  // Teacher perspective
  getTeacherAppointments,
  getPendingApprovals,
  approveAppointment,
  rejectAppointment,
  addTeacherMessage,
  
  // Common
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAppointmentStats
} = require('../controllers/appointmentController');

const router = express.Router();

// Validation error handler middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Validation middleware for student booking
const bookAppointmentValidation = [
  body('teacherId')
    .notEmpty()
    .withMessage('Teacher ID is required')
    .custom((value) => {
      if (typeof value === 'string' && value.length > 0) {
        return true;
      }
      throw new Error('Valid teacher ID is required');
    }),
    
  body('day')
    .notEmpty()
    .withMessage('Day is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day'),
    
  body('time')
    .notEmpty()
    .withMessage('Time is required')
    .custom((value) => {
      const validTimes = [
        '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM',
        '12:00 PM - 1:00 PM', '2:00 PM - 3:00 PM', '3:00 PM - 4:00 PM',
        '4:00 PM - 5:00 PM', '5:00 PM - 6:00 PM'
      ];
      
      if (validTimes.includes(value)) {
        return true;
      }
      
      const timeRegex = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)(\s?-\s?([0-9]{1,2}):([0-9]{2})\s?(AM|PM))?$/i;
      if (timeRegex.test(value)) {
        return true;
      }
      
      throw new Error('Invalid time format');
    }),
    
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      return true;
    }),
    
  body('student.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Student name must be between 2 and 100 characters'),
    
  body('student.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
    
  body('student.phone')
    .optional()
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
      if (phoneRegex.test(value)) {
        return true;
      }
      throw new Error('Invalid phone number format');
    }),
    
  body('student.subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
    
  body('student.message')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters')
];

// Validation for updating appointments
const updateAppointmentValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'cancelled', 'completed', 'rejected'])
    .withMessage('Invalid status'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation for messages
const messageValidation = [
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),
    
  body('messageType')
    .optional()
    .isIn(['approval', 'rejection', 'inquiry', 'confirmation', 'modification', 'cancellation'])
    .withMessage('Invalid message type')
];

// Validation for teacher actions
const teacherActionValidation = [
  body('teacherNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Teacher notes cannot exceed 500 characters'),
    
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters')
];

// =============================================================================
// STUDENT ROUTES
// =============================================================================

// Student books appointment
router.post('/student/book', bookAppointmentValidation, handleValidationErrors, bookAppointmentStudent);

// Get appointments for a specific student
router.get('/student/:email', getStudentAppointments);

// Student adds message to appointment
router.post('/student/:id/message', messageValidation, handleValidationErrors, addStudentMessage);

// =============================================================================
// TEACHER ROUTES
// =============================================================================

// Get all appointments for a teacher (with optional filtering)
router.get('/teacher/:teacherId', getTeacherAppointments);

// Get pending approvals for a teacher
router.get('/teacher/:teacherId/pending', getPendingApprovals);

// Teacher approves an appointment
router.post('/teacher/:id/approve', teacherActionValidation, handleValidationErrors, approveAppointment);

// Teacher rejects an appointment
router.post('/teacher/:id/reject', teacherActionValidation, handleValidationErrors, rejectAppointment);

// Teacher adds message to appointment
router.post('/teacher/:id/message', messageValidation, handleValidationErrors, addTeacherMessage);

// =============================================================================
// COMMON ROUTES
// =============================================================================

// Get appointment statistics
router.get('/stats', getAppointmentStats);

// Get all appointments (admin view)
router.get('/', getAllAppointments);

// Get specific appointment by ID
router.get('/:id', getAppointmentById);

// Update appointment (general)
router.put('/:id', updateAppointmentValidation, handleValidationErrors, updateAppointment);

// Cancel appointment
router.delete('/:id', cancelAppointment);

module.exports = router;