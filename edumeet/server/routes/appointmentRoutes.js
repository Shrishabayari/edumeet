const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authenticateTeacher } = require('../middleware/auth');
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

// Middleware to handle authentication errors gracefully
const optionalAuth = (req, res, next) => {
  // Try to use protect middleware, but don't fail if no token
  if (req.headers.authorization) {
    return protect(req, res, next);
  } else {
    // No token provided, continue without authentication
    req.user = null;
    next();
  }
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

// Statistics route (public access)
router.get('/stats', getAppointmentStats);

// Student requests appointment (public - no auth required for students)
router.post('/request', requestAppointmentValidation, handleValidationErrors, requestAppointment);

// Teacher books appointment directly (requires authentication)
router.post('/book', optionalAuth, teacherBookingValidation, handleValidationErrors, teacherBookAppointment);

// Debug route
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

// 2. TEACHER-SPECIFIC ROUTES (with teacherId parameter)

// Teacher pending requests (allow both authenticated and parameter-based access)
router.get('/teacher/:teacherId/pending', optionalAuth, getTeacherPendingRequests);

// Teacher appointments (allow both authenticated and parameter-based access)
router.get('/teacher/:teacherId', optionalAuth, getTeacherAppointments);

// 3. CRITICAL: APPOINTMENT ACTION ROUTES - MUST BE BEFORE GENERIC /:id ROUTES
// These routes were causing 404 errors because they were being matched by /:id route

// Accept appointment request - MOST IMPORTANT FIX
router.put('/:id/accept', 
  (req, res, next) => {
    console.log(`🔄 ACCEPT ROUTE HIT: ${req.method} ${req.originalUrl}`);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
    next();
  },
  optionalAuth, // Use optional auth to handle cases where token might not be present
  responseValidation, 
  handleValidationErrors, 
  acceptAppointmentRequest
);

// Reject appointment request - MOST IMPORTANT FIX
router.put('/:id/reject', 
  (req, res, next) => {
    console.log(`🔄 REJECT ROUTE HIT: ${req.method} ${req.originalUrl}`);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    console.log('Headers:', req.headers.authorization ? 'Token present' : 'No token');
    next();
  },
  optionalAuth, // Use optional auth
  responseValidation, 
  handleValidationErrors,
  rejectAppointmentRequest
);

// Complete appointment
router.put('/:id/complete', 
  (req, res, next) => {
    console.log(`🔄 COMPLETE ROUTE HIT: ${req.method} ${req.originalUrl}`);
    next();
  },
  optionalAuth,
  completeAppointment
);

// Cancel appointment
router.put('/:id/cancel', 
  (req, res, next) => {
    console.log(`🔄 CANCEL ROUTE HIT: ${req.method} ${req.originalUrl}`);
    next();
  },
  optionalAuth,
  cancellationValidation, 
  handleValidationErrors,
  cancelAppointment
);

// 4. GENERIC ROUTES (MUST BE LAST)

// Get all appointments
router.get('/', getAllAppointments);

// Get appointment by ID
router.get('/:id', getAppointmentById);

// Update appointment (generic update)
router.put('/:id', optionalAuth, updateAppointmentValidation, handleValidationErrors, updateAppointment);

// Delete appointment (using cancel logic)
router.delete('/:id', optionalAuth, cancellationValidation, handleValidationErrors, cancelAppointment);

// 5. LEGACY ROUTES for backward compatibility
router.post('/', requestAppointmentValidation, handleValidationErrors, requestAppointment);

console.log('✅ Appointment routes setup complete');

// Enhanced debugging middleware
router.use((req, res, next) => {
  console.log(`📍 Route not found: ${req.method} ${req.originalUrl}`);
  console.log('Available appointment routes:');
  const routes = [
    'GET /api/appointments/stats',
    'POST /api/appointments/request',
    'POST /api/appointments/book',
    'GET /api/appointments/teacher/:teacherId/pending',
    'GET /api/appointments/teacher/:teacherId',
    'PUT /api/appointments/:id/accept',
    'PUT /api/appointments/:id/reject',
    'PUT /api/appointments/:id/complete',
    'PUT /api/appointments/:id/cancel',
    'GET /api/appointments/',
    'GET /api/appointments/:id',
    'PUT /api/appointments/:id',
    'DELETE /api/appointments/:id'
  ];
  
  routes.forEach((route, index) => {
    console.log(`  ${index + 1}. ${route}`);
  });
  
  // Don't call next() here as this is for 404 handling
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: routes
  });
});

module.exports = router;