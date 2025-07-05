const Teacher = require('../models/Teacher');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id, role: 'teacher' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Send token response
const createSendToken = (teacher, statusCode, req, res) => {
  const token = signToken(teacher._id);
  
  const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  teacher.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      teacher
    }
  });
};
// @desc    Create new teacher
// @route   POST /api/teachers
// @access  Private/Admin
const createTeacher = async (req, res) => {
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

    const {
      name,
      email,
      phone,
      department,
      subject,
      experience,
      qualification,
      bio,
      availability,
      password // Add password field
    } = req.body;

    // Check if teacher with email already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher with this email already exists'
      });
    }

    // Create new teacher object
    const teacherData = {
      name,
      email,
      phone,
      department,
      subject,
      experience,
      qualification,
      bio,
      availability: availability || []
    };

    // If password is provided, set it and mark account as active
    if (password) {
      teacherData.password = password;
      teacherData.hasAccount = true;
      teacherData.lastLogin = new Date();
    }

    // Create new teacher
    const teacher = new Teacher(teacherData);
    const savedTeacher = await teacher.save();

    // Remove password from response
    const responseData = savedTeacher.toObject();
    delete responseData.password;

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: responseData
    });
  } catch (error) {
    console.error('Error creating teacher:', error);
    
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

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Teacher with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating teacher',
      error: error.message
    });
  }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private/Admin
const updateTeacher = async (req, res) => {
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

    const teacherId = req.params.id;
    const updateData = req.body;

    // Check if teacher exists
    const existingTeacher = await Teacher.findById(teacherId);
    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== existingTeacher.email) {
      const emailExists = await Teacher.findOne({ 
        email: updateData.email, 
        _id: { $ne: teacherId } 
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Teacher with this email already exists'
        });
      }
    }

    // Update teacher
    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { ...updateData, updatedAt: new Date() },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-__v');

    res.status(200).json({
      success: true,
      message: 'Teacher updated successfully',
      data: updatedTeacher
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    
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

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating teacher',
      error: error.message
    });
  }
};

// @desc    Get all teachers
// @route   GET /api/teachers
// @access  Public
const getAllTeachers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      department,
      subject,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = { isActive: true };
    
    if (department) {
      filter.department = department;
    }
    
    if (subject) {
      filter.subject = subject;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const teachers = await Teacher.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const totalTeachers = await Teacher.countDocuments(filter);
    const totalPages = Math.ceil(totalTeachers / parseInt(limit));

    res.status(200).json({
      success: true,
      data: teachers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalTeachers,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teachers',
      error: error.message
    });
  }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Public
const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id).select('-__v');
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    if (!teacher.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Teacher is not active'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Error fetching teacher:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher',
      error: error.message
    });
  }
};

// @desc    Delete teacher (soft delete)
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
const deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Soft delete - set isActive to false
    await Teacher.findByIdAndUpdate(teacherId, { 
      isActive: false, 
      updatedAt: new Date() 
    });

    res.status(200).json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while deleting teacher',
      error: error.message
    });
  }
};

// @desc    Permanently delete teacher
// @route   DELETE /api/teachers/:id/permanent
// @access  Private/Admin
const permanentDeleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    await Teacher.findByIdAndDelete(teacherId);

    res.status(200).json({
      success: true,
      message: 'Teacher permanently deleted'
    });
  } catch (error) {
    console.error('Error permanently deleting teacher:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while permanently deleting teacher',
      error: error.message
    });
  }
};

// @desc    Get teachers by department
// @route   GET /api/teachers/department/:department
// @access  Public
const getTeachersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    const teachers = await Teacher.getByDepartment(department);
    
    res.status(200).json({
      success: true,
      data: teachers,
      count: teachers.length
    });
  } catch (error) {
    console.error('Error fetching teachers by department:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teachers by department',
      error: error.message
    });
  }
};

// @desc    Get teacher statistics
// @route   GET /api/teachers/stats
// @access  Private/Admin
const getTeacherStats = async (req, res) => {
  try {
    const totalTeachers = await Teacher.countDocuments({ isActive: true });
    const departmentStats = await Teacher.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const availabilityStats = await Teacher.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$availability' },
      { $group: { _id: '$availability', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalTeachers,
        departmentStats,
        availabilityStats
      }
    });
  } catch (error) {
    console.error('Error fetching teacher stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher statistics',
      error: error.message
    });
  }
};

// ==================== AUTHENTICATION METHODS ====================

// @desc    Teacher login
// @route   POST /api/teachers/login
// @access  Public
const teacherLogin = async (req, res) => {
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

    // Check if teacher exists and is active
    const teacher = await Teacher.findOne({ 
      email, 
      isActive: true 
    }).select('+password');

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or teacher not found'
      });
    }

    // Check if teacher has set up account
    if (!teacher.hasAccount || !teacher.password) {
      return res.status(401).json({
        success: false,
        message: 'Account not set up. Please contact admin for account setup link.'
      });
    }

    // Check password
    if (!(await teacher.correctPassword(password, teacher.password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    teacher.lastLogin = new Date();
    await teacher.save({ validateBeforeSave: false });

    // Send token
    createSendToken(teacher, 200, req, res);
  } catch (error) {
    console.error('Teacher login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Send account setup link to teacher
// @route   POST /api/teachers/send-setup-link
// @access  Private/Admin
const sendAccountSetupLink = async (req, res) => {
  try {
    const { teacherId } = req.body;

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    if (teacher.hasAccount) {
      return res.status(400).json({
        success: false,
        message: 'Teacher already has an account'
      });
    }

    // Generate setup token
    const setupToken = teacher.createAccountSetupToken();
    await teacher.save({ validateBeforeSave: false });

    // In a real app, you'd send an email here
    // For now, we'll just return the setup link
    const setupURL = `${req.protocol}://${req.get('host')}/api/teachers/setup-account/${setupToken}`;

    res.status(200).json({
      success: true,
      message: 'Account setup link generated',
      setupURL, // In production, remove this and send via email
      data: {
        teacherEmail: teacher.email,
        teacherName: teacher.name,
        expiresAt: teacher.accountSetupExpires
      }
    });
  } catch (error) {
    console.error('Setup link error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating setup link',
      error: error.message
    });
  }
};

// @desc    Setup teacher account
// @route   POST /api/teachers/setup-account/:token
// @access  Public
const setupTeacherAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Get token from URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find teacher with valid token
    const teacher = await Teacher.findOne({
      accountSetupToken: hashedToken,
      accountSetupExpires: { $gt: Date.now() }
    });

    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired'
      });
    }

    // Set password and activate account
    teacher.password = req.body.password;
    teacher.hasAccount = true;
    teacher.accountSetupToken = undefined;
    teacher.accountSetupExpires = undefined;
    teacher.lastLogin = new Date();
    
    await teacher.save();

    // Send token
    createSendToken(teacher, 200, req, res);
  } catch (error) {
    console.error('Account setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during account setup',
      error: error.message
    });
  }
};

// @desc    Get teacher profile
// @route   GET /api/teachers/profile
// @access  Private/Teacher
const getTeacherProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.status(200).json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
};

// @desc    Teacher logout
// @route   POST /api/teachers/logout
// @access  Private/Teacher
const teacherLogout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  permanentDeleteTeacher,
  getTeachersByDepartment,
  getTeacherStats,
  // Authentication methods
  teacherLogin,
  sendAccountSetupLink,
  setupTeacherAccount,
  getTeacherProfile,
  teacherLogout
};