const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// Helper function to normalize time format
const normalizeTimeFormat = (timeString) => {
  if (!timeString) return timeString;
  
  // Remove extra spaces and normalize format
  let normalized = timeString.trim();
  
  // Handle different time formats
  if (normalized.includes(' - ')) {
    // For ranges like "3:00 PM - 4:00 PM", keep the full range
    const parts = normalized.split(' - ');
    if (parts.length === 2) {
      return `${parts[0].trim()} - ${parts[1].trim()}`;
    }
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

// FIXED: Accept appointment request with comprehensive error handling
const acceptAppointmentRequest = async (req, res) => {
  console.log('\n=== ACCEPT APPOINTMENT REQUEST START ===');
  
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      const { responseMessage } = req.body;
      
      console.log('📊 Accept Request:', {
        appointmentId: id,
        userId: req.user?.id || req.user?._id,
        userRole: req.user?.role,
        responseMessage: responseMessage || 'No message provided'
      });

      // Validate appointment ID
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid appointment ID format');
      }

      // Find appointment with session
      const appointment = await Appointment.findById(id).session(session);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      console.log('✅ Appointment found:', {
        id: appointment._id,
        status: appointment.status,
        teacherId: appointment.teacherId,
        studentName: appointment.student?.name
      });

      // Validate appointment can be accepted
      if (appointment.status !== 'pending') {
        throw new Error(`Cannot accept appointment with status '${appointment.status}'. Only pending requests can be accepted.`);
      }

      if (appointment.createdBy !== 'student') {
        throw new Error('Only student requests can be accepted');
      }

      // Validate teacher authorization
      const currentUserId = req.user?.id || req.user?._id;
      if (!currentUserId) {
        throw new Error('Authentication required');
      }

      if (currentUserId.toString() !== appointment.teacherId.toString()) {
        throw new Error('You can only accept appointments assigned to you');
      }

      // Check for time slot conflicts
      const conflictCheck = await Appointment.findOne({
        teacherId: appointment.teacherId,
        date: appointment.date,
        time: appointment.time,
        status: { $in: ['confirmed', 'booked'] },
        _id: { $ne: appointment._id }
      }).session(session);

      if (conflictCheck) {
        throw new Error('Time slot conflict detected. Another appointment is already confirmed for this time.');
      }

      // Update appointment to confirmed status
      const updated = await Appointment.findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'confirmed',
            'teacherResponse.respondedAt': new Date(),
            'teacherResponse.responseMessage': responseMessage?.trim() || 'Request accepted',
            updatedAt: new Date()
          }
        },
        { new: true, runValidators: true, session }
      ).populate('teacherId', 'name email phone subject department');

      if (!updated) {
        throw new Error('Failed to update appointment');
      }

      console.log('✅ Appointment accepted successfully:', updated._id);
      
      res.status(200).json({
        success: true,
        data: updated,
        message: 'Appointment request accepted successfully'
      });
    });
    
  } catch (error) {
    console.error('❌ Accept appointment error:', error.message);

    let statusCode = 500;
    if (error.message.includes('Invalid') || error.message.includes('status') || error.message.includes('conflict')) {
      statusCode = 400;
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('assigned to you') || error.message.includes('Authentication required')) {
      statusCode = 403;
    }

    res.status(statusCode).json({
      success: false,
      message: error.message
    });

  } finally {
    await session.endSession();
    console.log('=== ACCEPT APPOINTMENT REQUEST END ===\n');
  }
};

