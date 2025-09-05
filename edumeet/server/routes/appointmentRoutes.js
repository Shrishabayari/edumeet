const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  getAllAppointments,
  getAppointmentById,
  requestAppointment,
  teacherBookAppointment,
  acceptAppointmentRequest,
  rejectAppointmentRequest,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  getTeacherPendingRequests,
  getTeacherAppointments,
  getAppointmentStats,
  // NEW IMPORTS - Add these
  getCurrentUserAppointments,
  getCurrentUserUpcomingAppointments,
  getCurrentUserAppointmentHistory
} = require('../controllers/appointmentController');

// Import auth middleware
const { protect } = require('../middleware/auth');

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

// Common appointment validation
const appointmentValidation = [
  body('day')
    .notEmpty()
    .withMessage('Day is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day'),
    
  body('time')
    .notEmpty()
    .withMessage('Time is required')
    .custom((value) => {
      // Accept various time formats
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
      
      // Also accept any time format that looks like a time
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
      // Check if date is in the future
      if (date < new Date()) {
        throw new Error('Appointment date must be in the future');
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
      // More flexible phone validation
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

// Student appointment request validation
const requestAppointmentValidation = [
  ...appointmentValidation,
  body('teacherId')
    .notEmpty()
    .withMessage('Teacher ID is required')
    .custom((value) => {
      if (typeof value === 'string' && value.length > 0) {
        return true;
      }
      throw new Error('Valid teacher ID is required');
    })
];

// Teacher direct booking validation (no teacherId needed as it comes from auth)
const teacherBookingValidation = [
  ...appointmentValidation,
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Response validation for accept/reject
const responseValidation = [
  body('responseMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Response message cannot exceed 500 characters')
];

// Update appointment validation
const updateAppointmentValidation = [
  body('status')
    .optional()
    .isIn(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'booked'])
    .withMessage('Invalid status'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
    
  body('time')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const timeRegex = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)(\s?-\s?([0-9]{1,2}):([0-9]{2})\s?(AM|PM))?$/i;
      if (timeRegex.test(value)) {
        return true;
      }
      throw new Error('Invalid time format');
    }),
    
  body('date')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      return true;
    })
];

// Cancellation validation
const cancellationValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters')
];

router.get('/stats', getAppointmentStats);

router.get('/my-appointments', protect, getCurrentUserAppointments);
router.get('/my-appointments/history', protect, getCurrentUserAppointmentHistory);

// 3. Teacher-specific routes (specific paths)
router.get('/teacher/:teacherId/pending', getTeacherPendingRequests);
router.get('/teacher/:teacherId', getTeacherAppointments);

// 4. Student requests appointment (specific path)
router.post('/request', protect, requestAppointmentValidation, handleValidationErrors, requestAppointment);

// 5. Teacher books appointment directly (specific path)
router.post('/book', protect, teacherBookingValidation, handleValidationErrors, teacherBookAppointment);

// 6. CRITICAL FIX: Appointment action routes (specific paths with parameters)
// These MUST come before the generic /:id routes
router.put('/:id/accept', protect, responseValidation, handleValidationErrors, acceptAppointmentRequest);
router.put('/:id/reject', protect, responseValidation, handleValidationErrors, rejectAppointmentRequest);
router.put('/:id/complete', protect, completeAppointment);
router.put('/:id/cancel', protect, cancellationValidation, handleValidationErrors, cancelAppointment);

// 7. Generic parameterized routes (MUST be last)
router.get('/', getAllAppointments);
router.get('/:id', getAppointmentById);
router.put('/:id', protect, updateAppointmentValidation, handleValidationErrors, updateAppointment);
router.delete('/:id', protect, cancellationValidation, handleValidationErrors, cancelAppointment);

// 8. Legacy route for backward compatibility (maps to request)
router.post('/', protect, requestAppointmentValidation, handleValidationErrors, requestAppointment);

module.exports = router;