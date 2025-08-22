const User = require('../models/User');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { sendResponse } = require('../utils/responceHandler');

// Helper function to sign JWT token
const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '90d'
  });
};

// Helper function to handle validation errors
const handleValidationErrors = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {
      hasErrors: true,
      errors: errors.array().map(error => ({
        field: error.param || error.path,
        message: error.msg,
        value: error.value
      }))
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
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Check if account is set up
    if (!teacher.hasAccount || !teacher.password) {
      return sendResponse(res, 401, false, 'Account not set up. Please contact admin for setup link.');
    }

    // Check approval status
    if (teacher.approvalStatus !== 'approved') {
      const statusMessage = teacher.approvalStatus === 'rejected' 
        ? 'Account has been rejected. Please contact admin.'
        : 'Account pending approval. Please contact admin.';
      return sendResponse(res, 401, false, statusMessage);
    }

    // Verify password
    const isPasswordCorrect = await teacher.correctPassword(password);
    if (!isPasswordCorrect) {
      return sendResponse(res, 401, false, 'Invalid credentials');
    }

    // Update last login
    teacher.lastLogin = new Date();
    await teacher.save({ validateBeforeSave: false });

    // Create token
    const token = signToken({
      id: teacher._id.toString(),
      email: teacher.email, 
      role: 'teacher', 
      loginTime: Date.now() 
    });

    // Remove sensitive data from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;
    delete teacherResponse.accountSetupToken;
    delete teacherResponse.accountSetupExpires;
    delete teacherResponse.passwordResetToken;
    delete teacherResponse.passwordResetExpires;

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
    }).select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');
    
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
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: 'teacher',
      teacherProfile,
      approvalStatus: 'pending',
      isActive: true,
      hasAccount: false
    };

    // If password is provided, set it and mark account as active
    if (password && password.trim()) {
      userData.password = password;
      userData.hasAccount = true;
      userData.approvalStatus = 'approved'; // Auto-approve if created with password
    }

    // Create new teacher user
    const teacher = new User(userData);
    const savedTeacher = await teacher.save();

    // Remove sensitive data from response
    const responseData = savedTeacher.toObject();
    delete responseData.password;
    delete responseData.accountSetupToken;
    delete responseData.accountSetupExpires;
    delete responseData.passwordResetToken;
    delete responseData.passwordResetExpires;

    console.log('✅ Teacher created successfully:', {
      teacherId: savedTeacher._id.toString(),
      teacherEmail: savedTeacher.email,
      hasPassword: !!password
    });

    return sendResponse(res, 201, true, 'Teacher created successfully', responseData);
    
  } catch (error) {
    console.error('❌ Error creating teacher:', error);
    
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
      return sendResponse(res, 400, false, `Teacher with this ${field} already exists`);
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
    if (updateData.email && updateData.email.toLowerCase().trim() !== existingTeacher.email) {
      const emailExists = await User.findOne({ 
        email: updateData.email.toLowerCase().trim(), 
        _id: { $ne: teacherId } 
      });
      
      if (emailExists) {
        return sendResponse(res, 400, false, 'User with this email already exists');
      }
    }

    // Prepare update data
    const teacherProfileFields = ['phone', 'department', 'subject', 'experience', 'qualification', 'bio', 'availability'];
    const generalFields = ['name', 'email', 'approvalStatus'];
    
    const finalUpdateData = { updatedAt: new Date() };
    const teacherProfileUpdates = {};

    // Separate general fields from teacher profile fields
    Object.keys(updateData).forEach(key => {
      if (generalFields.includes(key)) {
        if (key === 'email') {
          finalUpdateData[key] = updateData[key].toLowerCase().trim();
        } else if (key === 'name') {
          finalUpdateData[key] = updateData[key].trim();
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
    ).select('-__v -password -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');

    if (!updatedTeacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

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
        message: err.message,
        value: err.value
      }));
      
      return sendResponse(res, 400, false, 'Validation failed', null, validationErrors);
    }

    if (error.name === 'CastError') {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return sendResponse(res, 400, false, `Teacher with this ${field} already exists`);
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
      sortOrder = 'desc',
      status = 'approved' // Filter by approval status
    } = req.query;

    // Build filter object
    const filter = { 
      role: 'teacher', 
      isActive: true
    };
    
    // Add status filter
    if (status && status !== 'all') {
      filter.approvalStatus = status;
    }
    
    if (department) {
      filter['teacherProfile.department'] = department;
    }
    
    if (subject) {
      filter['teacherProfile.subject'] = { $regex: subject, $options: 'i' };
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
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit))); // Max 50 items per page
    const skip = (pageNum - 1) * limitNum;
    
    const [teachers, totalTeachers] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .select('-__v -password -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires'),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalTeachers / limitNum);

    const paginationMeta = {
      currentPage: pageNum,
      totalPages,
      totalTeachers,
      hasNext: pageNum < totalPages,
      hasPrev: pageNum > 1,
      limit: limitNum,
      filters: {
        department: department || null,
        subject: subject || null,
        search: search || null,
        status: status || 'approved'
      }
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
    }).select('-__v -password -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');
    
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    if (!teacher.isActive) {
      return sendResponse(res, 404, false, 'Teacher is not active');
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
    const updatedTeacher = await User.findByIdAndUpdate(
      teacherId, 
      { 
        isActive: false, 
        updatedAt: new Date() 
      },
      { new: true }
    );

    console.log('✅ Teacher soft deleted:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email
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

    console.log('✅ Teacher permanently deleted:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email
    });

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
    
    // Validate department
    const validDepartments = [
      'Computer Science',
      'Mathematics', 
      'Physics',
      'Chemistry',
      'Biology',
      'English',
      'History',
      'Economics',
      'Business Administration',
      'Psychology'
    ];

    if (!validDepartments.includes(department)) {
      return sendResponse(res, 400, false, 'Invalid department');
    }
    
    const teachers = await User.find({
      role: 'teacher',
      'teacherProfile.department': department,
      isActive: true,
      approvalStatus: 'approved'
    }).select('-__v -password -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');
    
    return sendResponse(
      res, 
      200, 
      true, 
      `Teachers from ${department} department retrieved successfully`, 
      teachers, 
      null, 
      { count: teachers.length, department }
    );
    
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
    const [
      totalTeachers,
      approvedTeachers,
      pendingTeachers,
      rejectedTeachers,
      departmentStats,
      availabilityStats
    ] = await Promise.all([
      User.countDocuments({ role: 'teacher', isActive: true }),
      User.countDocuments({ role: 'teacher', isActive: true, approvalStatus: 'approved' }),
      User.countDocuments({ role: 'teacher', isActive: true, approvalStatus: 'pending' }),
      User.countDocuments({ role: 'teacher', isActive: true, approvalStatus: 'rejected' }),
      User.aggregate([
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
      ]),
      User.aggregate([
        { 
          $match: { 
            role: 'teacher', 
            isActive: true,
            approvalStatus: 'approved' 
          } 
        },
        { $unwind: { path: '$teacherProfile.availability', preserveNullAndEmptyArrays: true } },
        { 
          $group: { 
            _id: '$teacherProfile.availability', 
            count: { $sum: 1 } 
          } 
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { count: -1 } }
      ])
    ]);

    const stats = {
      overview: {
        totalTeachers,
        approvedTeachers,
        pendingTeachers,
        rejectedTeachers
      },
      departmentStats: departmentStats.map(stat => ({
        department: stat._id || 'Unknown',
        count: stat.count
      })),
      availabilityStats: availabilityStats.map(stat => ({
        timeSlot: stat._id,
        count: stat.count
      }))
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
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const { teacherId } = req.body;

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOne({ _id: teacherId, role: 'teacher', isActive: true });
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    if (teacher.hasAccount) {
      return sendResponse(res, 400, false, 'Teacher already has an account');
    }

    // Generate setup token
    const setupToken = teacher.createAccountSetupToken();
    await teacher.save({ validateBeforeSave: false });

    // In production, send this via email instead of returning in response
    const setupURL = `${req.protocol}://${req.get('host')}/api/teachers/setup-account/${setupToken}`;

    const responseData = {
      teacherEmail: teacher.email,
      teacherName: teacher.name,
      // Remove setupURL in production and send via email
      ...(process.env.NODE_ENV === 'development' && { setupURL }),
      expiresAt: teacher.accountSetupExpires,
      message: 'Setup link generated successfully. In production, this would be sent via email.'
    };

    console.log('✅ Setup link generated for teacher:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email,
      expiresAt: teacher.accountSetupExpires
    });

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

    const { password } = req.body;
    const { token } = req.params;

    if (!token) {
      return sendResponse(res, 400, false, 'Setup token is required');
    }

    // Hash the token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find teacher with valid token
    const teacher = await User.findOne({
      role: 'teacher',
      accountSetupToken: hashedToken,
      accountSetupExpires: { $gt: Date.now() },
      isActive: true
    });

    if (!teacher) {
      return sendResponse(res, 400, false, 'Token is invalid or has expired');
    }

    if (teacher.hasAccount) {
      return sendResponse(res, 400, false, 'Account is already set up');
    }

    // Set password and activate account
    teacher.password = password;
    teacher.hasAccount = true;
    teacher.accountSetupToken = undefined;
    teacher.accountSetupExpires = undefined;
    teacher.approvalStatus = 'approved'; // Auto-approve on account setup
    teacher.lastLogin = new Date();
    
    await teacher.save();

    // Create token
    const jwtToken = signToken({
      id: teacher._id.toString(),
      email: teacher.email,
      role: 'teacher',
      loginTime: Date.now()
    });

    // Remove sensitive data from response
    const teacherResponse = teacher.toObject();
    delete teacherResponse.password;
    delete teacherResponse.accountSetupToken;
    delete teacherResponse.accountSetupExpires;
    delete teacherResponse.passwordResetToken;
    delete teacherResponse.passwordResetExpires;

    console.log('✅ Teacher account setup completed:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email
    });

    return sendResponse(res, 200, true, 'Account setup completed successfully', {
      teacher: teacherResponse,
      token: jwtToken
    });
    
  } catch (error) {
    console.error('❌ Account setup error:', error);
    return sendResponse(res, 500, false, 'Server error during account setup', null, [{ message: error.message }]);
  }
};

