const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Reference User model for teachers
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required'],
    validate: {
      validator: function(v) {
        return mongoose.Types.ObjectId.isValid(v);
      },
      message: 'Invalid teacher ID format'
    }
  },
  teacherName: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true
  },
  student: {
    name: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
      minlength: [2, 'Student name must be at least 2 characters'],
      maxlength: [100, 'Student name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Student email is required'],
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^[\+]?[\d\s\-\(\)]{7,20}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    subject: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    }
  },
  day: {
    type: String,
    required: [true, 'Day is required'],
    enum: {
      values: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      message: 'Day must be a valid day of the week'
    }
  },
  time: {
    type: String,
    required: [true, 'Time is required'],
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
    required: [true, 'Date is required'],
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: 'Please provide a valid date'
    }
  },
  appointmentDate: {
    type: String,
    required: true
  },
  // Status field to handle different workflows
  status: {
    type: String,
    enum: {
      values: [
        'pending',        // User requested, waiting for teacher response
        'confirmed',      // Teacher accepted/confirmed the appointment
        'rejected',       // Teacher rejected the request
        'cancelled',      // Cancelled by either party
        'completed',      // Appointment completed
        'booked'          // Direct booking by teacher (no approval needed)
      ],
      message: 'Status must be one of: pending, confirmed, rejected, cancelled, completed, booked'
    },
    default: 'pending'
  },
  // Track who created the appointment
  createdBy: {
    type: String,
    enum: {
      values: ['student', 'teacher'],
      message: 'CreatedBy must be either student or teacher'
    },
    required: [true, 'CreatedBy is required'],
    default: 'student'
  },
  // Fields for teacher responses
  teacherResponse: {
    respondedAt: {
      type: Date
    },
    responseMessage: {
      type: String,
      trim: true,
      maxlength: [500, 'Response message cannot exceed 500 characters']
    }
  },
  // Cancellation tracking
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
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    }
  },
  // Completion tracking
  completedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
appointmentSchema.index({ 'student.email': 1 });
appointmentSchema.index({ createdAt: -1 });

// Compound index for conflict checking
appointmentSchema.index({ 
  teacherId: 1, 
  date: 1, 
  time: 1, 
  status: 1 
});

// Pre-save middleware to update timestamps
appointmentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Auto-generate appointmentDate if not provided
  if (!this.appointmentDate && this.date) {
    this.appointmentDate = this.date.toISOString();
  }
  
  next();
});

// Pre-validate middleware for additional checks
appointmentSchema.pre('validate', function(next) {
  // Validate date is not in the past (only for new appointments)
  if (this.isNew && this.date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const appointmentDate = new Date(this.date);
    appointmentDate.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      const error = new Error('Appointment date cannot be in the past');
      error.path = 'date';
      return next(error);
    }
  }
  
  next();
});

// Instance methods
appointmentSchema.methods.acceptRequest = function(responseMessage = '') {
  if (this.status !== 'pending') {
    throw new Error('Only pending appointments can be accepted');
  }
  
  this.status = 'confirmed';
  this.teacherResponse.respondedAt = new Date();
  this.teacherResponse.responseMessage = responseMessage || 'Request accepted';
  this.updatedAt = new Date();
  
  return this.save();
};

appointmentSchema.methods.rejectRequest = function(responseMessage = '') {
  if (this.status !== 'pending') {
    throw new Error('Only pending appointments can be rejected');
  }
  
  this.status = 'rejected';
  this.teacherResponse.respondedAt = new Date();
  this.teacherResponse.responseMessage = responseMessage || 'Request rejected';
  this.updatedAt = new Date();
  
  return this.save();
};

appointmentSchema.methods.cancelAppointment = function(cancelledBy, reason = '') {
  if (['cancelled', 'completed'].includes(this.status)) {
    throw new Error('Cannot cancel completed or already cancelled appointments');
  }
  
  this.status = 'cancelled';
  this.cancellation = {
    cancelledBy: cancelledBy,
    cancelledAt: new Date(),
    cancellationReason: reason || 'No reason provided'
  };
  this.updatedAt = new Date();
  
  return this.save();
};

