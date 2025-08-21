const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResponse } = require('../middleware/auth');

// Helper function to generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Helper function to handle validation errors
const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {
      hasErrors: true,
      errors: errors.array()
    };
  }
  return { hasErrors: false };
};

// Register new user
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const { name, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendResponse(res, 400, false, 'User already exists with this email');
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

    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    };

    return sendResponse(res, 201, true, 'Registration successful. Please wait for admin approval.', responseData);

  } catch (error) {
    console.error('Registration error:', error);
    return sendResponse(res, 500, false, 'Server error during registration', null, [{ message: error.message }]);
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Check password
    const isMatch = await user.correctPassword(password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Check if user is active and approved
    if (!user.isActive) {
      return sendResponse(res, 401, false, 'Account is deactivated. Please contact support.');
    }

    if (user.approvalStatus !== 'approved') {
      return sendResponse(res, 401, false, 'Account is not approved or pending approval');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile
      },
      token
    };

    return sendResponse(res, 200, true, 'Login successful', responseData);

  } catch (error) {
    console.error('Login error:', error);
    return sendResponse(res, 500, false, 'Server error during login', null, [{ message: error.message }]);
  }
};

// Logout user
exports.logout = (req, res) => {
  return sendResponse(res, 200, true, 'Logout successful');
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(res, 200, true, 'Profile retrieved successfully', { user });

  } catch (error) {
    console.error('Get profile error:', error);
    return sendResponse(res, 500, false, 'Server error while fetching profile', null, [{ message: error.message }]);
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

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
      return sendResponse(res, 404, false, 'User not found');
    }

    return sendResponse(res, 200, true, 'Profile updated successfully', { user });

  } catch (error) {
    console.error('Update profile error:', error);
    return sendResponse(res, 500, false, 'Server error while updating profile', null, [{ message: error.message }]);
  }
};

// ADMIN FUNCTIONS

// Get pending registrations (Admin only)
exports.getPendingRegistrations = async (req, res) => {
  try {
    console.log('Getting pending registrations...');
    console.log('req.admin exists:', !!req.admin);
    console.log('req.admin role:', req.admin?.role);

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pendingUsers = await User.find({ 
      approvalStatus: 'pending' 
    })
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

    const totalPending = await User.countDocuments({ approvalStatus: 'pending' });
    const totalPages = Math.ceil(totalPending / parseInt(limit));

    console.log('Found pending users:', pendingUsers.length);

    const paginationMeta = {
      currentPage: parseInt(page),
      totalPages,
      totalPending,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    };

    return sendResponse(res, 200, true, 'Pending registrations retrieved successfully', 
      { users: pendingUsers }, null, paginationMeta);

  } catch (error) {
    console.error('Get pending registrations error:', error);
    return sendResponse(res, 500, false, 'Server error while fetching pending registrations', null, [{ message: error.message }]);
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
      return sendResponse(res, 404, false, 'User not found');
    }

    if (user.approvalStatus === 'approved') {
      return sendResponse(res, 400, false, 'User is already approved');
    }

    // Update approval status
    user.approvalStatus = 'approved';
    user.approvedBy = req.admin._id;
    user.approvedAt = new Date();
    await user.save();

    console.log('User approved successfully');

    return sendResponse(res, 200, true, 'User approved successfully', { user });

  } catch (error) {
    console.error('Approve user error:', error);
    return sendResponse(res, 500, false, 'Server error while approving user', null, [{ message: error.message }]);
  }
};

// Reject user (Admin only)
exports.rejectUser = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    console.log('Rejecting user...');
    console.log('req.admin exists:', !!req.admin);
    console.log('User ID to reject:', req.params.id);

    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    if (user.approvalStatus === 'rejected') {
      return sendResponse(res, 400, false, 'User is already rejected');
    }

    // Update rejection status
    user.approvalStatus = 'rejected';
    user.rejectedBy = req.admin._id;
    user.rejectedAt = new Date();
    if (reason) {
      user.rejectionReason = reason;
    }
    await user.save();

    console.log('User rejected successfully');

    return sendResponse(res, 200, true, 'User rejected successfully', { user });

  } catch (error) {
    console.error('Reject user error:', error);
    return sendResponse(res, 500, false, 'Server error while rejecting user', null, [{ message: error.message }]);
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    console.log('Getting all users...');
    console.log('req.admin exists:', !!req.admin);

    const { 
      status, 
      role, 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      search 
    } = req.query;
    
    // Build query
    const query = {};
    if (status) query.approvalStatus = status;
    if (role) query.role = role;
    
    // Add search functionality
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const users = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    console.log('Found users:', users.length);

    const paginationMeta = {
      currentPage: parseInt(page),
      totalPages,
      totalUsers,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    };

    return sendResponse(res, 200, true, 'Users retrieved successfully', 
      { users }, null, paginationMeta);

  } catch (error) {
    console.error('Get all users error:', error);
    return sendResponse(res, 500, false, 'Server error while fetching users', null, [{ message: error.message }]);
  }
};

// Get user statistics (Admin only)
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const approvedUsers = await User.countDocuments({ approvalStatus: 'approved' });
    const pendingUsers = await User.countDocuments({ approvalStatus: 'pending' });
    const rejectedUsers = await User.countDocuments({ approvalStatus: 'rejected' });
    
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const monthlyRegistrations = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    const stats = {
      totalUsers,
      approvedUsers,
      pendingUsers,
      rejectedUsers,
      roleStats,
      monthlyRegistrations
    };

    return sendResponse(res, 200, true, 'User statistics retrieved successfully', stats);

  } catch (error) {
    console.error('Get user stats error:', error);
    return sendResponse(res, 500, false, 'Server error while fetching user statistics', null, [{ message: error.message }]);
  }
};