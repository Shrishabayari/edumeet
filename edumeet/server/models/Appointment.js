const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
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
  // Fields for cancellation tracking
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

// Pre-save middleware to update timestamps
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Instance methods
appointmentSchema.methods.acceptRequest = function(responseMessage = '') {
  this.status = 'confirmed';
  this.teacherResponse.respondedAt = new Date();
  this.teacherResponse.responseMessage = responseMessage;
  return this.save();
};

appointmentSchema.methods.rejectRequest = function(responseMessage = '') {
  this.status = 'rejected';
  this.teacherResponse.respondedAt = new Date();
  this.teacherResponse.responseMessage = responseMessage;
  return this.save();
};

appointmentSchema.methods.cancelAppointment = function(cancelledBy, reason = '') {
  this.status = 'cancelled';
  this.cancellation.cancelledBy = cancelledBy;
  this.cancellation.cancelledAt = new Date();
  this.cancellation.cancellationReason = reason;
  return this.save();
};

appointmentSchema.methods.completeAppointment = function() {
  this.status = 'completed';
  return this.save();
};

// Static methods
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

appointmentSchema.statics.checkTimeSlotAvailability = function(teacherId, date, time) {
  return this.findOne({
    teacherId,
    date: new Date(date),
    time,
    status: { $in: ['confirmed', 'booked', 'pending'] }
  });
};

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;