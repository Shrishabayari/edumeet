const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Reference User model for teachers
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
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
    trim: true,
    maxlength: [100, 'Teacher name cannot exceed 100 characters']
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
      default: '',
      validate: {
        validator: function(v) {
          return !v || v === '' || /^[\+]?[\d\s\-\(\)]{7,20}$/.test(v);
        },
        message: 'Please provide a valid phone number'
      }
    },
    subject: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
      type: String,
      trim: true,
      default: '',
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
    required: true,
    validate: {
      validator: function(v) {
        // Should be ISO string format
        return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(v);
      },
      message: 'Appointment date must be in ISO format'
    }
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
    default: 'pending',
    index: true
  },
  // Track who created the appointment
  createdBy: {
    type: String,
    enum: {
      values: ['student', 'teacher'],
      message: 'CreatedBy must be either student or teacher'
    },
    required: [true, 'CreatedBy is required'],
    default: 'student',
    index: true
  },
  // Fields for teacher responses
  teacherResponse: {
    respondedAt: {
      type: Date,
      default: null
    },
    responseMessage: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Response message cannot exceed 500 characters']
    }
  },
  // Cancellation tracking
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    }
  },
  // Completion tracking
  completedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: '',
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound indexes for efficient querying
appointmentSchema.index({ teacherId: 1, date: 1, time: 1 });
appointmentSchema.index({ teacherId: 1, status: 1 });
appointmentSchema.index({ date: 1, status: 1 });
appointmentSchema.index({ 'student.email': 1 });

// Compound index for conflict checking - most important for performance
appointmentSchema.index({ 
  teacherId: 1, 
  date: 1, 
  time: 1, 
  status: 1 
});

// Pre-save middleware to update timestamps and validate data
appointmentSchema.pre('save', function(next) {
  // Update timestamp
  this.updatedAt = new Date();
  
  // Auto-generate appointmentDate if not provided
  if (!this.appointmentDate && this.date) {
    this.appointmentDate = this.date.toISOString();
  }
  
  // Ensure proper capitalization of day
  if (this.day) {
    this.day = this.day.charAt(0).toUpperCase() + this.day.slice(1).toLowerCase();
  }
  
  // Normalize time format
  if (this.time) {
    this.time = this.time.trim();
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
  
  // Validate status transitions
  if (!this.isNew && this.isModified('status')) {
    const validTransitions = {
      'pending': ['confirmed', 'rejected', 'cancelled'],
      'confirmed': ['completed', 'cancelled'],
      'rejected': ['cancelled'], // Allow cancellation of rejected appointments for cleanup
      'cancelled': [], // Cannot change from cancelled
      'completed': [], // Cannot change from completed
      'booked': ['completed', 'cancelled']
    };
    
    const currentStatus = this.status;
    const originalStatus = this.isModified('status') ? this.$__.original.status : currentStatus;
    
    if (originalStatus && !validTransitions[originalStatus]?.includes(currentStatus)) {
      const error = new Error(`Invalid status transition from '${originalStatus}' to '${currentStatus}'`);
      error.path = 'status';
      return next(error);
    }
  }
  
  next();
});

// Instance methods for appointment management
appointmentSchema.methods.acceptRequest = function(responseMessage = '') {
  if (this.status !== 'pending') {
    throw new Error('Only pending appointments can be accepted');
  }
  
  if (this.createdBy !== 'student') {
    throw new Error('Only student requests can be accepted');
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
  
  if (this.createdBy !== 'student') {
    throw new Error('Only student requests can be rejected');
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

appointmentSchema.methods.canBeModifiedBy = function(userId, userRole) {
  if (userRole === 'admin') {
    return true;
  }
  
  if (userRole === 'teacher' && this.teacherId.toString() === userId.toString()) {
    return true;
  }
  
  return false;
};

// Static methods for common queries
appointmentSchema.statics.findPendingForTeacher = function(teacherId) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  return this.find({
    teacherId: new mongoose.Types.ObjectId(teacherId),
    status: 'pending',
    createdBy: 'student'
  }).sort({ createdAt: -1 });
};

appointmentSchema.statics.findTeacherBookings = function(teacherId) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  return this.find({
    teacherId: new mongoose.Types.ObjectId(teacherId),
    createdBy: 'teacher'
  }).sort({ date: 1 });
};

appointmentSchema.statics.findConfirmedAppointments = function(teacherId = null) {
  const query = { status: { $in: ['confirmed', 'booked'] } };
  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
    query.teacherId = new mongoose.Types.ObjectId(teacherId);
  }
  return this.find(query).sort({ date: 1 });
};

appointmentSchema.statics.checkTimeSlotAvailability = function(teacherId, date, time) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  return this.findOne({
    teacherId: new mongoose.Types.ObjectId(teacherId),
    date: new Date(date),
    time: time,
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
  if (teacherId && mongoose.Types.ObjectId.isValid(teacherId)) {
    query.teacherId = new mongoose.Types.ObjectId(teacherId);
  }
  
  return this.find(query).sort({ date: 1, time: 1 });
};

appointmentSchema.statics.getTeacherStats = async function(teacherId) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
  
  try {
    const stats = await Promise.all([
      this.countDocuments({ teacherId: teacherObjectId, status: 'pending' }),
      this.countDocuments({ teacherId: teacherObjectId, status: 'confirmed' }),
      this.countDocuments({ teacherId: teacherObjectId, status: 'booked' }),
      this.countDocuments({ teacherId: teacherObjectId, status: 'completed' }),
      this.countDocuments({ teacherId: teacherObjectId, status: 'cancelled' }),
      this.countDocuments({ teacherId: teacherObjectId, status: 'rejected' })
    ]);
    
    const [pending, confirmed, booked, completed, cancelled, rejected] = stats;
    
    return {
      pending,
      confirmed,
      booked,
      completed,
      cancelled,
      rejected,
      total: pending + confirmed + booked + completed + cancelled + rejected,
      active: pending + confirmed + booked
    };
  } catch (error) {
    throw new Error(`Failed to get teacher stats: ${error.message}`);
  }
};

// Static method to get appointment conflicts
appointmentSchema.statics.getConflicts = function(teacherId, date, time, excludeId = null) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  const query = {
    teacherId: new mongoose.Types.ObjectId(teacherId),
    date: new Date(date),
    time: time,
    status: { $in: ['pending', 'confirmed', 'booked'] }
  };
  
  if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }
  
  return this.find(query);
};

