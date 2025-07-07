const Appointment = require('../models/Appointment');
const Teacher = require('../models/Teacher');
const { validationResult } = require('express-validator');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
const getAllAppointments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      teacherId,
      studentEmail,
      date,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (teacherId) filter.teacher = teacherId;
    if (studentEmail) filter['student.email'] = studentEmail;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const appointments = await Appointment.find(filter)
      .populate('teacher', 'name email department subject')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const totalAppointments = await Appointment.countDocuments(filter);
    const totalPages = Math.ceil(totalAppointments / parseInt(limit));

    res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalAppointments,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointments',
      error: error.message
    });
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
// @access  Private
const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('teacher', 'name email department subject phone');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment',
      error: error.message
    });
  }
};

// @desc    Book new appointment
// @route   POST /api/appointments
// @access  Public
const bookAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { teacherId, day, time, date, student } = req.body;

    // Verify teacher exists
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check if teacher is available at this time
    if (!teacher.availability.includes(time)) {
      return res.status(400).json({
        success: false,
        message: 'Teacher is not available at this time'
      });
    }

    // Parse appointment date
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book appointment in the past'
      });
    }

    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      teacher: teacherId,
      appointmentDate: {
        $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
        $lt: new Date(appointmentDate.setHours(23, 59, 59, 999))
      },
      timeSlot: time,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }

    // Create new appointment
    const appointment = new Appointment({
      teacher: teacherId,
      student,
      appointmentDate: new Date(date),
      timeSlot: time,
      status: 'pending'
    });

    await appointment.save();

    // Populate teacher info for response
    await appointment.populate('teacher', 'name email department subject');

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    
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
      message: 'Server error while booking appointment',
      error: error.message
    });
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id
// @access  Private
const updateAppointment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const appointmentId = req.params.id;
    const { status, notes } = req.body;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Update appointment
    appointment.status = status || appointment.status;
    appointment.notes = notes || appointment.notes;
    appointment.updatedAt = new Date();

    await appointment.save();

    // Populate teacher info for response
    await appointment.populate('teacher', 'name email department subject');

    res.status(200).json({
      success: true,
      message: 'Appointment updated successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Error updating appointment:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating appointment',
      error: error.message
    });
  }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
// @access  Public
const cancelAppointment = async (req, res) => {
  try {
    const appointmentId = req.params.id;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if appointment can be cancelled
    if (appointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed appointment'
      });
    }

    // Update status to cancelled
    appointment.status = 'cancelled';
    appointment.updatedAt = new Date();
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while cancelling appointment',
      error: error.message
    });
  }
};

// @desc    Get teacher's appointments
// @route   GET /api/appointments/teacher/:teacherId
// @access  Private
const getTeacherAppointments = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status, date, page = 1, limit = 10 } = req.query;

    // Build filter
    const filter = { teacher: teacherId };
    if (status) filter.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      filter.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const appointments = await Appointment.find(filter)
      .populate('teacher', 'name email department subject')
      .sort({ appointmentDate: 1, timeSlot: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalAppointments = await Appointment.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAppointments / parseInt(limit)),
        totalAppointments
      }
    });
  } catch (error) {
    console.error('Error fetching teacher appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teacher appointments',
      error: error.message
    });
  }
};

// @desc    Get appointment statistics
// @route   GET /api/appointments/stats
// @access  Private
const getAppointmentStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    
    const statusStats = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const monthlyStats = await Appointment.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$appointmentDate' },
            month: { $month: '$appointmentDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAppointments,
        statusStats,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching appointment statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  bookAppointment,
  updateAppointment,
  cancelAppointment,
  getTeacherAppointments,
  getAppointmentStats
};