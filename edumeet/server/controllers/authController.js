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

// Register new user - CORRECTED for consistent profile structure
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const { name, email, password, role, profile } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendResponse(res, 400, false, 'User already exists with this email');
    }

    // Create base user data - CORRECTED
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: role || 'student'
    };

    // Handle password for students (optional initially)
    if (password) {
      userData.password = password;
      userData.hasAccount = true;
    } else if (role === 'student') {
      // Students can register without password initially
      userData.hasAccount = false;
    }

    // Handle role-specific profiles - CORRECTED to match User model structure
    if (role === 'teacher' && profile) {
      // For teachers, create teacherProfile object
      userData.teacherProfile = {
        phone: profile.phone || '',
        department: profile.department || '',
        subject: profile.subject || '',
        experience: profile.experience || '',
        qualification: profile.qualification || '',
        bio: profile.bio || '',
        availability: profile.availability || []
      };
      userData.approvalStatus = 'pending'; // Teachers need approval
      userData.hasAccount = !!password; // Only if password provided
    } else if (role === 'student' && profile) {
      // For students, create studentProfile object
      userData.studentProfile = {
        phone: profile.phone || '',
        course: profile.course || profile.grade || '', // Handle both course and grade
        year: profile.year || '',
        interests: profile.interests || []
      };
      userData.approvalStatus = 'approved'; // Students auto-approved
      userData.hasAccount = true; // Students have accounts by default
    } else {
      // Default for students without profile
      if (role === 'student') {
        userData.studentProfile = {};
        userData.approvalStatus = 'approved';
        userData.hasAccount = true;
      }
    }

    const user = new User(userData);
    await user.save();

    // Prepare response data - CORRECTED to handle nested profiles
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        hasAccount: user.hasAccount,
        // Flatten profile data for easier frontend access
        ...(user.role === 'teacher' && user.teacherProfile && {
          department: user.teacherProfile.department,
          subject: user.teacherProfile.subject,
          phone: user.teacherProfile.phone
        }),
        ...(user.role === 'student' && user.studentProfile && {
          course: user.studentProfile.course,
          year: user.studentProfile.year,
          phone: user.studentProfile.phone
        })
      }
    };

    const message = role === 'teacher' 
      ? 'Registration successful. Please wait for admin approval.'
      : 'Registration successful. Welcome to EduMeet!';

    return sendResponse(res, 201, true, message, responseData);

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return sendResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return sendResponse(res, 400, false, `User with this ${field} already exists`);
    }
    
    return sendResponse(res, 500, false, 'Server error during registration', null, [{ message: error.message }]);
  }
};

// Login user - CORRECTED for consistent user handling
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const { email, password } = req.body;

    // Find user and include password - CORRECTED to handle all user types
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    }).select('+password');
    
    if (!user) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Check password - handle cases where password might not be set
    if (!user.password) {
      if (user.role === 'teacher') {
        return sendResponse(res, 401, false, 'Account not set up. Please contact admin for setup link.');
      } else {
        return sendResponse(res, 401, false, 'Please set up your password first.');
      }
    }

    const isMatch = await user.correctPassword(password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Check approval status for non-students
    if (user.role !== 'student' && user.approvalStatus !== 'approved') {
      const statusMessage = user.approvalStatus === 'rejected' 
        ? 'Account has been rejected. Please contact admin.'
        : 'Account pending approval. Please contact admin.';
      return sendResponse(res, 401, false, statusMessage);
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save({ validateBeforeSave: false });

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    // Prepare response data - CORRECTED to handle nested profiles
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        hasAccount: user.hasAccount,
        lastLogin: user.lastLogin,
        // Flatten profile data based on role
        ...(user.role === 'teacher' && user.teacherProfile && {
          department: user.teacherProfile.department,
          subject: user.teacherProfile.subject,
          phone: user.teacherProfile.phone,
          bio: user.teacherProfile.bio,
          availability: user.teacherProfile.availability,
          experience: user.teacherProfile.experience,
          qualification: user.teacherProfile.qualification
        }),
        ...(user.role === 'student' && user.studentProfile && {
          course: user.studentProfile.course,
          year: user.studentProfile.year,
          phone: user.studentProfile.phone,
          interests: user.studentProfile.interests
        })
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

// Get user profile - CORRECTED for nested profile structure
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    // Prepare profile data with flattened structure - CORRECTED
    const userProfile = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
      hasAccount: user.hasAccount,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      // Include role-specific profile data
      ...(user.role === 'teacher' && user.teacherProfile && {
        department: user.teacherProfile.department,
        subject: user.teacherProfile.subject,
        phone: user.teacherProfile.phone,
        bio: user.teacherProfile.bio,
        availability: user.teacherProfile.availability,
        experience: user.teacherProfile.experience,
        qualification: user.teacherProfile.qualification,
        rating: user.teacherProfile.rating,
        totalRatings: user.teacherProfile.totalRatings
      }),
      ...(user.role === 'student' && user.studentProfile && {
        course: user.studentProfile.course,
        year: user.studentProfile.year,
        phone: user.studentProfile.phone,
        interests: user.studentProfile.interests
      })
    };

    return sendResponse(res, 200, true, 'Profile retrieved successfully', { user: userProfile });

  } catch (error) {
    console.error('Get profile error:', error);
    return sendResponse(res, 500, false, 'Server error while fetching profile', null, [{ message: error.message }]);
  }
};

