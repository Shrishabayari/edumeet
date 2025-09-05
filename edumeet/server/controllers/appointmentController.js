const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Teacher = require('../models/Teacher');

// Get all appointments (with filtering options)
const getAllAppointments = async (req, res) => {
  try {
    console.log('Fetching all appointments...');
    
    const { status, createdBy, teacherId } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    if (teacherId) filter.teacherId = teacherId;
    
    const appointments = await Appointment.find(filter)
      .populate('teacherId', 'name email phone subject')
      .sort({ createdAt: -1 });
    
    console.log(`Found ${appointments.length} appointments`);
    
    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message
    });
  }
};

// Get appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }
    
    const appointment = await Appointment.findById(id)
      .populate('teacherId', 'name email phone subject');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment',
      error: error.message
    });
  }
};

// Helper function to normalize time format
const normalizeTimeFormat = (timeString) => {
  if (!timeString) return timeString;
  
  // Remove extra spaces and normalize format
  let normalized = timeString.trim();
  
  // Handle different time formats
  if (normalized.includes(' - ')) {
    // Extract start time from range like "3:00 PM - 4:00 PM"
    normalized = normalized.split(' - ')[0].trim();
  }
  
  // Ensure proper AM/PM format
  if (normalized.match(/^\d{1,2}:\d{2}\s?(AM|PM)$/i)) {
    return normalized.toUpperCase();
  }
  
  // Handle 24-hour format conversion if needed
  if (normalized.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, minutes] = normalized.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  }
  
  return normalized;
};

// Student requests appointment (needs teacher approval)
const requestAppointment = async (req, res) => {
  try {
    console.log('Student requesting appointment with data:', req.body);
    
    const { teacherId, day, time, date, student } = req.body;
    
    // Validate required fields
    if (!teacherId || !day || !time || !date || !student) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['teacherId', 'day', 'time', 'date', 'student']
      });
    }
    
    // Validate student required fields
    if (!student.name || !student.email) {
      return res.status(400).json({
        success: false,
        message: 'Student name and email are required'
      });
    }
    
    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Normalize time format
    const normalizedTime = normalizeTimeFormat(time);
    console.log('Normalized time:', normalizedTime);
    
    // Check if slot is already booked or has pending request
    const conflictingAppointment = await Appointment.checkTimeSlotAvailability(
      teacherId, 
      date, 
      normalizedTime
    );
    
    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked or has a pending request'
      });
    }
    
    // Create appointment request
    const appointmentData = {
      teacherId,
      teacherName: teacher.name,
      student: {
        name: student.name?.trim(),
        email: student.email?.trim()?.toLowerCase(),
        phone: student.phone?.trim() || '',
        subject: student.subject?.trim() || '',
        message: student.message?.trim() || ''
      },
      day,
      time: normalizedTime,
      date: new Date(date),
      appointmentDate: new Date(date).toISOString(),
      status: 'pending',
      createdBy: 'student'
    };
    
    console.log('Creating appointment request with data:', appointmentData);
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    // Populate teacher details for response
    await appointment.populate('teacherId', 'name email phone subject');
    
    console.log('Appointment request created successfully:', appointment._id);
    
    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment request sent to teacher successfully'
    });
    
  } catch (error) {
    console.error('Error requesting appointment:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        details: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to request appointment',
      error: error.message
    });
  }
};

// Teacher books appointment directly (no approval needed)
const teacherBookAppointment = async (req, res) => {
  try {
    console.log('Teacher booking appointment with data:', req.body);
    
    const { day, time, date, student, notes } = req.body;
    const teacherId = req.user?.id || req.body.teacherId; // Assuming auth middleware sets req.user
    
    // Validate required fields
    if (!teacherId || !day || !time || !date || !student) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        required: ['day', 'time', 'date', 'student']
      });
    }
    
    // Validate student required fields
    if (!student.name || !student.email) {
      return res.status(400).json({
        success: false,
        message: 'Student name and email are required'
      });
    }
    
    // Find teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    
    // Normalize time format
    const normalizedTime = normalizeTimeFormat(time);
    
    // Check if slot is already booked
    const conflictingAppointment = await Appointment.checkTimeSlotAvailability(
      teacherId, 
      date, 
      normalizedTime
    );
    
    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }
    
    // Create direct booking
    const appointmentData = {
      teacherId,
      teacherName: teacher.name,
      student: {
        name: student.name?.trim(),
        email: student.email?.trim()?.toLowerCase(),
        phone: student.phone?.trim() || '',
        subject: student.subject?.trim() || '',
        message: student.message?.trim() || ''
      },
      day,
      time: normalizedTime,
      date: new Date(date),
      appointmentDate: new Date(date).toISOString(),
      status: 'booked',
      createdBy: 'teacher',
      notes: notes?.trim() || ''
    };
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    await appointment.populate('teacherId', 'name email phone subject');
    
    console.log('Appointment booked directly by teacher:', appointment._id);
    
    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment booked successfully'
    });
    
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book appointment',
      error: error.message
    });
  }
};

