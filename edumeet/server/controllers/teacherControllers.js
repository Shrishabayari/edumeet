const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { sendResponse } = require('../middleware/auth');

// Helper function to sign JWT token
const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '90d'
  });
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

// @desc    Teacher login
// @route   POST /api/teachers/login
// @access  Public
const teacherLogin = async (req, res) => {
  try {
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const { email, password } = req.body;

    // Find teacher by email with password field included
    const teacher = await User.findOne({ 
      email: email.toLowerCase().trim(), 
      role: 'teacher',
      isActive: true 
    }).select('+password');
    
    if (!teacher) {
      return sendResponse(res, 401, false, 'Invalid credentials or teacher not found');
    }

    // Check if account is set up
    if (!teacher.hasAccount || !teacher.password) {
      return sendResponse(res, 401, false, 'Account not set up. Please contact admin for setup link.');
    }

    // Check approval status
    if (teacher.approvalStatus !== 'approved') {
      return sendResponse(res, 401, false, 'Account not approved. Please contact admin.');
    }

    // Verify password
    const isPasswordCorrect = await teacher.correctPassword(password, teacher.password);
    if (!isPasswordCorrect) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Update last login
    teacher.lastLogin = new Date();
    await teacher.save({ validateBeforeSave: false });

    // Create token with string ID
    const token = jwt.sign(
      { 
        id: teacher._id.toString(),
        email: teacher.email, 
        role: 'teacher', 
        loginTime: Date.now() 
      },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    );

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    console.log('✅ Teacher login successful:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email,
      tokenCreated: !!token
    });

    return sendResponse(res, 200, true, 'Login successful', { 
      teacher: teacherResponse,
      token
    });

  } catch (error) {
    console.error('❌ Teacher login error:', error);
    return sendResponse(res, 500, false, 'Server error during login', null, [{ message: error.message }]);
  }
};

// @desc    Get teacher profile
// @route   GET /api/teachers/profile
// @access  Private/Teacher
const getTeacherProfile = async (req, res) => {
  try {
    console.log('🔍 Getting teacher profile for user:', {
      userId: req.user?.id,
      userRole: req.user?.role
    });

    // Validate teacher ID from JWT
    if (!req.user?.id) {
      return sendResponse(res, 400, false, 'No user ID found in token');
    }

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      console.error('❌ Invalid teacher ID format:', req.user.id);
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    // Find teacher by ID
    const teacher = await User.findOne({ 
      _id: req.user.id, 
      role: 'teacher',
      isActive: true 
    }).select('-password -__v');
    
    if (!teacher) {
      console.error('❌ Teacher not found with ID:', req.user.id);
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    console.log('✅ Teacher profile found:', {
      teacherId: teacher._id.toString(),
      teacherName: teacher.name,
      teacherEmail: teacher.email
    });

    return sendResponse(res, 200, true, 'Profile retrieved successfully', teacher);

  } catch (error) {
    console.error('❌ Profile fetch error:', error);
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    return sendResponse(res, 500, false, 'Server error while fetching profile', null, [{ message: error.message }]);
  }
};

// @desc    Create new teacher
// @route   POST /api/teachers
// @access  Private/Admin
const createTeacher = async (req, res) => {
  try {
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
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
      password
    } = req.body;

    // Check if user with email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendResponse(res, 400, false, 'User with this email already exists');
    }

    // Create teacher profile object
    const teacherProfile = {
      phone,
      department,
      subject,
      experience,
      qualification,
      bio,
      availability: availability || []
    };

    // Create new teacher user object
    const userData = {
      name,
      email: email.toLowerCase().trim(),
      role: 'teacher',
      teacherProfile,
      approvalStatus: 'pending',
      isActive: true
    };

    // If password is provided, set it and mark account as active
    if (password) {
      userData.password = password;
      userData.hasAccount = true;
      userData.lastLogin = new Date();
    }

    // Create new teacher user
    const teacher = new User(userData);
    const savedTeacher = await teacher.save();

    // Remove password from response
    const responseData = savedTeacher.toObject();
    delete responseData.password;

    console.log('✅ Teacher created successfully:', {
      teacherId: savedTeacher._id.toString(),
      teacherEmail: savedTeacher.email
    });

    return sendResponse(res, 201, true, 'Teacher created successfully', responseData);
    
  } catch (error) {
    console.error('❌ Error creating teacher:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return sendResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }

    if (error.code === 11000) {
      return sendResponse(res, 400, false, 'Teacher with this email already exists');
    }

    return sendResponse(res, 500, false, 'Server error while creating teacher', null, [{ message: error.message }]);
  }
};