// Update user profile - CORRECTED for nested profile structure
exports.updateProfile = async (req, res) => {
  try {
    // Check for validation errors
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated here
    delete updates.password;
    delete updates.role;
    delete updates.approvalStatus;
    delete updates.isActive;
    delete updates.hasAccount;

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    // Prepare update object - CORRECTED for nested profiles
    const updateData = { updatedAt: new Date() };
    
    // Handle general fields
    const generalFields = ['name'];
    generalFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = field === 'name' ? updates[field].trim() : updates[field];
      }
    });

    // Handle role-specific profile updates - CORRECTED
    if (user.role === 'teacher') {
      const teacherFields = ['phone', 'bio', 'availability'];
      const teacherProfileUpdates = {};
      
      teacherFields.forEach(field => {
        if (updates[field] !== undefined) {
          teacherProfileUpdates[`teacherProfile.${field}`] = updates[field];
        }
      });
      
      Object.assign(updateData, teacherProfileUpdates);
    } else if (user.role === 'student') {
      const studentFields = ['phone', 'course', 'year', 'interests'];
      const studentProfileUpdates = {};
      
      studentFields.forEach(field => {
        if (updates[field] !== undefined) {
          studentProfileUpdates[`studentProfile.${field}`] = updates[field];
        }
      });
      
      Object.assign(updateData, studentProfileUpdates);
    }

    // Perform update
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return sendResponse(res, 404, false, 'User not found');
    }

    // Prepare response data - CORRECTED
    const responseData = {
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        approvalStatus: updatedUser.approvalStatus,
        // Include flattened profile data
        ...(updatedUser.role === 'teacher' && updatedUser.teacherProfile && {
          department: updatedUser.teacherProfile.department,
          subject: updatedUser.teacherProfile.subject,
          phone: updatedUser.teacherProfile.phone,
          bio: updatedUser.teacherProfile.bio,
          availability: updatedUser.teacherProfile.availability
        }),
        ...(updatedUser.role === 'student' && updatedUser.studentProfile && {
          course: updatedUser.studentProfile.course,
          year: updatedUser.studentProfile.year,
          phone: updatedUser.studentProfile.phone,
          interests: updatedUser.studentProfile.interests
        })
      }
    };

    return sendResponse(res, 200, true, 'Profile updated successfully', responseData);

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      return sendResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }
    
    return sendResponse(res, 500, false, 'Server error while updating profile', null, [{ message: error.message }]);
  }
};

// ADMIN FUNCTIONS - Updated to work with User model structure

