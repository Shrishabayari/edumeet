const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { 
  protect, 
  authenticateTeacher, 
  authorize, 
  validateObjectId,
  checkTeacherAppointmentAccess 
} = require('../middleware/auth');
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
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// Common appointment validation rules
const appointmentValidation = [
  body('day')
    .notEmpty()
    .withMessage('Day is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day. Must be a valid day of the week'),
    
  body('time')
    .notEmpty()
    .withMessage('Time is required')
    .custom((value) => {
      // Validate common time formats
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
      
      // Allow custom time format validation
      const timeRegex = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)(\s?-\s?([0-9]{1,2}):([0-9]{2})\s?(AM|PM))?$/i;
      if (timeRegex.test(value)) {
        return true;
      }
      
      throw new Error('Invalid time format. Use formats like "2:00 PM" or "2:00 PM - 3:00 PM"');
    }),
    
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Check if date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        throw new Error('Appointment date must be today or in the future');
      }
      
      // Check if date is not too far in the future (e.g., 1 year)
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (appointmentDate > oneYearFromNow) {
        throw new Error('Appointment date cannot be more than 1 year in the future');
      }
      
      return true;
    }),
    
  body('student.name')
    .trim()
    .notEmpty()
    .withMessage('Student name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Student name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Student name can only contain letters and spaces'),
    
  body('student.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),
    
  body('student.phone')
    .optional()
    .custom((value) => {
      if (!value || value.trim() === '') return true;
      const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,20}$/;
      if (phoneRegex.test(value.trim())) {
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
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
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
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
    
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

// Query parameter validation
const queryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'booked'])
    .withMessage('Invalid status filter'),
  query('createdBy')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('Invalid createdBy filter')
];

// Parameter validation
const paramValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid appointment ID'),
  param('teacherId')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID')
];

console.log('🚀 Setting up appointment routes...');

// Debug route for development
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/routes', (req, res) => {
    res.json({
      success: true,
      message: 'Appointment routes active',
      timestamp: new Date().toISOString(),
      routes: {
        'GET /appointments/stats': 'Get appointment statistics',
        'POST /appointments/request': 'Student request appointment',
        'POST /appointments/book': 'Teacher book appointment',
        'GET /appointments/teacher/:teacherId/pending': 'Get pending requests for teacher',
        'GET /appointments/teacher/:teacherId': 'Get appointments for teacher',
        'PUT /appointments/:id/accept': 'Accept appointment request',
        'PUT /appointments/:id/reject': 'Reject appointment request',
        'PUT /appointments/:id/complete': 'Complete appointment',
        'PUT /appointments/:id/cancel': 'Cancel appointment',
        'GET /appointments': 'Get all appointments',
        'GET /appointments/:id': 'Get appointment by ID',
        'PUT /appointments/:id': 'Update appointment'
      }
    });
  });
}

// STATISTICS ROUTE (must be before /:id routes to avoid conflicts)
router.get('/stats', 
  protect, 
  queryValidation,
  handleValidationErrors,
  getAppointmentStats
);

// POST ROUTES - Student request and Teacher direct booking
router.post('/request', 
  requestAppointmentValidation, 
  handleValidationErrors, 
  requestAppointment
);

router.post('/book', 
  protect, 
  authorize('teacher'), 
  teacherBookingValidation, 
  handleValidationErrors, 
  teacherBookAppointment
);

// TEACHER-SPECIFIC ROUTES (must come before generic /:id routes)
router.get('/teacher/:teacherId/pending', 
  paramValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'), 
  getTeacherPendingRequests
);

router.get('/teacher/:teacherId', 
  paramValidation,
  queryValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'), 
  getTeacherAppointments
);

// ACTION ROUTES WITH ID (must come before generic /:id to avoid conflicts)
router.put('/:id/accept', 
  paramValidation,
  responseValidation, 
  handleValidationErrors,
  protect, 
  authorize('teacher'), 
  checkTeacherAppointmentAccess,
  acceptAppointmentRequest
);

router.put('/:id/reject', 
  paramValidation,
  responseValidation, 
  handleValidationErrors,
  protect, 
  authorize('teacher'), 
  checkTeacherAppointmentAccess,
  rejectAppointmentRequest
);

router.put('/:id/complete', 
  paramValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'), 
  checkTeacherAppointmentAccess,
  completeAppointment
);

router.put('/:id/cancel', 
  paramValidation,
  cancellationValidation, 
  handleValidationErrors,
  protect,
  authorize('teacher', 'admin'),
  checkTeacherAppointmentAccess,
  cancelAppointment
);

// GENERIC CRUD ROUTES (MUST BE LAST to avoid route conflicts)
router.get('/', 
  queryValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'),
  getAllAppointments
);

router.get('/:id', 
  paramValidation,
  handleValidationErrors,
  protect, 
  checkTeacherAppointmentAccess,
  getAppointmentById
);

router.put('/:id', 
  paramValidation,
  updateAppointmentValidation, 
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'),
  checkTeacherAppointmentAccess,
  updateAppointment
);

// DELETE route for hard deletion (admin only)
router.delete('/:id', 
  paramValidation,
  handleValidationErrors,
  protect, 
  authorize('admin'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const appointment = await require('../models/Appointment').findByIdAndDelete(id);
      
      if (!appointment) {
        return res.status(404).json({
          success: false,
          message: 'Appointment not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Appointment deleted successfully',
        data: appointment
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete appointment',
        error: error.message
      });
    }
  }
);

// Legacy route for backward compatibility
router.post('/', 
  (req, res, next) => {
    console.log('🎯 LEGACY POST ROUTE (redirecting to request)');
    next();
  },
  requestAppointmentValidation, 
  handleValidationErrors, 
  requestAppointment
);

// Error handling middleware for unmatched routes
router.use('*', (req, res) => {
  console.log(`⚠️  Unmatched appointment route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /appointments/stats',
      'POST /appointments/request',
      'POST /appointments/book',
      'GET /appointments/teacher/:teacherId/pending',
      'GET /appointments/teacher/:teacherId',
      'PUT /appointments/:id/accept',
      'PUT /appointments/:id/reject',
      'PUT /appointments/:id/complete',
      'PUT /appointments/:id/cancel',
      'GET /appointments',
      'GET /appointments/:id',
      'PUT /appointments/:id',
      'DELETE /appointments/:id'
    ]
  });
});

console.log('✅ Appointment routes setup complete with proper ordering, validation, and authentication');

module.exports = router;