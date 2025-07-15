// controllers/authController.js - FIXED version
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper function to generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to handle validation errors
const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  return null;
};

// Register new user
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { name, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const userData = {
      name,
      email,
      password,
      role: role || 'student',
      profile: profile || {}
    };

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please wait for admin approval.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user can login (active and approved)
    if (!user.canLogin()) {
      return res.status(401).json({
        success: false,
        message: 'Account is not active or pending approval'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profile: user.profile
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    const updates = req.body;
    // Remove sensitive fields
    delete updates.password;
    delete updates.role;
    delete updates.approvalStatus;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ADMIN FUNCTIONS - SIMPLIFIED

// Get pending registrations (Admin only)
exports.getPendingRegistrations = async (req, res) => {
  try {
    console.log('Getting pending registrations...');
    console.log('req.admin exists:', !!req.admin);
    console.log('req.admin role:', req.admin?.role);

    const pendingUsers = await User.find({ 
      approvalStatus: 'pending' 
    }).sort({ createdAt: -1 });

    console.log('Found pending users:', pendingUsers.length);

    res.json({
      success: true,
      data: {
        users: pendingUsers,
        count: pendingUsers.length
      }
    });

  } catch (error) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Approve user (Admin only)
exports.approveUser = async (req, res) => {
  try {
    console.log('Approving user...');
    console.log('req.admin exists:', !!req.admin);
    console.log('User ID to approve:', req.params.id);

    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.approvalStatus === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'User is already approved'
      });
    }

    // Use the approve method from the schema
    await user.approve(req.admin._id);

    console.log('User approved successfully');

    res.json({
      success: true,
      message: 'User approved successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Reject user (Admin only)
exports.rejectUser = async (req, res) => {
  try {
    // Check for validation errors
    const validationError = handleValidationErrors(req, res);
    if (validationError) return;

    console.log('Rejecting user...');
    console.log('req.admin exists:', !!req.admin);
    console.log('User ID to reject:', req.params.id);

    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'User is already rejected'
      });
    }

    // Use the reject method from the schema
    await user.reject(req.admin._id, reason);

    console.log('User rejected successfully');

    res.json({
      success: true,
      message: 'User rejected successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    console.log('Getting all users...');
    console.log('req.admin exists:', !!req.admin);

    const { status, role, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.approvalStatus = status;
    if (role) query.role = role;

    // Pagination
    const skip = (page - 1) * limit;
    
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    console.log('Found users:', users.length);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};