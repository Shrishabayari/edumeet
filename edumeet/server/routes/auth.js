// routes/authRoutes.js - FIXED VERSION
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth'); // Regular user auth middleware
const adminAuth = require('../middleware/auth'); // Admin auth middleware (create this file)

const router = express.Router();

// Validation middleware
const validateRegister = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .optional()
    .isIn(['student', 'teacher'])
    .withMessage('Role must be either student or teacher')
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateProfileUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const validateRejection = [
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters')
];

// Regular user routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, validateProfileUpdate, authController.updateProfile);

// ADMIN ROUTES - Use adminAuth middleware
router.get('/admin/pending', adminAuth, authController.getPendingRegistrations);
router.get('/admin/users', adminAuth, authController.getAllUsers);
router.put('/admin/approve/:id', adminAuth, authController.approveUser);
router.put('/admin/reject/:id', adminAuth, validateRejection, authController.rejectUser);

module.exports = router;