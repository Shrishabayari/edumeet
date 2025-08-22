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
        field: error.path || error.param,
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
      // Validate time formats: "9:00 AM", "2:00 PM - 3:00 PM", etc.
      const timeRegex = /^([0-9]{1,2}):([0-9]{2})\s?(AM|PM)(\s?-\s?([0-9]{1,2}):([0-9]{2})\s?(AM|PM))?$/i;
      if (timeRegex.test(value)) {
        return true;
      }
      throw new Error('Invalid time format. Use formats like "2:00 PM" or "2:00 PM - 3:00 PM"');
    }),
    
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in valid ISO format (YYYY-MM-DD)')
    .custom((value) => {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
      }
      
      // Check if date is not in the past (allow today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        throw new Error('Appointment date must be today or in the future');
      }
      
      // Check if date is not too far in the future (1 year)
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
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Student name can only contain letters, spaces, hyphens and apostrophes'),
    
  body('student.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required')
    .isLength({ max: 255 })
    .withMessage('Email cannot exceed 255 characters'),
    
  body('student.phone')
    .optional({ values: 'falsy' })
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
    .isISO8601()
    .withMessage('Date must be in valid ISO format')
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
    .toInt()
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'booked'])
    .withMessage('Invalid status filter'),
  query('createdBy')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('Invalid createdBy filter'),
  query('teacherId')
    .optional()
    .isMongoId()
    .withMessage('Invalid teacher ID format')
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
        'GET /api/appointments/stats': 'Get appointment statistics',
        'POST /api/appointments/request': 'Student request appointment',
        'POST /api/appointments/book': 'Teacher book appointment',
        'GET /api/appointments/teacher/pending': 'Get pending requests for current teacher',
        'GET /api/appointments/teacher/:teacherId/pending': 'Get pending requests for teacher',
        'GET /api/appointments/teacher/appointments': 'Get appointments for current teacher',
        'GET /api/appointments/teacher/:teacherId': 'Get appointments for teacher',
        'PUT /api/appointments/:id/accept': 'Accept appointment request',
        'PUT /api/appointments/:id/reject': 'Reject appointment request',
        'PUT /api/appointments/:id/complete': 'Complete appointment',
        'PUT /api/appointments/:id/cancel': 'Cancel appointment',
        'GET /api/appointments': 'Get all appointments',
        'GET /api/appointments/:id': 'Get appointment by ID',
        'PUT /api/appointments/:id': 'Update appointment',
        'DELETE /api/appointments/:id': 'Delete appointment (admin only)'
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
// Current teacher's pending requests
router.get('/teacher/pending', 
  protect, 
  authorize('teacher'), 
  (req, res) => {
    // Set teacherId from authenticated user
    req.params.teacherId = req.user.id;
    getTeacherPendingRequests(req, res);
  }
);

// Specific teacher's pending requests (admin or the teacher themselves)
router.get('/teacher/:teacherId/pending', 
  paramValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'), 
  getTeacherPendingRequests
);

// Current teacher's appointments
router.get('/teacher/appointments', 
  queryValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher'), 
  (req, res) => {
    // Set teacherId from authenticated user
    req.params.teacherId = req.user.id;
    getTeacherAppointments(req, res);
  }
);

// Specific teacher's appointments (admin or the teacher themselves)
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
  acceptAppointmentRequest
);

router.put('/:id/reject', 
  paramValidation,
  responseValidation, 
  handleValidationErrors,
  protect, 
  authorize('teacher'), 
  rejectAppointmentRequest
);

router.put('/:id/complete', 
  paramValidation,
  handleValidationErrors,
  protect, 
  authorize('teacher', 'admin'), 
  completeAppointment
);

router.put('/:id/cancel', 
  paramValidation,
  cancellationValidation, 
  handleValidationErrors,
  protect,
  authorize('teacher', 'admin'),
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
      const Appointment = require('../models/Appointment');
      const appointment = await Appointment.findByIdAndDelete(id);
      
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

// Error handling middleware for unmatched routes
router.use('*', (req, res) => {
  console.log(`⚠️  Unmatched appointment route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /api/appointments/stats',
      'POST /api/appointments/request',
      'POST /api/appointments/book',
      'GET /api/appointments/teacher/pending',
      'GET /api/appointments/teacher/:teacherId/pending',
      'GET /api/appointments/teacher/appointments',
      'GET /api/appointments/teacher/:teacherId',
      'PUT /api/appointments/:id/accept',
      'PUT /api/appointments/:id/reject',
      'PUT /api/appointments/:id/complete',
      'PUT /api/appointments/:id/cancel',
      'GET /api/appointments',
      'GET /api/appointments/:id',
      'PUT /api/appointments/:id',
      'DELETE /api/appointments/:id'
    ]
  });
});

console.log('✅ Appointment routes setup complete with proper ordering, validation, and authentication');

module.exports = router;