// @desc    Update teacher
// @route   PUT /api/teachers/:id
// @access  Private/Admin
const updateTeacher = async (req, res) => {
  try {
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const teacherId = req.params.id;
    const updateData = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    // Check if teacher exists
    const existingTeacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!existingTeacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    // If email is being updated, check for duplicates
    if (updateData.email && updateData.email !== existingTeacher.email) {
      const emailExists = await User.findOne({ 
        email: updateData.email.toLowerCase().trim(), 
        _id: { $ne: teacherId } 
      });
      
      if (emailExists) {
        return sendResponse(res, 400, false, 'User with this email already exists');
      }
    }

    // Prepare update data for teacher profile fields
    const teacherProfileFields = ['phone', 'department', 'subject', 'experience', 'qualification', 'bio', 'availability'];
    const generalFields = ['name', 'email'];
    
    const finalUpdateData = { updatedAt: new Date() };
    const teacherProfileUpdates = {};

    // Separate general fields from teacher profile fields
    Object.keys(updateData).forEach(key => {
      if (generalFields.includes(key)) {
        if (key === 'email') {
          finalUpdateData[key] = updateData[key].toLowerCase().trim();
        } else {
          finalUpdateData[key] = updateData[key];
        }
      } else if (teacherProfileFields.includes(key)) {
        teacherProfileUpdates[`teacherProfile.${key}`] = updateData[key];
      }
    });

    // Merge teacher profile updates
    Object.assign(finalUpdateData, teacherProfileUpdates);

    // Update teacher
    const updatedTeacher = await User.findByIdAndUpdate(
      teacherId,
      finalUpdateData,
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-__v -password');

    console.log('✅ Teacher updated successfully:', {
      teacherId: updatedTeacher._id.toString(),
      teacherEmail: updatedTeacher.email
    });

    return sendResponse(res, 200, true, 'Teacher updated successfully', updatedTeacher);
    
  } catch (error) {
    console.error('❌ Error updating teacher:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return sendResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }

    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    return sendResponse(res, 500, false, 'Server error while updating teacher', null, [{ message: error.message }]);
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
    const filter = { 
      role: 'teacher', 
      isActive: true,
      approvalStatus: 'approved'
    };
    
    if (department) {
      filter['teacherProfile.department'] = department;
    }
    
    if (subject) {
      filter['teacherProfile.subject'] = subject;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'teacherProfile.subject': { $regex: search, $options: 'i' } },
        { 'teacherProfile.department': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const teachers = await User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v -password');

    const totalTeachers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalTeachers / parseInt(limit));

    const paginationMeta = {
      currentPage: parseInt(page),
      totalPages,
      totalTeachers,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit: parseInt(limit)
    };

    return sendResponse(res, 200, true, 'Teachers retrieved successfully', teachers, null, paginationMeta);
    
  } catch (error) {
    console.error('❌ Error fetching teachers:', error);
    return sendResponse(res, 500, false, 'Server error while fetching teachers', null, [{ message: error.message }]);
  }
};

// @desc    Get single teacher
// @route   GET /api/teachers/:id
// @access  Public
const getTeacherById = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOne({ 
      _id: teacherId, 
      role: 'teacher' 
    }).select('-__v -password');
    
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    if (!teacher.isActive) {
      return sendResponse(res, 404, false, 'Teacher is not active');
    }

    if (teacher.approvalStatus !== 'approved') {
      return sendResponse(res, 404, false, 'Teacher is not approved');
    }

    return sendResponse(res, 200, true, 'Teacher retrieved successfully', teacher);
    
  } catch (error) {
    console.error('❌ Error fetching teacher:', error);
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    return sendResponse(res, 500, false, 'Server error while fetching teacher', null, [{ message: error.message }]);
  }
};

// @desc    Delete teacher (soft delete)
// @route   DELETE /api/teachers/:id
// @access  Private/Admin
const deleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    // Soft delete - set isActive to false
    await User.findByIdAndUpdate(teacherId, { 
      isActive: false, 
      updatedAt: new Date() 
    });

    return sendResponse(res, 200, true, 'Teacher deleted successfully');
    
  } catch (error) {
    console.error('❌ Error deleting teacher:', error);
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    return sendResponse(res, 500, false, 'Server error while deleting teacher', null, [{ message: error.message }]);
  }
};

