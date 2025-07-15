const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Teacher = require('../models/Teacher');

// =============================================================================
// STUDENT PERSPECTIVE CONTROLLERS
// =============================================================================

// Book appointment (Student perspective)
const bookAppointmentStudent = async (req, res) => {
  try {
    console.log('Student booking appointment with data:', req.body);
    
    const { teacherId, day, time, date, student, studentPerspective } = req.body;
    
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
    
    // Check if slot is already booked
    const existingAppointment = await Appointment.findOne({
      teacherId,
      day,
      time,
      date: new Date(date),
      status: { $nin: ['cancelled', 'rejected'] }
    });
    
    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is already booked'
      });
    }
    
    // Create appointment with student perspective
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
      time,
      date: new Date(date),
      appointmentDate: new Date(date).toISOString(),
      status: 'pending',
      studentPerspective: {
        requestedAt: new Date(),
        priority: studentPerspective?.priority || 'medium',
        preferredMode: studentPerspective?.preferredMode || 'online',
        expectedDuration: studentPerspective?.expectedDuration || 60,
        studentNotes: studentPerspective?.studentNotes || '',
        isFlexible: studentPerspective?.isFlexible || false
      },
      communications: [{
        from: 'student',
        message: `New appointment request: ${student.message || 'No additional message'}`,
        messageType: 'inquiry'
      }]
    };
    
    const appointment = new Appointment(appointmentData);
    await appointment.save();
    
    // Populate teacher details for response
    await appointment.populate('teacherId', 'name email phone subject');
    
    res.status(201).json({
      success: true,
      data: appointment.getStudentView(),
      message: 'Appointment request sent successfully. Waiting for teacher approval.'
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

// Get student appointments
const getStudentAppointments = async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Student email is required'
      });
    }
    
    const appointments = await Appointment.getByStudentEmail(email);
    
    // Return student view of appointments
    const studentViewAppointments = appointments.map(apt => apt.getStudentView());
    
    res.json({
      success: true,
      data: studentViewAppointments,
      count: studentViewAppointments.length
    });
    
  } catch (error) {
    console.error('Error fetching student appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student appointments',
      error: error.message
    });
  }
};

// Add student message to appointment
const addStudentMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType } = req.body;
    
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
    
    await appointment.addStudentMessage(message, messageType || 'inquiry');
    
    res.json({
      success: true,
      data: appointment.getStudentView(),
      message: 'Message added successfully'
    });
    
  } catch (error) {
    console.error('Error adding student message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// =============================================================================
// TEACHER PERSPECTIVE CONTROLLERS
// =============================================================================

// Get teacher appointments with approval status
const getTeacherAppointments = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { filter } = req.query; // pending, approved, all
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }
    
    let query = { teacherId };
    
    // Apply filters
    if (filter === 'pending') {
      query['teacherApproval.teacherResponse'] = 'pending';
    } else if (filter === 'approved') {
      query['teacherApproval.approved'] = true;
    } else if (filter === 'rejected') {
      query['teacherApproval.teacherResponse'] = 'rejected';
    }
    
    const appointments = await Appointment.find(query)
      .populate('teacherId', 'name email phone subject')
      .sort({ date: 1 });
    
    // Return teacher view of appointments
    const teacherViewAppointments = appointments.map(apt => apt.getTeacherView());
    
    res.json({
      success: true,
      data: teacherViewAppointments,
      count: teacherViewAppointments.length,
      filter: filter || 'all'
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

// Get pending approvals for teacher
const getPendingApprovals = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID'
      });
    }
    
    const pendingAppointments = await Appointment.getPendingApprovals(teacherId);
    const teacherViewAppointments = pendingAppointments.map(apt => apt.getTeacherView());
    
    res.json({
      success: true,
      data: teacherViewAppointments,
      count: teacherViewAppointments.length
    });
    
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending approvals',
      error: error.message
    });
  }
};

// Teacher approve appointment
const approveAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherNotes, teacherPerspective } = req.body;
    
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
    
    // Update teacher perspective if provided
    if (teacherPerspective) {
      appointment.teacherPerspective = {
        ...appointment.teacherPerspective,
        ...teacherPerspective
      };
    }
    
    await appointment.approveByTeacher(teacherNotes || '');
    
    res.json({
      success: true,
      data: appointment.getTeacherView(),
      message: 'Appointment approved successfully'
    });
    
  } catch (error) {
    console.error('Error approving appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve appointment',
      error: error.message
    });
  }
};

// Teacher reject appointment
const rejectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, suggestedAlternatives } = req.body;
    
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
    
    // Add suggested alternatives if provided
    if (suggestedAlternatives && suggestedAlternatives.length > 0) {
      await appointment.suggestAlternatives(suggestedAlternatives, reason);
    }
    
    await appointment.rejectByTeacher(reason || '');
    
    res.json({
      success: true,
      data: appointment.getTeacherView(),
      message: 'Appointment rejected successfully'
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

// Add teacher message to appointment
const addTeacherMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, messageType } = req.body;
    
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
    
    await appointment.addTeacherMessage(message, messageType || 'inquiry');
    
    res.json({
      success: true,
      data: appointment.getTeacherView(),
      message: 'Message added successfully'
    });
    
  } catch (error) {
    console.error('Error adding teacher message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// =============================================================================
// COMMON CONTROLLERS (Both Student and Teacher)
// =============================================================================

// Get all appointments (Admin view)
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('teacherId', 'name email phone subject')
      .sort({ createdAt: -1 });
    
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
    const { viewAs } = req.query; // 'student' or 'teacher'
    
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
    
    let appointmentData;
    if (viewAs === 'student') {
      appointmentData = appointment.getStudentView();
    } else if (viewAs === 'teacher') {
      appointmentData = appointment.getTeacherView();
    } else {
      appointmentData = appointment; // Full view for admin
    }
    
    res.json({
      success: true,
      data: appointmentData
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

// Update appointment (General)
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid appointment ID'
      });
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
    const { reason, cancelledBy } = req.body;
    
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
    
    // Add cancellation message
    const cancellationMessage = `Appointment cancelled by ${cancelledBy || 'user'}. ${reason ? 'Reason: ' + reason : ''}`;
    
    if (cancelledBy === 'teacher') {
      await appointment.addTeacherMessage(cancellationMessage, 'cancellation');
    } else {
      await appointment.addStudentMessage(cancellationMessage, 'cancellation');
    }
    
    appointment.status = 'cancelled';
    await appointment.save();
    
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

// Get appointment statistics
const getAppointmentStats = async (req, res) => {
  try {
    const { teacherId } = req.query;
    
    let matchQuery = {};
    if (teacherId) {
      matchQuery.teacherId = new mongoose.Types.ObjectId(teacherId);
    }
    
    const stats = await Appointment.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          approved: { $sum: { $cond: ['$teacherApproval.approved', 1, 0] } },
          awaitingApproval: { $sum: { $cond: [{ $eq: ['$teacherApproval.teacherResponse', 'pending'] }, 1, 0] } }
        }
      }
    ]);
    
    const result = stats[0] || {
      total: 0, pending: 0, confirmed: 0, cancelled: 0, 
      completed: 0, rejected: 0, approved: 0, awaitingApproval: 0
    };
    
    res.json({
      success: true,
      data: result
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

module.exports = {
  // Student perspective
  bookAppointmentStudent,
  getStudentAppointments,
  addStudentMessage,
  
  // Teacher perspective
  getTeacherAppointments,
  getPendingApprovals,
  approveAppointment,
  rejectAppointment,
  addTeacherMessage,
  
  // Common
  getAllAppointments,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAppointmentStats
};