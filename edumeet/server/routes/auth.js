const express = require('express');
const {
  register,
  login,
  getMe,
  logout,
  updateProfile
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

// Protected routes
router.post('/logout', protect, logout);
router.put('/profile', protect, updateProfile);

module.exports = router;