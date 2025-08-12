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

console.log('🚀 Setting up appointment routes...');

// CRITICAL: ROUTE ORDERING - MOST SPECIFIC FIRST
// ================================================================

// 1. DEBUG ROUTE (for troubleshooting)
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
    totalRoutes: routes.length,
    timestamp: new Date().toISOString()
  });
});

// 2. STATISTICS ROUTE (static route - no parameters)
router.get('/stats', getAppointmentStats);

// 3. TEACHER-SPECIFIC ROUTES (specific parameter paths)
// These MUST come before generic parameterized routes
router.get('/teacher/:teacherId/pending', protect, (req, res, next) => {
  console.log(`📋 Getting pending requests for teacher: ${req.params.teacherId}`);
  next();
}, getTeacherPendingRequests);

router.get('/teacher/:teacherId', protect, (req, res, next) => {
  console.log(`📋 Getting appointments for teacher: ${req.params.teacherId}`);
  next();
}, getTeacherAppointments);

// 4. APPOINTMENT ACTION ROUTES - MOST CRITICAL ROUTES
// These MUST come before the generic /:id routes to avoid conflicts

// ACCEPT appointment request
router.put('/:id/accept', 
  (req, res, next) => {
    console.log(`🔄 ACCEPT route hit for appointment: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`Request body:`, req.body);
    next();
  },
  protect, // Require authentication
  responseValidation, 
  handleValidationErrors, 
  (req, res, next) => {
    console.log(`✅ Validation passed for accept appointment: ${req.params.id}`);
    console.log('Request user:', req.user?.name || req.user?.id);
    next();
  },
  acceptAppointmentRequest
);

// REJECT appointment request
router.put('/:id/reject', 
  (req, res, next) => {
    console.log(`🔄 REJECT route hit for appointment: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`Request body:`, req.body);
    next();
  },
  protect, // Require authentication
  responseValidation, 
  handleValidationErrors,
  (req, res, next) => {
    console.log(`✅ Validation passed for reject appointment: ${req.params.id}`);
    console.log('Request user:', req.user?.name || req.user?.id);
    next();
  },
  rejectAppointmentRequest
);

// COMPLETE appointment
router.put('/:id/complete', 
  (req, res, next) => {
    console.log(`🔄 COMPLETE route hit for appointment: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    next();
  },
  protect, // Require authentication
  (req, res, next) => {
    console.log(`✅ Auth passed for complete appointment: ${req.params.id}`);
    next();
  },
  completeAppointment
);

// CANCEL appointment
router.put('/:id/cancel', 
  (req, res, next) => {
    console.log(`🔄 CANCEL route hit for appointment: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    next();
  },
  protect, // Require authentication
  cancellationValidation, 
  handleValidationErrors,
  (req, res, next) => {
    console.log(`✅ Validation passed for cancel appointment: ${req.params.id}`);
    next();
  },
  cancelAppointment
);

// 5. APPOINTMENT CREATION ROUTES
// Student requests appointment (public - no auth required)
router.post('/request', 
  (req, res, next) => {
    console.log('🔄 Student appointment request:', req.body);
    next();
  },
  requestAppointmentValidation, 
  handleValidationErrors, 
  requestAppointment
);

// Teacher books appointment directly (requires teacher auth)
router.post('/book', 
  (req, res, next) => {
    console.log('🔄 Teacher direct booking:', req.body);
    next();
  },
  protect, 
  teacherBookingValidation, 
  handleValidationErrors, 
  teacherBookAppointment
);

// 6. GENERIC ROUTES (MUST BE LAST - these have broader matching patterns)

// Get all appointments
router.get('/', (req, res, next) => {
  console.log('📋 Getting all appointments with filters:', req.query);
  next();
}, getAllAppointments);

// Get appointment by ID
router.get('/:id', (req, res, next) => {
  console.log(`📋 Getting appointment by ID: ${req.params.id}`);
  next();
}, getAppointmentById);

// Update appointment (generic update)
router.put('/:id', 
  (req, res, next) => {
    console.log(`🔄 Generic update for appointment: ${req.params.id}`);
    console.log('Update data:', req.body);
    next();
  },
  protect, 
  updateAppointmentValidation, 
  handleValidationErrors, 
  updateAppointment
);

// Delete appointment (using cancel logic)
router.delete('/:id', 
  (req, res, next) => {
    console.log(`🗑️ Delete appointment: ${req.params.id}`);
    next();
  },
  protect, 
  cancellationValidation, 
  handleValidationErrors, 
  cancelAppointment
);

// 7. LEGACY ROUTES for backward compatibility
router.post('/', requestAppointmentValidation, handleValidationErrors, requestAppointment);

// Route logging middleware (for debugging - only in development)
if (process.env.NODE_ENV === 'development') {
  router.use((req, res, next) => {
    if (req.originalUrl.includes('/appointments/')) {
      console.log(`📍 Route attempted: ${req.method} ${req.originalUrl}`);
      console.log('Available routes:');
      router.stack.forEach((middleware, index) => {
        if (middleware.route) {
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          console.log(`  ${index + 1}. ${methods} ${middleware.route.path}`);
        }
      });
    }
    next();
  });
}

console.log('✅ Appointment routes setup complete');

// Export the router
module.exports = router;