// Fixed acceptAppointmentRequest function
const acceptAppointmentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    
    console.log('=== ACCEPT APPOINTMENT REQUEST ===');
    console.log('Appointment ID:', id);
    console.log('Response Message:', responseMessage);
    console.log('Request User:', req.user);
    
    // Validate appointment ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error('Invalid appointment ID format:', id);
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }
    
    // First, find the appointment without teacher restriction to debug
    const appointmentCheck = await Appointment.findById(id);
    console.log('Appointment found (debug):', appointmentCheck);
    
    if (!appointmentCheck) {
      console.error('Appointment not found with ID:', id);
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Check if appointment is in correct state
    if (appointmentCheck.status !== 'pending') {
      console.error('Appointment not pending. Current status:', appointmentCheck.status);
      return res.status(400).json({
        success: false,
        message: `Cannot accept appointment. Current status: ${appointmentCheck.status}`
      });
    }
    
    if (appointmentCheck.createdBy !== 'student') {
      console.error('Appointment not created by student:', appointmentCheck.createdBy);
      return res.status(400).json({
        success: false,
        message: 'Only student requests can be accepted'
      });
    }
    
    // Get teacherId from request (could be from auth middleware or request body)
    const teacherId = req.user?.id || req.user?._id || req.body.teacherId;
    console.log('Teacher ID from request:', teacherId);
    console.log('Appointment teacherId:', appointmentCheck.teacherId);
    
    // If we have teacher auth, verify teacher owns this appointment
    if (teacherId && appointmentCheck.teacherId.toString() !== teacherId.toString()) {
      console.error('Teacher mismatch. Auth teacher:', teacherId, 'Appointment teacher:', appointmentCheck.teacherId);
      return res.status(403).json({
        success: false,
        message: 'You can only accept appointments assigned to you'
      });
    }
    
    // Update the appointment
    try {
      console.log('Updating appointment status to confirmed...');
      await appointmentCheck.acceptRequest(responseMessage);
      
      // Populate teacher details for response
      await appointmentCheck.populate('teacherId', 'name email phone subject');
      
      console.log('Appointment accepted successfully:', appointmentCheck._id);
      
      res.json({
        success: true,
        data: appointmentCheck,
        message: 'Appointment request accepted successfully'
      });
      
    } catch (updateError) {
      console.error('Error updating appointment:', updateError);
      throw updateError;
    }
    
  } catch (error) {
    console.error('=== ERROR IN ACCEPT APPOINTMENT ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to accept appointment',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        appointmentId: req.params.id,
        userId: req.user?.id,
        errorStack: error.stack
      } : undefined
    });
  }
};

// Teacher rejects appointment request
const rejectAppointmentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { responseMessage } = req.body;
    const teacherId = req.user?.id;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }
    
    const appointment = await Appointment.findOne({
      _id: id,
      teacherId,
      status: 'pending',
      createdBy: 'student'
    });
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment request not found or already processed '
      });
    }
    
    await appointment.rejectRequest(responseMessage);
    await appointment.populate('teacherId', 'name email phone subject');
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment request rejected'
    });
    
  } catch (error) {
    console.error('Error rejecting appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject appointment',
      error: error.message
    });
  }
};

// Update appointment
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }
    
    // Normalize time if it's being updated
    if (updates.time) {
      updates.time = normalizeTimeFormat(updates.time);
    }
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).populate('teacherId', 'name email phone subject');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating appointment:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update appointment',
      error: error.message
    });
  }
};

// Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const cancelledBy = req.user?.role || 'student'; // Default to student if no user info
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }
    
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    await appointment.cancelAppointment(cancelledBy, reason);
    await appointment.populate('teacherId', 'name email phone subject');
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment cancelled successfully'
    });
    
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel appointment',
      error: error.message
    });
  }
};

