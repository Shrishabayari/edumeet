const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authenticateTeacher } = require('../middleware/auth'); // Add authentication middleware
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

console.log('Setting up appointment routes...');

// CRITICAL FIX: PROPER ROUTE ORDERING
// ================================================================
// 1. STATIC ROUTES FIRST (no parameters)

// Statistics route (no parameters) - Public/Admin access
router.get('/stats', getAppointmentStats);

// Student requests appointment (public - no auth required)
router.post('/request', requestAppointmentValidation, handleValidationErrors, requestAppointment);

// Teacher books appointment directly (requires teacher auth)
router.post('/book', protect, teacherBookingValidation, handleValidationErrors, teacherBookAppointment);

// Debug route to check if routes are properly registered
router.get('/debug/routes', (req, res) => {
  const routes = [];
  router.stack.forEach((middleware) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods);
      routes.push({
        path: middleware.route.path,
        methods: methods
      });
    }
  });
  
  res.json({
    success: true,
    message: 'Appointment routes debug info',
    routes: routes,
    totalRoutes: routes.length
  });
});

// 2. SPECIFIC PARAMETERIZED ROUTES (teacher routes)

// Teacher-specific routes (specific paths with teacherId parameter)
router.get('/teacher/:teacherId/pending', protect, getTeacherPendingRequests);
router.get('/teacher/:teacherId', protect, getTeacherAppointments);

// 3. APPOINTMENT ACTION ROUTES - MUST COME BEFORE GENERIC /:id ROUTES
// These are the most critical routes that were causing the 404 error

// Accept appointment request (teacher only)
router.put('/:id/accept', 
  protect, // Require authentication
  responseValidation, 
  handleValidationErrors, 
  (req, res, next) => {
    console.log(`🔄 Processing accept request for appointment: ${req.params.id}`);
    console.log('Request user:', req.user);
    console.log('Request body:', req.body);
    next();
  },
  acceptAppointmentRequest
);

// Reject appointment request (teacher only)
router.put('/:id/reject', 
  protect, // Require authentication
  responseValidation, 
  handleValidationErrors,
  (req, res, next) => {
    console.log(`🔄 Processing reject request for appointment: ${req.params.id}`);
    console.log('Request user:', req.user);
    console.log('Request body:', req.body);
    next();
  },
  rejectAppointmentRequest
);

// Complete appointment (teacher only)
router.put('/:id/complete', 
  protect, // Require authentication
  (req, res, next) => {
    console.log(`🔄 Processing complete request for appointment: ${req.params.id}`);
    next();
  },
  completeAppointment
);

// Cancel appointment (teacher or student)
router.put('/:id/cancel', 
  protect, // Require authentication
  cancellationValidation, 
  handleValidationErrors,
  (req, res, next) => {
    console.log(`🔄 Processing cancel request for appointment: ${req.params.id}`);
    next();
  },
  cancelAppointment
);

// 4. GENERIC ROUTES (MUST BE LAST to avoid conflicts with action routes)

// Get all appointments
router.get('/', getAllAppointments);

// Get appointment by ID
router.get('/:id', getAppointmentById);

// Update appointment (generic update)
router.put('/:id', protect, updateAppointmentValidation, handleValidationErrors, updateAppointment);

// Delete appointment (using cancel logic)
router.delete('/:id', protect, cancellationValidation, handleValidationErrors, cancelAppointment);

// 5. LEGACY ROUTES for backward compatibility
router.post('/', requestAppointmentValidation, handleValidationErrors, requestAppointment);

console.log('✅ Appointment routes setup complete');

// Route debugging middleware to log all registered routes
router.use((req, res, next) => {
  console.log(`📍 Route attempted: ${req.method} ${req.originalUrl}`);
  console.log('Available routes:');
  router.stack.forEach((middleware, index) => {
    if (middleware.route) {
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      console.log(`  ${index + 1}. ${methods} ${middleware.route.path}`);
    }
  });
  next();
});

module.exports = router;