// Virtuals for computed properties
appointmentSchema.virtual('formattedDate').get(function() {
  if (!this.date) return '';
  
  return this.date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

appointmentSchema.virtual('isPast').get(function() {
  if (!this.date) return false;
  const now = new Date();
  return this.date < now;
});

appointmentSchema.virtual('isToday').get(function() {
  if (!this.date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(0, 0, 0, 0);
  
  return appointmentDate.getTime() === today.getTime();
});

appointmentSchema.virtual('isUpcoming').get(function() {
  if (!this.date) return false;
  const now = new Date();
  return this.date >= now;
});

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

appointmentSchema.virtual('daysSinceCreated').get(function() {
  if (!this.createdAt) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

appointmentSchema.virtual('daysUntilAppointment').get(function() {
  if (!this.date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const appointmentDate = new Date(this.date);
  appointmentDate.setHours(0, 0, 0, 0);
  const diffTime = appointmentDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Ensure virtuals are included when converting to JSON
appointmentSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.id; // Remove the virtual id field to avoid confusion with _id
    return ret;
  }
});

appointmentSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

// Error handling middleware
appointmentSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    // Handle duplicate key errors
    const field = Object.keys(error.keyPattern)[0];
    const duplicateError = new Error(`Duplicate value for ${field}`);
    duplicateError.statusCode = 400;
    next(duplicateError);
  } else if (error.name === 'ValidationError') {
    // Handle validation errors
    const validationError = new Error('Validation failed');
    validationError.statusCode = 400;
    validationError.details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    next(validationError);
  } else {
    next(error);
  }
});

appointmentSchema.post('findOneAndUpdate', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const duplicateError = new Error(`Duplicate value for ${field}`);
    duplicateError.statusCode = 400;
    next(duplicateError);
  } else if (error.name === 'ValidationError') {
    const validationError = new Error('Validation failed');
    validationError.statusCode = 400;
    validationError.details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    next(validationError);
  } else {
    next(error);
  }
});

// Add text index for searching
appointmentSchema.index({
  'student.name': 'text',
  'student.email': 'text',
  'student.subject': 'text',
  'teacherName': 'text',
  'notes': 'text'
});

module.exports = mongoose.model('Appointment', appointmentSchema);