// Get pending requests for teacher
const getTeacherPendingRequests = async (req, res) => {
  try {
    const teacherId = req.user?.id || req.params.teacherId;
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }
    
    const pendingRequests = await Appointment.findPendingForTeacher(teacherId)
      .populate('teacherId', 'name email phone subject');
    
    res.json({
      success: true,
      data: pendingRequests,
      count: pendingRequests.length
    });
    
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
};

// Get appointments for a specific teacher
const getTeacherAppointments = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status, createdBy } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }
    
    const filter = { teacherId };
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    
    const appointments = await Appointment.find(filter)
      .populate('teacherId', 'name email phone subject')
      .sort({ date: 1 });
    
    res.json({
      success: true,
      data: appointments,
      count: appointments.length
    });
    
  } catch (error) {
    console.error('Error fetching teacher appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher appointments',
      error: error.message
    });
  }
};

// Complete appointment
const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
    }
    
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    if (!['confirmed', 'booked'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed or booked appointments can be completed'
      });
    }
    
    await appointment.completeAppointment();
    await appointment.populate('teacherId', 'name email phone subject');
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment completed successfully'
    });
    
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete appointment',
      error: error.message
    });
  }
};

// Get appointment statistics
const getAppointmentStats = async (req, res) => {
  try {
    const totalAppointments = await Appointment.countDocuments();
    const pendingRequests = await Appointment.countDocuments({ 
      status: 'pending', 
      createdBy: 'student' 
    });
    const confirmedAppointments = await Appointment.countDocuments({ status: 'confirmed' });
    const directBookings = await Appointment.countDocuments({ 
      status: 'booked', 
      createdBy: 'teacher' 
    });
    const rejectedRequests = await Appointment.countDocuments({ status: 'rejected' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'cancelled' });
    const completedAppointments = await Appointment.countDocuments({ status: 'completed' });
    
    // Get appointments from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentAppointments = await Appointment.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    res.json({
      success: true,
      data: {
        total: totalAppointments,
        pendingRequests,
        confirmed: confirmedAppointments,
        directBookings,
        rejected: rejectedRequests,
        cancelled: cancelledAppointments,
        completed: completedAppointments,
        recent: recentAppointments
      }
    });
    
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment stats',
      error: error.message
    });
  }
};

const getCurrentUserAppointments = async (req, res) => {
  try {
    console.log('=== GET CURRENT USER APPOINTMENTS ===');
    console.log('Request User:', req.user);
    console.log('User ID:', req.user?.id);
    console.log('User Role:', req.user?.role);

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    let appointments = [];
    let filter = {};

    // Build filter based on user role
    switch (userRole) {
      case 'teacher':
        // For teachers: get all appointments where they are the teacher
        filter = { teacherId: userId };
        console.log('Fetching teacher appointments for:', userId);
        break;

      case 'student':
        // For students: get appointments where student email matches user email
        // OR where student name matches (in case email doesn't match exactly)
        const userEmail = req.user.email?.toLowerCase();
        const userName = req.user.name;

        filter = {
          $or: [
            { 'student.email': userEmail },
            { 'student.name': { $regex: new RegExp(userName, 'i') } }
          ]
        };
        console.log('Fetching student appointments for:', { email: userEmail, name: userName });
        break;

      case 'admin':
        // For admins: get all appointments (they can see everything)
        filter = {};
        console.log('Fetching all appointments for admin');
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid user role'
        });
    }

    // Add additional filters from query parameters
    const { status, createdBy, startDate, endDate } = req.query;
    
    if (status) {
      filter.status = status;
    }
    
    if (createdBy) {
      filter.createdBy = createdBy;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) {
        filter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.date.$lte = new Date(endDate);
      }
    }

    console.log('Final filter:', JSON.stringify(filter, null, 2));

    // Fetch appointments with population
    appointments = await Appointment.find(filter)
      .populate('teacherId', 'name email phone subject department')
      .sort({ date: -1, createdAt: -1 });

    console.log(`Found ${appointments.length} appointments for user`);

    // Group appointments by status for easier frontend handling
    const groupedAppointments = {
      pending: appointments.filter(apt => apt.status === 'pending'),
      confirmed: appointments.filter(apt => apt.status === 'confirmed'),
      booked: appointments.filter(apt => apt.status === 'booked'),
      completed: appointments.filter(apt => apt.status === 'completed'),
      cancelled: appointments.filter(apt => apt.status === 'cancelled'),
      rejected: appointments.filter(apt => apt.status === 'rejected')
    };

    // Statistics for the user
    const stats = {
      total: appointments.length,
      pending: groupedAppointments.pending.length,
      confirmed: groupedAppointments.confirmed.length,
      booked: groupedAppointments.booked.length,
      completed: groupedAppointments.completed.length,
      cancelled: groupedAppointments.cancelled.length,
      rejected: groupedAppointments.rejected.length,
      upcoming: appointments.filter(apt => 
        new Date(apt.date) > new Date() && 
        ['confirmed', 'booked', 'pending'].includes(apt.status)
      ).length
    };

    res.json({
      success: true,
      data: {
        appointments,
        grouped: groupedAppointments,
        stats
      },
      userInfo: {
        id: userId,
        role: userRole,
        name: req.user.name,
        email: req.user.email
      },
      message: `Retrieved ${appointments.length} appointments for ${userRole}`
    });

  } catch (error) {
    console.error('=== ERROR FETCHING USER APPOINTMENTS ===');
    console.error('Error details:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user appointments',
      error: error.message,
      debug: process.env.NODE_ENV === 'development' ? {
        userId: req.user?.id,
        userRole: req.user?.role,
        errorStack: error.stack
      } : undefined
    });
  }
};

