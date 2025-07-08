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
router.get('/dashboard/stats', authenticateAdmin, getDashboardStats);
router.get('/users', authenticateAdmin, getUsers);
router.get('/appointments', authenticateAdmin, getAllAppointments);
router.patch('/teachers/:teacherId/status', authenticateAdmin, updateTeacherStatus);
router.delete('/users/:userId', authenticateAdmin, deleteUser);

module.exports = router;