// FIXED: Reject appointment request with comprehensive error handling
const rejectAppointmentRequest = async (req, res) => {
  console.log('\n=== REJECT APPOINTMENT REQUEST START ===');
  
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      const { responseMessage } = req.body;
      
      console.log('📊 Reject Request Details:', {
        appointmentId: id,
        responseMessage: responseMessage || 'No message provided',
        userId: req.user?.id || req.user?._id,
        userRole: req.user?.role,
        userName: req.user?.name
      });

      // Validate appointment ID
      if (!id) {
        throw new Error('Appointment ID is required');
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid appointment ID format');
      }

      // Find appointment with session
      const appointment = await Appointment.findById(id).session(session);
      
      if (!appointment) {
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

      // Validate appointment can be rejected
      if (appointment.status !== 'pending') {
        throw new Error(`Cannot reject appointment with status '${appointment.status}'. Only pending requests can be rejected.`);
      }

      if (appointment.createdBy !== 'student') {
        throw new Error('Only student requests can be rejected');
      }

      // Validate teacher authorization
      const currentUserId = req.user?.id || req.user?._id;
      if (!currentUserId) {
        throw new Error('Authentication required');
      }

      console.log('🔒 Authorization check:', {
        currentUserId: currentUserId.toString(),
        appointmentTeacherId: appointment.teacherId.toString(),
        match: currentUserId.toString() === appointment.teacherId.toString()
      });

      if (currentUserId.toString() !== appointment.teacherId.toString()) {
        throw new Error('You can only reject appointments assigned to you');
      }

      console.log('✅ Authorization passed');

      // Update appointment status to rejected
      const updatedAppointment = await Appointment.findByIdAndUpdate(
        id,
        {
          $set: {
            status: 'rejected',
            'teacherResponse.respondedAt': new Date(),
            'teacherResponse.responseMessage': responseMessage?.trim() || 'Request rejected',
            updatedAt: new Date()
          }
        },
        {
          new: true,
          runValidators: true,
          session: session
        }
      ).populate('teacherId', 'name email phone subject department');

      if (!updatedAppointment) {
        throw new Error('Failed to update appointment - appointment may have been deleted');
      }

      console.log('✅ Appointment rejected successfully:', {
        id: updatedAppointment._id,
        status: updatedAppointment.status,
        respondedAt: updatedAppointment.teacherResponse?.respondedAt
      });

      res.status(200).json({
        success: true,
        data: updatedAppointment,
        message: 'Appointment request rejected successfully'
      });
    });

  } catch (error) {
    console.error('\n❌ REJECT APPOINTMENT ERROR:', {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle specific error types
    let statusCode = 500;
    let errorMessage = error.message || 'Internal server error';

    if (error.name === 'CastError') {
      statusCode = 400;
      errorMessage = 'Invalid appointment ID format';
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      errorMessage = 'Validation failed: ' + Object.values(error.errors).map(err => err.message).join(', ');
    } else if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('assigned to you') || error.message.includes('Authentication required')) {
      statusCode = 403;
    } else if (error.message.includes('status') || error.message.includes('pending') || error.message.includes('Invalid')) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          appointmentId: req.params.id,
          userId: req.user?.id || req.user?._id,
          errorType: error.name,
          timestamp: new Date().toISOString()
        }
      })
    });

  } finally {
    await session.endSession();
    console.log('=== REJECT APPOINTMENT REQUEST END ===\n');
  }
};

