// routes/adminRoutes.js
const express = require('express');
const {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getDashboardStats,
  getUsers,
  getAllAppointments,
  updateTeacherStatus,
  deleteUser
} = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// Auth routes (no authentication required)
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// Protected routes (authentication required)
router.get('/profile', authenticateAdmin, getAdminProfile);
router.put('/profile', authenticateAdmin, updateAdminProfile);

// CORRECTED: Dashboard stats route
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);

// User management routes
router.get('/users', authenticateAdmin, getUsers);
router.delete('/users/:userId', authenticateAdmin, deleteUser);

// CORRECTED: Appointment management routes
router.get('/appointments', authenticateAdmin, getAllAppointments);

// CORRECTED: Teacher management routes
router.patch('/teachers/:teacherId/status', authenticateAdmin, updateTeacherStatus);

module.exports = router;