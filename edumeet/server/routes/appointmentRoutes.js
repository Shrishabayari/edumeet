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

// Response validation for accept/reject
const responseValidation = [
  body('responseMessage')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Response message cannot exceed 500 characters')
];

console.log('🚀 Setting up appointment routes...');

// CRITICAL: ROUTE ORDERING - MOST SPECIFIC FIRST
// ================================================================

// 1. STATIC ROUTES (no parameters)
router.get('/stats', getAppointmentStats);

// 2. TEACHER-SPECIFIC ROUTES (specific parameter paths)
router.get('/teacher/:teacherId/pending', protect, getTeacherPendingRequests);
router.get('/teacher/:teacherId', protect, getTeacherAppointments);

// 3. APPOINTMENT ACTION ROUTES - MOST CRITICAL ROUTES
// These MUST come before the generic /:id routes to avoid conflicts

// FIXED: ACCEPT appointment request - removed extra middleware causing issues
router.put('/:id/accept', 
  (req, res, next) => {
    console.log(`🔄 ACCEPT route hit for appointment: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`Request body:`, req.body);
    next();
  },
  protect, // Authentication middleware
  responseValidation, // Validation middleware
  handleValidationErrors, // Validation error handler
  acceptAppointmentRequest // Controller function
);

// FIXED: REJECT appointment request - removed extra middleware causing issues
router.put('/:id/reject', 
  (req, res, next) => {
    console.log(`🔄 REJECT route hit for appointment: ${req.params.id}`);
    console.log(`Request method: ${req.method}`);
    console.log(`Request URL: ${req.originalUrl}`);
    console.log(`Request body:`, req.body);
    next();
  },
  protect, // Authentication middleware
  responseValidation, // Validation middleware
  handleValidationErrors, // Validation error handler
  rejectAppointmentRequest // Controller function
);

// COMPLETE appointment
router.put('/:id/complete', 
  protect,
  completeAppointment
);

// CANCEL appointment
router.put('/:id/cancel', 
  protect,
  cancelAppointment
);

// 4. APPOINTMENT CREATION ROUTES
// Student requests appointment (public - no auth required)
router.post('/request', requestAppointment);

// Teacher books appointment directly (requires teacher auth)
router.post('/book', protect, teacherBookAppointment);

// 5. GENERIC ROUTES (MUST BE LAST)
// Get all appointments
router.get('/', getAllAppointments);

// Get appointment by ID
router.get('/:id', getAppointmentById);

// Update appointment (generic update)
router.put('/:id', protect, updateAppointment);

// Delete appointment (using cancel logic)
router.delete('/:id', protect, cancelAppointment);

console.log('✅ Appointment routes setup complete');

module.exports = router;