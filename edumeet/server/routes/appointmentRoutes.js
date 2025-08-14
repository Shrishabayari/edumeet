const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authenticateTeacher, authorize } = require('../middleware/auth');
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
      if (date < new Date(new Date().toDateString())) {
        throw new Error('Appointment date must be today or in the future');
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

// Student appointment request validation
const requestAppointmentValidation = [
  ...appointmentValidation,
  body('teacherId')
    .notEmpty()
    .withMessage('Teacher ID is required')
    .isMongoId()
    .withMessage('Valid teacher ID is required')
];

// Teacher direct booking validation
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

console.log('🚀 Setting up appointment routes...');

router.get('/debug/routes', (req, res) => {
  res.json({
    success: true,
    message: 'Appointment routes active',
    timestamp: new Date().toISOString()
  });
});

// STATISTICS ROUTE
router.get('/stats', protect, getAppointmentStats);

// POST ROUTES
router.post('/request', requestAppointmentValidation, handleValidationErrors, requestAppointment);
router.post('/book', protect, authorize('teacher'), teacherBookingValidation, handleValidationErrors, teacherBookAppointment);

// TEACHER-SPECIFIC ROUTES (must come before /:id routes)
router.get('/teacher/:teacherId/pending', protect, authorize('teacher'), getTeacherPendingRequests);
router.get('/teacher/:teacherId', protect, authorize('teacher'), getTeacherAppointments);

// ACTION ROUTES WITH ID (must come before generic /:id)
router.put('/:id/accept', 
  protect, 
  authorize('teacher'), 
  responseValidation, 
  handleValidationErrors, 
  acceptAppointmentRequest
);

router.put('/:id/reject', 
  protect, 
  authorize('teacher'), 
  responseValidation, 
  handleValidationErrors, 
  rejectAppointmentRequest
);

router.put('/:id/complete', protect, authorize('teacher'), completeAppointment);
router.put('/:id/cancel', protect, cancellationValidation, handleValidationErrors, cancelAppointment);

// GENERIC ROUTES (MUST BE LAST)
router.get('/', protect, getAllAppointments);
router.get('/:id', protect, getAppointmentById);
router.put('/:id', protect, updateAppointmentValidation, handleValidationErrors, updateAppointment);
router.delete('/:id', protect, cancellationValidation, handleValidationErrors, cancelAppointment);


// ================================================================
// 7. LEGACY ROUTES (for backward compatibility)
// ================================================================
router.post('/', 
  (req, res, next) => {
    console.log('🎯 LEGACY POST ROUTE (using request logic)');
    next();
  },
  requestAppointmentValidation, 
  handleValidationErrors, 
  requestAppointment
);

// Route testing middleware (development only)
if (process.env.NODE_ENV === 'development') {
  router.use('*', (req, res, next) => {
    console.log(`⚠️  Route not matched: ${req.method} ${req.originalUrl}`);
    next();
  });
}

console.log('✅ Appointment routes setup complete with proper ordering and authentication');

module.exports = router;