appointmentSchema.methods.completeAppointment = function() {
  if (!['confirmed', 'booked'].includes(this.status)) {
    throw new Error('Only confirmed or booked appointments can be completed');
  }
  
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

appointmentSchema.statics.getTeacherStats = async function(teacherId) {
  const stats = await Promise.all([
    this.countDocuments({ teacherId, status: 'pending' }),
    this.countDocuments({ teacherId, status: 'confirmed' }),
    this.countDocuments({ teacherId, status: 'booked' }),
    this.countDocuments({ teacherId, status: 'completed' }),
    this.countDocuments({ teacherId, status: 'cancelled' }),
    this.countDocuments({ teacherId, status: 'rejected' })
  ]);
  
  const [pending, confirmed, booked, completed, cancelled, rejected] = stats;
  
  return {
    pending,
    confirmed,
    booked,
    completed,
    cancelled,
    rejected,
    total: pending + confirmed + booked + completed + cancelled + rejected
  };
};

// Static method to get appointments by date range
appointmentSchema.statics.findByDateRange = function(startDate, endDate, teacherId = null) {
  const query = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  if (teacherId) query.teacherId = teacherId;
  
  return this.find(query).sort({ date: 1, time: 1 });
};

// Static method for searching appointments
appointmentSchema.statics.searchAppointments = function(searchTerm, teacherId = null) {
  const searchRegex = new RegExp(searchTerm, 'i');
  
  const query = {
    $or: [
      { 'student.name': searchRegex },
      { 'student.email': searchRegex },
      { 'student.subject': searchRegex },
      { teacherName: searchRegex }
    ]
  };
  
  if (teacherId) query.teacherId = teacherId;
  
  return this.find(query).sort({ createdAt: -1 });
};

// Virtual for formatted date
appointmentSchema.virtual('formattedDate').get(function() {
  if (!this.date) return '';
  
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for appointment duration
appointmentSchema.virtual('duration').get(function() {
  if (this.time && this.time.includes(' - ')) {
    const [start, end] = this.time.split(' - ');
    return `${start} to ${end}`;
  }
  return '1 hour'; // Default assumption
});

// Virtual to check if appointment is in the past
appointmentSchema.virtual('isPast').get(function() {
  if (!this.date) return false;
  const now = new Date();
  return this.date < now;
});

// Virtual to check if appointment is today
appointmentSchema.virtual('isToday').get(function() {
  if (!this.date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(0, 0, 0, 0);
  
  return appointmentDate.getTime() === today.getTime();
});

// Virtual to check if appointment is upcoming (within next 7 days)
appointmentSchema.virtual('isUpcoming').get(function() {
  if (!this.date) return false;
  
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);
  
  return this.date >= now && this.date <= sevenDaysFromNow && 
         ['confirmed', 'booked'].includes(this.status);
});

// Virtual for status display
appointmentSchema.virtual('statusDisplay').get(function() {
  const statusMap = {
    'pending': 'Pending Approval',
    'confirmed': 'Confirmed',
    'rejected': 'Rejected',
    'cancelled': 'Cancelled',
    'completed': 'Completed',
    'booked': 'Booked'
  };
  
  return statusMap[this.status] || this.status;
});

// Virtual for contact info
appointmentSchema.virtual('studentContact').get(function() {
  const contact = [];
  if (this.student.email) contact.push(this.student.email);
  if (this.student.phone) contact.push(this.student.phone);
  return contact.join(' | ');
});

// Ensure virtuals are included when converting to JSON
appointmentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields if needed
    delete ret.__v;
    return ret;
  }
});

appointmentSchema.set('toObject', { virtuals: true });

// Error handling middleware
appointmentSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const duplicateError = new Error(`Duplicate value for ${field}`);
    duplicateError.statusCode = 400;
    next(duplicateError);
  } else {
    next(error);
  }
});

// Prevent duplicate model compilation
let Appointment;
try {
  Appointment = mongoose.model('Appointment');
} catch (error) {
  Appointment = mongoose.model('Appointment', appointmentSchema);
}

module.exports = Appointment;