// Get upcoming appointments for current user
const getCurrentUserUpcomingAppointments = async (req, res) => {
  try {
    console.log('=== GET CURRENT USER UPCOMING APPOINTMENTS ===');
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filter = {
      date: { $gte: today },
      status: { $in: ['confirmed', 'booked', 'pending'] }
    };

    // Add role-specific filters
    if (userRole === 'teacher') {
      filter.teacherId = userId;
    } else if (userRole === 'student') {
      const userEmail = req.user.email?.toLowerCase();
      const userName = req.user.name;
      filter.$or = [
        { 'student.email': userEmail },
        { 'student.name': { $regex: new RegExp(userName, 'i') } }
      ];
    }
    // For admin, no additional filter needed (they see all)

    const upcomingAppointments = await Appointment.find(filter)
      .populate('teacherId', 'name email phone subject department')
      .sort({ date: 1, time: 1 })
      .limit(10); // Limit to next 10 appointments

    res.json({
      success: true,
      data: upcomingAppointments,
      count: upcomingAppointments.length,
      userRole,
      message: `Retrieved ${upcomingAppointments.length} upcoming appointments`
    });

  } catch (error) {
    console.error('Error fetching upcoming appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming appointments',
      error: error.message
    });
  }
};

// Get appointment history for current user
const getCurrentUserAppointmentHistory = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User authentication required'
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 20, page = 1 } = req.query;
    
    let filter = {
      status: { $in: ['completed', 'cancelled', 'rejected'] }
    };

    // Add role-specific filters
    if (userRole === 'teacher') {
      filter.teacherId = userId;
    } else if (userRole === 'student') {
      const userEmail = req.user.email?.toLowerCase();
      const userName = req.user.name;
      filter.$or = [
        { 'student.email': userEmail },
        { 'student.name': { $regex: new RegExp(userName, 'i') } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [appointments, totalCount] = await Promise.all([
      Appointment.find(filter)
        .populate('teacherId', 'name email phone subject department')
        .sort({ date: -1, updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Appointment.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + appointments.length < totalCount,
        hasPrev: parseInt(page) > 1
      },
      message: `Retrieved appointment history for ${userRole}`
    });

  } catch (error) {
    console.error('Error fetching appointment history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment history',
      error: error.message
    });
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  requestAppointment,          // Student requests appointment
  teacherBookAppointment,      // Teacher books directly
  acceptAppointmentRequest,    // Teacher accepts request
  rejectAppointmentRequest,    // Teacher rejects request
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  getTeacherPendingRequests,   // Get pending requests for teacher
  getTeacherAppointments,
  getAppointmentStats,
  // Legacy method for backward compatibility
  bookAppointment: requestAppointment,
  getCurrentUserAppointments,
  getCurrentUserUpcomingAppointments,
  getCurrentUserAppointmentHistory
};