const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
// CORRECTED: Import from User model since teachers should be users with role 'teacher'
const User = require('../models/User');

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

// FIXED: Comprehensive acceptAppointmentRequest with proper error handling
const acceptAppointmentRequest = async (req, res) => {
  console.log('\n=== ACCEPT APPOINTMENT REQUEST START ===');
  
  const session = await mongoose.startSession();
  
  try {
    const result = await session.withTransaction(async () => {
      const { id } = req.params;
      const { responseMessage } = req.body;
      
      console.log('📊 Request Details:', {
        appointmentId: id,
        responseMessage: responseMessage || 'No message provided',
        userId: req.user?.id || req.user?._id,
        userRole: req.user?.role,
        userName: req.user?.name
      });

      // 1. Validate appointment ID
      if (!id) {
        throw new Error('Appointment ID is required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.error('❌ Invalid MongoDB ObjectId format:', id);
        throw new Error('Invalid appointment ID format');
      }

      // 2. Find appointment with detailed logging
      console.log('🔍 Searching for appointment...');
      const appointment = await Appointment.findById(id).session(session);
      
      if (!appointment) {
        console.error('❌ Appointment not found in database');
        
        // Debug: Check if any appointments exist for this teacher
        const teacherId = req.user?.id || req.user?._id;
        if (teacherId) {
          const teacherAppointments = await Appointment.find({ teacherId }).limit(3);
          console.log('🔍 Debug - Sample teacher appointments:', teacherAppointments.map(apt => ({
            id: apt._id,
            status: apt.status,
            studentName: apt.student?.name
          })));
        }
        
        throw new Error('Appointment not found');
      }

      console.log('✅ Appointment found:', {
        id: appointment._id,
        status: appointment.status,
        createdBy: appointment.createdBy,
        teacherId: appointment.teacherId,
        studentName: appointment.student?.name,
        date: appointment.date,
        time: appointment.time
      });

      // 3. Validate appointment can be accepted
      if (appointment.status !== 'pending') {
        console.error('❌ Invalid status for acceptance:', appointment.status);
        throw new Error(`Cannot accept appointment with status '${appointment.status}'. Only pending requests can be accepted.`);
      }

      if (appointment.createdBy !== 'student') {
        console.error('❌ Invalid creator type:', appointment.createdBy);
        throw new Error('Only student requests can be accepted');
      }

      // 4. Validate teacher authorization
      const currentUserId = req.user?.id || req.user?._id;
      if (!currentUserId) {
        console.error('❌ No user ID found in request');
        throw new Error('Authentication required');
      }

      console.log('🔒 Authorization check:', {
        currentUserId: currentUserId.toString(),
        appointmentTeacherId: appointment.teacherId.toString(),
        match: currentUserId.toString() === appointment.teacherId.toString()
      });

      if (currentUserId.toString() !== appointment.teacherId.toString()) {
        console.error('❌ Teacher authorization failed');
        throw new Error('You can only accept appointments assigned to you');
      }

      console.log('✅ Authorization passed');

      // 5. Check for scheduling conflicts (optional but recommended)
      const conflictingAppointment = await Appointment.findOne({
        teacherId: appointment.teacherId,
        date: appointment.date,
        time: appointment.time,
        status: { $in: ['confirmed', 'booked'] },
        _id: { $ne: appointment._id }
      }).session(session);

      if (conflictingAppointment) {
        console.warn('⚠️ Time slot conflict detected:', conflictingAppointment._id);
        throw new Error('This time slot has already been booked');
      }

      // 6. Update appointment using findByIdAndUpdate for atomicity
      console.log('💾 Updating appointment status...');
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'confirmed',
            'teacherResponse.respondedAt': new Date(),
            'teacherResponse.responseMessage': responseMessage?.trim() || 'Request accepted',
            updatedAt: new Date()
          }
        },
        {
          new: true,
          runValidators: true,
          session: session
        }
      );

      if (!updatedAppointment) {
        console.error('❌ Update operation failed');
        throw new Error('Failed to update appointment - appointment may have been deleted');
      }

      console.log('✅ Appointment updated successfully:', {
        id: updatedAppointment._id,
        status: updatedAppointment.status,
        respondedAt: updatedAppointment.teacherResponse?.respondedAt
      });

      // 7. Populate teacher details for response
      await updatedAppointment.populate('teacherId', 'name email phone subject department');

      return updatedAppointment;
    });

    console.log('✅ APPOINTMENT ACCEPTED SUCCESSFULLY');

    // 8. Send success response
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
    const teacherId = req.user?.id || req.user?._id; // Get from authenticated user
    
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
    
    // Find teacher (should be the authenticated user)
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or invalid role'
      });
    }
    
    // Normalize time format
    const normalizedTime = normalizeTimeFormat(time);
    
    // Check if slot is already booked
    const conflictingAppointment = await Appointment.findOne({
      teacherId, 
      date: new Date(date),
      time: normalizedTime,
      status: { $in: ['pending', 'confirmed', 'booked'] }
    });
    
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
    
    // Update appointment to cancelled status
    appointment.status = 'cancelled';
    appointment.cancellation = {
      cancelledBy: cancelledBy,
      cancelledAt: new Date(),
      cancellationReason: reason || 'No reason provided'
    };
    appointment.updatedAt = new Date();
    
    await appointment.save();
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
    const teacherId = req.user?.id || req.user?._id || req.params.teacherId;
    
    console.log('🔍 Getting pending requests for teacher:', teacherId);
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }
    
    // Find pending requests for the teacher
    const pendingRequests = await Appointment.find({ 
      teacherId: teacherId,
      status: 'pending',
      createdBy: 'student'
    })
    .populate('teacherId', 'name email phone subject')
    .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${pendingRequests.length} pending requests`);
    
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
    const teacherId = req.user?.id || req.user?._id || req.params.teacherId;
    const { status, createdBy } = req.query;
    
    console.log('🔍 Getting appointments for teacher:', teacherId, 'with filters:', { status, createdBy });
    
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
    
    console.log(`✅ Found ${appointments.length} appointments`);
    
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
    
    // Update to completed status
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    appointment.updatedAt = new Date();
    
    await appointment.save();
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
}