// Get all appointments (with filtering options)
const getAllAppointments = async (req, res) => {
  try {
    console.log('Fetching all appointments with filters:', req.query);
    
    const { status, createdBy, teacherId, page = 1, limit = 10 } = req.query;
    const filter = {};
    
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      filter.teacherId = teacherId;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const appointments = await Appointment.find(filter)
      .populate('teacherId', 'name email phone subject department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Appointment.countDocuments(filter);
    
    console.log(`Found ${appointments.length} appointments`);
    
    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
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
      .populate('teacherId', 'name email phone subject department');
    
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
    
    // Validate teacherId format
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }
    
    // Find teacher in User model with role 'teacher'
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found or invalid role'
      });
    }
    
    // Normalize time format
    const normalizedTime = normalizeTimeFormat(time);
    console.log('Normalized time:', normalizedTime);
    
    // Check if slot is already booked or has pending request
    const conflictingAppointment = await Appointment.findOne({
      teacherId, 
      date: new Date(date),
      time: normalizedTime,
      status: { $in: ['pending', 'confirmed', 'booked'] }
    });
    
    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked or has a pending request',
        conflictingAppointment: {
          id: conflictingAppointment._id,
          status: conflictingAppointment.status,
          studentName: conflictingAppointment.student.name
        }
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
    await appointment.populate('teacherId', 'name email phone subject department');
    
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
      return res.status(403).json({
        success: false,
        message: 'Only authenticated teachers can book appointments'
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
        message: 'This time slot is already booked',
        conflictingAppointment: {
          id: conflictingAppointment._id,
          status: conflictingAppointment.status,
          studentName: conflictingAppointment.student.name
        }
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
    
    await appointment.populate('teacherId', 'name email phone subject department');
    
    console.log('Appointment booked directly by teacher:', appointment._id);
    
    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment booked successfully'
    });
    
  } catch (error) {
    console.error('Error booking appointment:', error);
    
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
    
    // Check if appointment exists and user has permission to update
    const existingAppointment = await Appointment.findById(id);
    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Check permissions - only teacher who owns the appointment can update
    const currentUserId = req.user?.id || req.user?._id;
    if (req.user?.role !== 'admin' && currentUserId.toString() !== existingAppointment.teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own appointments'
      });
    }
    
    // Normalize time if it's being updated
    if (updates.time) {
      updates.time = normalizeTimeFormat(updates.time);
    }
    
    // Add updatedAt timestamp
    updates.updatedAt = new Date();
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates._id;
    delete updates.teacherId;
    delete updates.createdAt;
    
    const appointment = await Appointment.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).populate('teacherId', 'name email phone subject department');
    
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
    const cancelledBy = req.user?.role || 'user';
    
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
    
    // Check permissions
    const currentUserId = req.user?.id || req.user?._id;
    const isTeacher = req.user?.role === 'teacher' && currentUserId.toString() === appointment.teacherId.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own appointments'
      });
    }
    
    if (['cancelled', 'completed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed or already cancelled appointments'
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
    await appointment.populate('teacherId', 'name email phone subject department');
    
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
    
    // Check if user has permission to view these requests
    const currentUserId = req.user?.id || req.user?._id;
    if (req.user?.role !== 'admin' && currentUserId.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own pending requests'
      });
    }
    
    // Find pending requests for the teacher
    const pendingRequests = await Appointment.find({ 
      teacherId: teacherId,
      status: 'pending',
      createdBy: 'student'
    })
    .populate('teacherId', 'name email phone subject department')
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
    const { status, createdBy, page = 1, limit = 10 } = req.query;
    
    console.log('🔍 Getting appointments for teacher:', teacherId, 'with filters:', { status, createdBy });
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }
    
    // Check permissions
    const currentUserId = req.user?.id || req.user?._id;
    if (req.user?.role !== 'admin' && currentUserId.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own appointments'
      });
    }
    
    const filter = { teacherId };
    if (status) filter.status = status;
    if (createdBy) filter.createdBy = createdBy;
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const appointments = await Appointment.find(filter)
      .populate('teacherId', 'name email phone subject department')
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Appointment.countDocuments(filter);
    
    console.log(`✅ Found ${appointments.length} appointments`);
    
    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
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
    
    // Verify teacher ownership
    const currentUserId = req.user?.id || req.user?._id;
    if (req.user?.role !== 'admin' && currentUserId.toString() !== appointment.teacherId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only complete your own appointments'
      });
    }
    
    // Update to completed status
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    appointment.updatedAt = new Date();
    
    await appointment.save();
    await appointment.populate('teacherId', 'name email phone subject department');
    
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
    console.log('📊 Fetching appointment statistics...');
    
    const { teacherId } = req.query;
    const filter = {};
    
    // If teacherId is provided, filter stats for that teacher
    if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
      filter.teacherId = teacherId;
      
      // Check permissions for teacher-specific stats
      const currentUserId = req.user?.id || req.user?._id;
      if (req.user?.role !== 'admin' && currentUserId.toString() !== teacherId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own statistics'
        });
      }
    }
    
    const totalAppointments = await Appointment.countDocuments(filter);
    const pendingRequests = await Appointment.countDocuments({ 
      ...filter,
      status: 'pending', 
      createdBy: 'student' 
    });
    const confirmedAppointments = await Appointment.countDocuments({ 
      ...filter,
      status: 'confirmed' 
    });
    const directBookings = await Appointment.countDocuments({ 
      ...filter,
      status: 'booked', 
      createdBy: 'teacher' 
    });
    const rejectedRequests = await Appointment.countDocuments({ 
      ...filter,
      status: 'rejected' 
    });
    const cancelledAppointments = await Appointment.countDocuments({ 
      ...filter,
      status: 'cancelled' 
    });
    const completedAppointments = await Appointment.countDocuments({ 
      ...filter,
      status: 'completed' 
    });
    
    // Get appointments from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentAppointments = await Appointment.countDocuments({
      ...filter,
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Get upcoming appointments (next 7 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(today.getDate() + 7);
    
    const upcomingAppointments = await Appointment.countDocuments({
      ...filter,
      date: { $gte: today, $lte: sevenDaysFromNow },
      status: { $in: ['confirmed', 'booked'] }
    });
    
    const stats = {
      total: totalAppointments,
      pendingRequests,
      confirmed: confirmedAppointments,
      directBookings,
      rejected: rejectedRequests,
      cancelled: cancelledAppointments,
      completed: completedAppointments,
      recent: recentAppointments,
      upcoming: upcomingAppointments
    };
    
    console.log('✅ Statistics fetched successfully:', stats);
    
    res.json({
      success: true,
      data: stats
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