// Get pending registrations (Admin only) - CORRECTED
exports.getPendingRegistrations = async (req, res) => {
  try {
    console.log('Getting pending registrations...');
    console.log('req.admin exists:', !!req.admin);
    console.log('req.admin role:', req.admin?.role);

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role // Add role filter
    } = req.query;

    // Build query - CORRECTED to handle role filtering
    const query = { approvalStatus: 'pending' };
    if (role && ['student', 'teacher'].includes(role)) {
      query.role = role;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const pendingUsers = await User.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');

    const totalPending = await User.countDocuments(query);
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

// Approve user (Admin only) - CORRECTED
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

    // Update approval status - CORRECTED to include admin tracking
    user.approvalStatus = 'approved';
    user.approvedBy = req.admin._id;
    user.approvedAt = new Date();
    user.updatedAt = new Date();
    await user.save();

    console.log('User approved successfully');

    // Prepare response data with flattened profile
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        approvedAt: user.approvedAt,
        // Include role-specific data
        ...(user.role === 'teacher' && user.teacherProfile && {
          department: user.teacherProfile.department,
          subject: user.teacherProfile.subject
        })
      }
    };

    return sendResponse(res, 200, true, 'User approved successfully', responseData);

  } catch (error) {
    console.error('Approve user error:', error);
    return sendResponse(res, 500, false, 'Server error while approving user', null, [{ message: error.message }]);
  }
};

// Reject user (Admin only) - CORRECTED
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

    // Update rejection status - CORRECTED
    user.approvalStatus = 'rejected';
    user.rejectedBy = req.admin._id;
    user.rejectedAt = new Date();
    user.updatedAt = new Date();
    if (reason) {
      user.rejectionReason = reason;
    }
    await user.save();

    console.log('User rejected successfully');

    // Prepare response data
    const responseData = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        rejectedAt: user.rejectedAt,
        rejectionReason: user.rejectionReason
      }
    };

    return sendResponse(res, 200, true, 'User rejected successfully', responseData);

  } catch (error) {
    console.error('Reject user error:', error);
    return sendResponse(res, 500, false, 'Server error while rejecting user', null, [{ message: error.message }]);
  }
};

// Get all users (Admin only) - CORRECTED for better filtering
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
    
    // Build query - CORRECTED
    const query = { isActive: true }; // Only active users by default
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query.approvalStatus = status;
    }
    if (role && ['student', 'teacher', 'admin'].includes(role)) {
      query.role = role;
    }
    
    // Add search functionality - CORRECTED for nested profiles
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'teacherProfile.department': { $regex: search, $options: 'i' } },
        { 'teacherProfile.subject': { $regex: search, $options: 'i' } },
        { 'studentProfile.course': { $regex: search, $options: 'i' } }
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
      .limit(parseInt(limit))
      .select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');

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

// Get user statistics (Admin only) - CORRECTED for User model
exports.getUserStats = async (req, res) => {
  try {
    // Get basic counts - CORRECTED
    const totalUsers = await User.countDocuments({ isActive: true });
    const approvedUsers = await User.countDocuments({ isActive: true, approvalStatus: 'approved' });
    const pendingUsers = await User.countDocuments({ isActive: true, approvalStatus: 'pending' });
    const rejectedUsers = await User.countDocuments({ isActive: true, approvalStatus: 'rejected' });
    
    // Role statistics - CORRECTED
    const roleStats = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Teacher department statistics - CORRECTED for nested profile
    const teacherDepartmentStats = await User.aggregate([
      { 
        $match: { 
          role: 'teacher', 
          isActive: true, 
          approvalStatus: 'approved',
          'teacherProfile.department': { $exists: true, $ne: null }
        } 
      },
      { $group: { _id: '$teacherProfile.department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Monthly registrations - CORRECTED
    const monthlyRegistrations = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            role: '$role'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 24 } // Last 2 years
    ]);

    const stats = {
      overview: {
        totalUsers,
        approvedUsers,
        pendingUsers,
        rejectedUsers
      },
      roleStats: roleStats.map(stat => ({
        role: stat._id || 'Unknown',
        count: stat.count
      })),
      teacherDepartmentStats: teacherDepartmentStats.map(stat => ({
        department: stat._id || 'Unknown',
        count: stat.count
      })),
      monthlyRegistrations: monthlyRegistrations.map(stat => ({
        year: stat._id.year,
        month: stat._id.month,
        role: stat._id.role,
        count: stat.count
      }))
    };

    return sendResponse(res, 200, true, 'User statistics retrieved successfully', stats);

  } catch (error) {
    console.error('Get user stats error:', error);
    return sendResponse(res, 500, false, 'Server error while fetching user statistics', null, [{ message: error.message }]);
  }
};