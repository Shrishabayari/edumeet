const Teacher = require('../models/Teacher');
const { validationResult } = require('express-validator');

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
      availability
    } = req.body;

    // Check if teacher with email already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'Teacher with this email already exists'
      });
    }

    // Create new teacher
    const teacher = new Teacher({
      name,
      email,
      phone,
      department,
      subject,
      experience,
      qualification,
      bio,
      availability: availability || []
    });

    const savedTeacher = await teacher.save();

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: savedTeacher
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

module.exports = {
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  permanentDeleteTeacher,
  getTeachersByDepartment,
  getTeacherStats
};