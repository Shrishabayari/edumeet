const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Send response with token
const createSendToken = (user, statusCode, res, message) => {
  const token = generateToken(user._id);
  
  const cookieOptions = {
    expires: new Date(
      Date.now() + (process.env.JWT_COOKIE_EXPIRES_IN || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: {
      user
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create user data object
    const userData = {
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      role: role || 'student',
      profile: {},
      approvalStatus: 'pending' // Set to pending by default
    };

    // Add profile data if provided
    if (profile) {
      if (profile.phone) userData.profile.phone = profile.phone;
      
      // Role-specific profile data
      if (role === 'student' && profile.grade) {
        userData.profile.grade = profile.grade;
      }
      
      if (role === 'teacher') {
        if (profile.subject) userData.profile.subject = profile.subject;
        if (profile.department) userData.profile.department = profile.department;
      }
    }

    // Create user
    const user = await User.create(userData);

    // Return success response without token (user needs approval first)
    res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          approvalStatus: user.approvalStatus,
          profile: user.profile
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      const duplicateField = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${duplicateField} already exists`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email and include password
    const user = await User.findByEmail(email.toLowerCase());
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check approval status
    if (user.approvalStatus === 'pending') {
      return res.status(401).json({
        success: false,
        message: 'Your account is pending admin approval. Please wait for approval before logging in.'
      });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(401).json({
        success: false,
        message: `Your account has been rejected. ${user.rejectionReason ? 'Reason: ' + user.rejectionReason : 'Please contact support for more information.'}`
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Send response with token
    createSendToken(user, 200, res, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, profile } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    if (name) user.name = name.trim();
    
    if (profile) {
      if (profile.phone !== undefined) user.profile.phone = profile.phone;
      
      // Role-specific updates
      if (user.role === 'student' && profile.grade) {
        user.profile.grade = profile.grade;
      }
      
      if (user.role === 'teacher') {
        if (profile.subject) user.profile.subject = profile.subject;
        if (profile.department) user.profile.department = profile.department;
      }
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
};

// @desc    Get pending registrations (Admin only)
// @route   GET /api/auth/admin/pending
// @access  Private (Admin)
exports.getPendingRegistrations = async (req, res) => {
  try {
    const pendingUsers = await User.find({ 
      approvalStatus: 'pending' 
    }).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: pendingUsers.length,
      data: {
        users: pendingUsers
      }
    });
  } catch (error) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve user registration (Admin only)
// @route   PUT /api/auth/admin/approve/:id
// @access  Private (Admin)
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'User is not pending approval'
      });
    }

    await user.approve(req.user.id);

    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during approval'
    });
  }
};

// @desc    Reject user registration (Admin only)
// @route   PUT /api/auth/admin/reject/:id
// @access  Private (Admin)
exports.rejectUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.approvalStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'User is not pending approval'
      });
    }

    await user.reject(req.user.id, reason);

    res.status(200).json({
      success: true,
      message: 'User rejected successfully',
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during rejection'
    });
  }
};

// @desc    Get all users with approval status (Admin only)
// @route   GET /api/auth/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { status, role, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (status) filter.approvalStatus = status;
    if (role) filter.role = role;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      select: '-password',
      sort: { createdAt: -1 }
    };

    const users = await User.find(filter)
      .select('-password')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};