const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Teacher = require('../models/Teacher');

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

const acceptAppointmentRequest = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      const { responseMessage } = req.body;
      
      console.log('=== ACCEPT APPOINTMENT REQUEST ===');
      console.log('Appointment ID:', id);
      console.log('Response Message:', responseMessage);
      console.log('Request User:', req.user);
      
      // 1. Validate appointment ID format
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment ID format'
        });
      }
      
      // 2. Find the appointment
      console.log('🔍 Searching for appointment with ID:', id);
      const appointment = await Appointment.findById(id).session(session);
      
      if (!appointment) {
        console.error('❌ Appointment not found in database');
        return res.status(404).json({
          success: false,
          message: 'Appointment request not found or already processed'
        });
      }
      
      console.log('✅ Appointment found:', {
        id: appointment._id,
        status: appointment.status,
        createdBy: appointment.createdBy,
        teacherId: appointment.teacherId
      });
      
      // 3. Validate appointment state
      if (appointment.status !== 'pending') {
        console.error('❌ Appointment status is not pending:', appointment.status);
        return res.status(400).json({
          success: false,
          message: `Cannot accept appointment with status '${appointment.status}'. Only pending appointments can be accepted.`
        });
      }
      
      if (appointment.createdBy !== 'student') {
        console.error('❌ Appointment not created by student:', appointment.createdBy);
        return res.status(400).json({
          success: false,
          message: 'Only student requests can be accepted'
        });
      }
      
      // 4. Validate teacher authorization (if user info is available)
      const teacherId = req.user?.id || req.user?._id;
      console.log('🔒 Authorization check - Teacher ID from auth:', teacherId);
      console.log('🔒 Authorization check - Appointment teacher ID:', appointment.teacherId);
      
      if (teacherId && appointment.teacherId.toString() !== teacherId.toString()) {
        console.error('❌ Teacher authorization failed');
        return res.status(403).json({
          success: false,
          message: 'You can only accept appointments assigned to you'
        });
      }
      
      // 5. Update appointment status
      console.log('💾 Updating appointment status to confirmed...');
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: 'confirmed',
          'teacherResponse.respondedAt': new Date(),
          'teacherResponse.responseMessage': responseMessage?.trim() || 'Request accepted by teacher',
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true,
          session
        }
      );
      
      if (!updatedAppointment) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update appointment status'
        });
      }
      
      console.log('✅ Appointment updated successfully');
      
      // 6. Populate teacher details for response
      await updatedAppointment.populate('teacherId', 'name email phone subject');
      
      console.log('✅ APPOINTMENT ACCEPTED SUCCESSFULLY');
      
      // 7. Send success response
      return res.status(200).json({
        success: true,
        data: updatedAppointment,
        message: 'Appointment request accepted successfully'
      });
    });
    
  } catch (error) {
    console.error('=== ERROR IN ACCEPT APPOINTMENT ===');
    console.error('Error details:', error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    // Generic error response
    return res.status(500).json({
      success: false,
      message: 'Failed to accept appointment request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    await session.endSession();
  }
};

// FIXED: Enhanced rejectAppointmentRequest with comprehensive error handling
const rejectAppointmentRequest = async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      const { responseMessage } = req.body;
      
      console.log('=== REJECT APPOINTMENT REQUEST ===');
      console.log('Appointment ID:', id);
      console.log('Response Message:', responseMessage);
      
      // 1. Validate appointment ID format
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid appointment ID format'
        });
      }
      
      // 2. Find the appointment
      console.log('🔍 Searching for appointment with ID:', id);
      const appointment = await Appointment.findById(id).session(session);
      
      if (!appointment) {
        console.error('❌ Appointment not found in database');
        return res.status(404).json({
          success: false,
          message: 'Appointment request not found or already processed'
        });
      }
      
      // 3. Validate appointment state
      if (appointment.status !== 'pending') {
        console.error('❌ Appointment status is not pending:', appointment.status);
        return res.status(400).json({
          success: false,
          message: `Cannot reject appointment with status '${appointment.status}'. Only pending appointments can be rejected.`
        });
      }
      
      if (appointment.createdBy !== 'student') {
        console.error('❌ Appointment not created by student:', appointment.createdBy);
        return res.status(400).json({
          success: false,
          message: 'Only student requests can be rejected'
        });
      }
      
      // 4. Validate teacher authorization (if user info is available)
      const teacherId = req.user?.id || req.user?._id;
      if (teacherId && appointment.teacherId.toString() !== teacherId.toString()) {
        console.error('❌ Teacher authorization failed');
        return res.status(403).json({
          success: false,
          message: 'You can only reject appointments assigned to you'
        });
      }
      
      // 5. Update appointment status
      console.log('💾 Updating appointment status to rejected...');
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          status: 'rejected',
          'teacherResponse.respondedAt': new Date(),
          'teacherResponse.responseMessage': responseMessage?.trim() || 'Request rejected by teacher',
          updatedAt: new Date()
        },
        {
          new: true,
          runValidators: true,
          session
        }
      );
      
      if (!updatedAppointment) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update appointment status'
        });
      }
      
      // 6. Populate teacher details
      await updatedAppointment.populate('teacherId', 'name email phone subject');
      
      console.log('✅ APPOINTMENT REJECTED SUCCESSFULLY');
      
      return res.status(200).json({
        success: true,
        data: updatedAppointment,
        message: 'Appointment request rejected successfully'
      });
    });
    
  } catch (error) {
    console.error('=== ERROR IN REJECT APPOINTMENT ===');
    console.error('Error details:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID format'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to reject appointment request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  } finally {
    await session.endSession();
  }
};

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

// Additional helper function to validate appointment ownership
const validateAppointmentOwnership = async (appointmentId, userId, requiredStatus = 'pending') => {
  try {
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return { success: false, error: 'Appointment not found' };
    }
    
    if (appointment.status !== requiredStatus) {
      return { 
        success: false, 
        error: `Appointment status is '${appointment.status}', expected '${requiredStatus}'` 
      };
    }
    
    if (userId && appointment.teacherId.toString() !== userId.toString()) {
      return { 
        success: false, 
        error: 'You do not have permission to modify this appointment' 
      };
    }
    
    return { success: true, appointment };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  requestAppointment,          // Student requests appointment
  teacherBookAppointment,      // Teacher books directly
  acceptAppointmentRequest,    // Teacher accepts request - FIXED
  rejectAppointmentRequest,    // Teacher rejects request - FIXED
  validateAppointmentOwnership,
  updateAppointment,
  cancelAppointment,
  completeAppointment,
  getTeacherPendingRequests,   // Get pending requests for teacher
  getTeacherAppointments,
  getAppointmentStats,
  // Legacy method for backward compatibility
  bookAppointment: requestAppointment
};