// @desc    Permanently delete teacher
// @route   DELETE /api/teachers/:id/permanent
// @access  Private/Admin
const permanentDeleteTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    await User.findByIdAndDelete(teacherId);

    return sendResponse(res, 200, true, 'Teacher permanently deleted');
    
  } catch (error) {
    console.error('❌ Error permanently deleting teacher:', error);
    
    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    return sendResponse(res, 500, false, 'Server error while permanently deleting teacher', null, [{ message: error.message }]);
  }
};

// @desc    Get teachers by department
// @route   GET /api/teachers/department/:department
// @access  Public
const getTeachersByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    
    const teachers = await User.find({
      role: 'teacher',
      'teacherProfile.department': department,
      isActive: true,
      approvalStatus: 'approved'
    }).select('-__v -password');
    
    return sendResponse(res, 200, true, `Teachers from ${department} department retrieved successfully`, teachers, null, { count: teachers.length });
    
  } catch (error) {
    console.error('❌ Error fetching teachers by department:', error);
    return sendResponse(res, 500, false, 'Server error while fetching teachers by department', null, [{ message: error.message }]);
  }
};

// @desc    Get teacher statistics
// @route   GET /api/teachers/stats
// @access  Private/Admin
const getTeacherStats = async (req, res) => {
  try {
    const totalTeachers = await User.countDocuments({ 
      role: 'teacher', 
      isActive: true,
      approvalStatus: 'approved' 
    });
    
    const departmentStats = await User.aggregate([
      { 
        $match: { 
          role: 'teacher', 
          isActive: true,
          approvalStatus: 'approved' 
        } 
      },
      { 
        $group: { 
          _id: '$teacherProfile.department', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } }
    ]);

    const availabilityStats = await User.aggregate([
      { 
        $match: { 
          role: 'teacher', 
          isActive: true,
          approvalStatus: 'approved' 
        } 
      },
      { $unwind: '$teacherProfile.availability' },
      { 
        $group: { 
          _id: '$teacherProfile.availability', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } }
    ]);

    const stats = {
      totalTeachers,
      departmentStats,
      availabilityStats
    };

    return sendResponse(res, 200, true, 'Teacher statistics retrieved successfully', stats);
    
  } catch (error) {
    console.error('❌ Error fetching teacher stats:', error);
    return sendResponse(res, 500, false, 'Server error while fetching teacher statistics', null, [{ message: error.message }]);
  }
};

// @desc    Send account setup link to teacher
// @route   POST /api/teachers/send-setup-link
// @access  Private/Admin
const sendAccountSetupLink = async (req, res) => {
  try {
    const { teacherId } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'teacher' });
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    if (teacher.hasAccount) {
      return sendResponse(res, 400, false, 'Teacher already has an account');
    }

    // Generate setup token
    const setupToken = teacher.createAccountSetupToken();
    await teacher.save({ validateBeforeSave: false });

    // In a real app, you'd send an email here
    const setupURL = `${req.protocol}://${req.get('host')}/api/teachers/setup-account/${setupToken}`;

    const responseData = {
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      setupURL, // In production, remove this and send via email
      expiresAt: teacher.accountSetupExpires
    };

    return sendResponse(res, 200, true, 'Account setup link generated successfully', responseData);
    
  } catch (error) {
    console.error('❌ Setup link error:', error);
    return sendResponse(res, 500, false, 'Server error while generating setup link', null, [{ message: error.message }]);
  }
};

// @desc    Setup teacher account
// @route   POST /api/teachers/setup-account/:token
// @access  Public
const setupTeacherAccount = async (req, res) => {
  try {
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    // Get token from URL
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find teacher with valid token
    const teacher = await User.findOne({
      role: 'teacher',
      accountSetupToken: hashedToken,
      accountSetupExpires: { $gt: Date.now() }
    });

    if (!teacher) {
      return sendResponse(res, 400, false, 'Token is invalid or has expired');
    }

    // Set password and activate account
    teacher.password = req.body.password;
    teacher.hasAccount = true;
    teacher.accountSetupToken = undefined;
    teacher.accountSetupExpires = undefined;
    teacher.lastLogin = new Date();
    
    await teacher.save();

    // Create token
    const token = signToken({
      id: teacher._id.toString(),
      email: teacher.email,
      role: 'teacher',
      loginTime: Date.now()
    });

    // Remove password from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;

    return sendResponse(res, 200, true, 'Account setup completed successfully', {
      teacher: teacherResponse,
      token
    });
    
  } catch (error) {
    console.error('❌ Account setup error:', error);
    return sendResponse(res, 500, false, 'Server error during account setup', null, [{ message: error.message }]);
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
  
  return sendResponse(res, 200, true, 'Logged out successfully');
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