// Add this after the approveTeacher function (around line 940)

// @desc    Approve teacher
// @route   PATCH /api/teachers/:id/approve
// @access  Private/Admin
const approveTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOneAndUpdate(
      { _id: teacherId, role: 'teacher', isActive: true },
      { 
        approvalStatus: 'approved',
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');

    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    console.log('✅ Teacher approved:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email
    });

    return sendResponse(res, 200, true, 'Teacher approved successfully', teacher);

  } catch (error) {
    console.error('❌ Error approving teacher:', error);
    return sendResponse(res, 500, false, 'Server error while approving teacher', null, [{ message: error.message }]);
  }
};

// @desc    Reject teacher
// @route   PATCH /api/teachers/:id/reject
// @access  Private/Admin
const rejectTeacher = async (req, res) => {
  try {
    const teacherId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return sendResponse(res, 400, false, 'Invalid teacher ID format');
    }

    const teacher = await User.findOneAndUpdate(
      { _id: teacherId, role: 'teacher', isActive: true },
      { 
        approvalStatus: 'rejected',
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');

    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    console.log('✅ Teacher rejected:', {
      teacherId: teacher._id.toString(),
      teacherEmail: teacher.email
    });

    return sendResponse(res, 200, true, 'Teacher rejected successfully', teacher);

  } catch (error) {
    console.error('❌ Error rejecting teacher:', error);
    return sendResponse(res, 500, false, 'Server error while rejecting teacher', null, [{ message: error.message }]);
  }
};
// @desc    Teacher logout
// @route   POST /api/teachers/logout
// @access  Private/Teacher
const teacherLogout = (req, res) => {
  // Clear JWT cookie if using cookies
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  console.log('✅ Teacher logout:', {
    teacherId: req.user?.id,
    teacherEmail: req.user?.email
  });
  
  return sendResponse(res, 200, true, 'Logged out successfully');
};

// @desc    Update teacher profile (by teacher themselves)
// @route   PUT /api/teachers/profile
// @access  Private/Teacher
const updateTeacherProfile = async (req, res) => {
  try {
    const validation = handleValidationErrors(req);
    if (validation.hasErrors) {
      return sendResponse(res, 400, false, 'Validation failed', null, validation.errors);
    }

    const teacherId = req.user.id;
    const updateData = req.body;

    // Fields that teachers can update themselves
    const allowedFields = ['bio', 'availability', 'phone'];
    const teacherProfileUpdates = {};
    const generalUpdates = { updatedAt: new Date() };

    // Filter allowed fields
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        teacherProfileUpdates[`teacherProfile.${key}`] = updateData[key];
      }
    });

    if (Object.keys(teacherProfileUpdates).length === 0) {
      return sendResponse(res, 400, false, 'No valid fields to update');
    }

    // Merge updates
    Object.assign(generalUpdates, teacherProfileUpdates);

    // Update teacher
    const updatedTeacher = await User.findByIdAndUpdate(
      teacherId,
      generalUpdates,
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-__v -password -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');

    if (!updatedTeacher) {
      return sendResponse(res, 404, false, 'Teacher not found');
    }

    console.log('✅ Teacher profile updated by teacher:', {
      teacherId: updatedTeacher._id.toString(),
      teacherEmail: updatedTeacher.email
    });

    return sendResponse(res, 200, true, 'Profile updated successfully', updatedTeacher);
    
  } catch (error) {
    console.error('❌ Error updating teacher profile:', error);
    
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

module.exports = {
  // Public routes
  getAllTeachers,
  getTeacherById,
  getTeachersByDepartment,
  
  // Authentication routes
  teacherLogin,
  teacherLogout,
  setupTeacherAccount,
  
  // Teacher protected routes
  getTeacherProfile,
  updateTeacherProfile,
  
  // Admin protected routes
  createTeacher,
  updateTeacher,
  deleteTeacher,
  permanentDeleteTeacher,
  getTeacherStats,
  sendAccountSetupLink,
  approveTeacher,
  rejectTeacher,
};