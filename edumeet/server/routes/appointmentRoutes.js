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

// ================================================================
// CRITICAL ROUTE ORDERING - MOST SPECIFIC ROUTES FIRST
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
router.get('/stats', protect, getAppointmentStats);

// ================================================================
// 3. APPOINTMENT ACTION ROUTES - HIGHEST PRIORITY
// These MUST come before ANY parameterized routes (/:id)
// ================================================================

// ACCEPT appointment request - REQUIRES TEACHER AUTHENTICATION
router.put('/:id/accept', 
  (req, res, next) => {
    console.log(`🎯 ACCEPT ROUTE HIT - ID: ${req.params.id}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Full URL: ${req.originalUrl}`);
    console.log(`   Route Path: ${req.route?.path}`);
    console.log(`   Headers:`, {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    console.log(`   Body:`, req.body);
    next();
  },
  protect, // Use general protect middleware that handles teachers
  authorize('teacher'), // Ensure only teachers can accept
  responseValidation,
  handleValidationErrors,
  (req, res, next) => {
    console.log(`✅ Accept route validation passed for ID: ${req.params.id}`);
    console.log(`   User from auth:`, {
      id: req.user?.id || req.user?._id,
      name: req.user?.name,
      role: req.user?.role
    });
    next();
  },
  acceptAppointmentRequest
);

// REJECT appointment request - REQUIRES TEACHER AUTHENTICATION
router.put('/:id/reject',
  (req, res, next) => {
    console.log(`🎯 REJECT ROUTE HIT - ID: ${req.params.id}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Full URL: ${req.originalUrl}`);
    console.log(`   Route Path: ${req.route?.path}`);
    console.log(`   Headers:`, {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    console.log(`   Body:`, req.body);
    next();
  },
  protect, // Use general protect middleware
  authorize('teacher'), // Ensure only teachers can reject
  responseValidation,
  handleValidationErrors,
  (req, res, next) => {
    console.log(`✅ Reject route validation passed for ID: ${req.params.id}`);
    console.log(`   User from auth:`, {
      id: req.user?.id || req.user?._id,
      name: req.user?.name,
      role: req.user?.role
    });
    next();
  },
  rejectAppointmentRequest
);

// COMPLETE appointment - REQUIRES TEACHER AUTHENTICATION
router.put('/:id/complete',
  (req, res, next) => {
    console.log(`🎯 COMPLETE ROUTE HIT - ID: ${req.params.id}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Full URL: ${req.originalUrl}`);
    next();
  },
  protect,
  authorize('teacher'),
  (req, res, next) => {
    console.log(`✅ Complete route auth passed for ID: ${req.params.id}`);
    next();
  },
  completeAppointment
);

// CANCEL appointment - CAN BE DONE BY BOTH STUDENTS AND TEACHERS
router.put('/:id/cancel',
  (req, res, next) => {
    console.log(`🎯 CANCEL ROUTE HIT - ID: ${req.params.id}`);
    console.log(`   Method: ${req.method}`);
    console.log(`   Full URL: ${req.originalUrl}`);
    next();
  },
  protect,
  cancellationValidation,
  handleValidationErrors,
  (req, res, next) => {
    console.log(`✅ Cancel route validation passed for ID: ${req.params.id}`);
    next();
  },
  cancelAppointment
);

// ================================================================
// 4. TEACHER-SPECIFIC ROUTES (specific parameter paths)
// ================================================================
router.get('/teacher/:teacherId/pending', 
  (req, res, next) => {
    console.log(`🎯 TEACHER PENDING ROUTE - Teacher ID: ${req.params.teacherId}`);
    next();
  },
  protect, 
  authorize('teacher'), // Only teachers can access this
  getTeacherPendingRequests
);

router.get('/teacher/:teacherId', 
  (req, res, next) => {
    console.log(`🎯 TEACHER APPOINTMENTS ROUTE - Teacher ID: ${req.params.teacherId}`);
    next();
  },
  protect, 
  authorize('teacher'), // Only teachers can access this
  getTeacherAppointments
);

// ================================================================
// 5. APPOINTMENT CREATION ROUTES
// ================================================================

// Student requests appointment (public - no auth required initially)
// CORRECTED: Made this route public so students can request appointments
router.post('/request',
  (req, res, next) => {
    console.log('🎯 STUDENT REQUEST ROUTE:', req.body);
    next();
  },
  requestAppointmentValidation,
  handleValidationErrors,
  requestAppointment
);

// Teacher books appointment directly (requires teacher auth)
router.post('/book',
  (req, res, next) => {
    console.log('🎯 TEACHER BOOKING ROUTE:', req.body);
    next();
  },
  protect,
  authorize('teacher'),
  teacherBookingValidation,
  handleValidationErrors,
  teacherBookAppointment
);

// ================================================================
// 6. GENERIC ROUTES (MUST BE LAST - broader matching patterns)
// ================================================================

// Get all appointments - PROTECTED
router.get('/', 
  (req, res, next) => {
    console.log('🎯 GET ALL APPOINTMENTS with filters:', req.query);
    next();
  }, 
  protect,
  getAllAppointments
);

// Get appointment by ID - PROTECTED
router.get('/:id', 
  (req, res, next) => {
    console.log(`🎯 GET APPOINTMENT BY ID: ${req.params.id}`);
    next();
  }, 
  protect,
  getAppointmentById
);

// Update appointment (generic update) - PROTECTED
router.put('/:id',
  (req, res, next) => {
    console.log(`🎯 GENERIC UPDATE ROUTE - ID: ${req.params.id}`);
    console.log('Update data:', req.body);
    next();
  },
  protect,
  updateAppointmentValidation,
  handleValidationErrors,
  updateAppointment
);

// Delete appointment (using cancel logic) - PROTECTED
router.delete('/:id',
  (req, res, next) => {
    console.log(`🎯 DELETE ROUTE - ID: ${req.params.id}`);
    next();
  },
  protect,
  cancellationValidation,
  handleValidationErrors,
  cancelAppointment
);

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
    console.log('Available appointment routes:');
    const routes = [
      'GET    /appointments/stats',
      'GET    /appointments/teacher/:teacherId/pending',
      'GET    /appointments/teacher/:teacherId',
      'PUT    /appointments/:id/accept',
      'PUT    /appointments/:id/reject', 
      'PUT    /appointments/:id/complete',
      'PUT    /appointments/:id/cancel',
      'POST   /appointments/request',
      'POST   /appointments/book',
      'GET    /appointments',
      'GET    /appointments/:id',
      'PUT    /appointments/:id',
      'DELETE /appointments/:id'
    ];
    routes.forEach((route, index) => {
      console.log(`  ${index + 1}. ${route}`);
    });
    next();
  });
}

console.log('✅ Appointment routes setup complete with proper ordering and authentication');

module.exports = router;