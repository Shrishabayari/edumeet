const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // CORRECTED: Reference User model instead of Teacher
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Changed from 'Teacher' to 'User'
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  student: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    subject: {
      type: String,
      trim: true
    },
    message: {
      type: String,
      trim: true
    }
  },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  time: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        // Allow formats like "2:00 PM", "14:00", "2:00 PM - 3:00 PM"
        return /^(\d{1,2}:\d{2}\s?(AM|PM)(\s?-\s?\d{1,2}:\d{2}\s?(AM|PM))?|\d{1,2}:\d{2}(\s?-\s?\d{1,2}:\d{2})?)$/i.test(v);
      },
      message: 'Invalid time format. Use formats like "2:00 PM" or "14:00"'
    }
  },
  date: {
    type: Date,
    required: true
  },
  appointmentDate: {
    type: String,
    required: true
  },
  // Updated status field to handle different workflows
  status: {
    type: String,
    enum: [
      'pending',        // User requested, waiting for teacher response
      'confirmed',      // Teacher accepted/confirmed the appointment
      'rejected',       // Teacher rejected the request
      'cancelled',      // Cancelled by either party
      'completed',      // Appointment completed
      'booked'          // Direct booking by teacher (no approval needed)
    ],
    default: 'pending'
  },
  // New field to track who created the appointment
  createdBy: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
    default: 'student'
  },
  // Fields for teacher responses
  teacherResponse: {
    respondedAt: {
      type: Date
    },
    responseMessage: {
      type: String,
      trim: true
    }
  },
  // FIXED: Updated cancellation field structure
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['student', 'teacher', 'admin']
    },
    cancelledAt: {
      type: Date
    },
    cancellationReason: {
      type: String,
      trim: true
    }
  },
  // ADDED: Field for completion tracking
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for efficient querying
appointmentSchema.index({ teacherId: 1, date: 1, time: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ createdBy: 1 });
appointmentSchema.index({ teacherId: 1, status: 1 });
appointmentSchema.index({ date: 1 });

// Pre-save middleware to update timestamps
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// FIXED: Instance methods with proper field updates
appointmentSchema.methods.acceptRequest = function(responseMessage = '') {
  this.status = 'confirmed';
  this.teacherResponse.respondedAt = new Date();
  this.teacherResponse.responseMessage = responseMessage;
  this.updatedAt = new Date();
  return this.save();
};

appointmentSchema.methods.rejectRequest = function(responseMessage = '') {
  this.status = 'rejected';
  this.teacherResponse.respondedAt = new Date();
  this.teacherResponse.responseMessage = responseMessage;
  this.updatedAt = new Date();
  return this.save();
};

appointmentSchema.methods.cancelAppointment = function(cancelledBy, reason = '') {
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: cancelledBy,
    cancelledAt: new Date(),
    cancellationReason: reason
  };
  this.updatedAt = new Date();
  return this.save();
};

appointmentSchema.methods.completeAppointment = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Static methods for common queries
appointmentSchema.statics.findPendingForTeacher = function(teacherId) {
  return this.find({
    teacherId,
    status: 'pending',
    createdBy: 'student'
  }).sort({ createdAt: -1 });
};

appointmentSchema.statics.findTeacherBookings = function(teacherId) {
  return this.find({
    teacherId,
    createdBy: 'teacher'
  }).sort({ date: 1 });
};

appointmentSchema.statics.findConfirmedAppointments = function(teacherId = null) {
  const query = { status: { $in: ['confirmed', 'booked'] } };
  if (teacherId) query.teacherId = teacherId;
  return this.find(query).sort({ date: 1 });
};

appointmentSchema.statics.checkTimeSlotAvailability = function(teacherId, date, time) {
  return this.findOne({
    teacherId,
    date: new Date(date),
    time,
    status: { $in: ['confirmed', 'booked', 'pending'] }
  });
};

// ADDED: Static method to get upcoming appointments
appointmentSchema.statics.findUpcomingAppointments = function(teacherId = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const query = { 
    date: { $gte: today },
    status: { $in: ['confirmed', 'booked'] }
  };
  if (teacherId) query.teacherId = teacherId;
  
  return this.find(query).sort({ date: 1, time: 1 });
};

// ADDED: Static method for appointment statistics
appointmentSchema.statics.getTeacherStats = function(teacherId) {
  return Promise.all([
    this.countDocuments({ teacherId, status: 'pending' }),
    this.countDocuments({ teacherId, status: 'confirmed' }),
    this.countDocuments({ teacherId, status: 'booked' }),
    this.countDocuments({ teacherId, status: 'completed' }),
    this.countDocuments({ teacherId, status: 'cancelled' }),
    this.countDocuments({ teacherId, status: 'rejected' })
  ]).then(([pending, confirmed, booked, completed, cancelled, rejected]) => ({
    pending,
    confirmed,
    booked,
    completed,
    cancelled,
    rejected,
    total: pending + confirmed + booked + completed + cancelled + rejected
  }));
};

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for appointment duration (if time range is provided)
appointmentSchema.virtual('duration').get(function() {
  if (this.time && this.time.includes(' - ')) {
    const [start, end] = this.time.split(' - ');
    // Simple duration calculation (could be enhanced)
    return '1 hour'; // Default assumption
  }
  return '1 hour'; // Default
});

// Virtual to check if appointment is in the past
appointmentSchema.virtual('isPast').get(function() {
  const now = new Date();
  return this.date < now;
});

// Virtual to check if appointment is today
appointmentSchema.virtual('isToday').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(0, 0, 0, 0);
  
  return appointmentDate.getTime() === today.getTime();
});

// Ensure virtuals are included when converting to JSON
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

// CORRECTED: Prevent duplicate model compilation
const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;