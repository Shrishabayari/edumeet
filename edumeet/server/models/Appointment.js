const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  // Teacher Information
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  teacherName: {
    type: String,
    required: true
  },
  
  // Student Information
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
  
  // Appointment Details
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
  
  // Status Management
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'],
    default: 'pending'
  },
  
  // NEW: Teacher Approval System
  teacherApproval: {
    approved: {
      type: Boolean,
      default: false
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    },
    teacherNotes: {
      type: String,
      trim: true
    },
    teacherResponse: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending'
    }
  },
  
  // NEW: Student Perspective Fields
  studentPerspective: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    preferredMode: {
      type: String,
      enum: ['online', 'offline', 'hybrid'],
      default: 'online'
    },
    expectedDuration: {
      type: Number, // in minutes
      default: 60
    },
    studentNotes: {
      type: String,
      trim: true
    },
    isFlexible: {
      type: Boolean,
      default: false // Can student adjust time if needed?
    }
  },
  
  // NEW: Teacher Perspective Fields
  teacherPerspective: {
    availability: {
      type: String,
      enum: ['available', 'busy', 'partially_available'],
      default: 'available'
    },
    suggestedAlternatives: [{
      date: Date,
      time: String,
      reason: String
    }],
    preparationNotes: {
      type: String,
      trim: true
    },
    estimatedDuration: {
      type: Number, // in minutes
      default: 60
    },
    meetingLink: {
      type: String,
      trim: true
    },
    requirements: {
      type: String,
      trim: true
    }
  },
  
  // Communication History
  communications: [{
    from: {
      type: String,
      enum: ['student', 'teacher'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    messageType: {
      type: String,
      enum: ['approval', 'rejection', 'inquiry', 'confirmation', 'modification', 'cancellation'],
      default: 'inquiry'
    }
  }],
  
  // Additional Fields
  notes: {
    type: String,
    trim: true
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
appointmentSchema.index({ teacherId: 1, date: 1, time: 1 });
appointmentSchema.index({ 'student.email': 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ 'teacherApproval.approved': 1 });
appointmentSchema.index({ 'teacherApproval.teacherResponse': 1 });

// Pre-save middleware to update timestamps
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Methods for Student Perspective
appointmentSchema.methods.getStudentView = function() {
  return {
    _id: this._id,
    teacherName: this.teacherName,
    day: this.day,
    time: this.time,
    date: this.date,
    status: this.status,
    teacherApproval: this.teacherApproval,
    studentPerspective: this.studentPerspective,
    communications: this.communications,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Methods for Teacher Perspective
appointmentSchema.methods.getTeacherView = function() {
  return {
    _id: this._id,
    student: this.student,
    day: this.day,
    time: this.time,
    date: this.date,
    status: this.status,
    teacherApproval: this.teacherApproval,
    teacherPerspective: this.teacherPerspective,
    studentPerspective: this.studentPerspective,
    communications: this.communications,
    notes: this.notes,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Method to approve appointment
appointmentSchema.methods.approveByTeacher = function(teacherNotes = '') {
  this.teacherApproval.approved = true;
  this.teacherApproval.approvedAt = new Date();
  this.teacherApproval.teacherResponse = 'approved';
  this.teacherApproval.teacherNotes = teacherNotes;
  this.status = 'confirmed';
  
  // Add communication record
  this.communications.push({
    from: 'teacher',
    message: `Appointment approved. ${teacherNotes}`,
    messageType: 'approval'
  });
  
  return this.save();
};

// Method to reject appointment
appointmentSchema.methods.rejectByTeacher = function(reason = '') {
  this.teacherApproval.approved = false;
  this.teacherApproval.rejectedAt = new Date();
  this.teacherApproval.teacherResponse = 'rejected';
  this.teacherApproval.teacherNotes = reason;
  this.status = 'rejected';
  
  // Add communication record
  this.communications.push({
    from: 'teacher',
    message: `Appointment rejected. ${reason}`,
    messageType: 'rejection'
  });
  
  return this.save();
};

// Method to suggest alternative times
appointmentSchema.methods.suggestAlternatives = function(alternatives, message = '') {
  this.teacherPerspective.suggestedAlternatives = alternatives;
  
  // Add communication record
  this.communications.push({
    from: 'teacher',
    message: `Alternative times suggested: ${message}`,
    messageType: 'modification'
  });
  
  return this.save();
};

// Method to add student message
appointmentSchema.methods.addStudentMessage = function(message, messageType = 'inquiry') {
  this.communications.push({
    from: 'student',
    message: message,
    messageType: messageType
  });
  
  return this.save();
};

// Method to add teacher message
appointmentSchema.methods.addTeacherMessage = function(message, messageType = 'inquiry') {
  this.communications.push({
    from: 'teacher',
    message: message,
    messageType: messageType
  });
  
  return this.save();
};

// Static method to get appointments by student email
appointmentSchema.statics.getByStudentEmail = function(email) {
  return this.find({ 'student.email': email.toLowerCase() })
    .populate('teacherId', 'name email phone subject')
    .sort({ date: 1 });
};

// Static method to get pending approvals for teacher
appointmentSchema.statics.getPendingApprovals = function(teacherId) {
  return this.find({ 
    teacherId: teacherId,
    'teacherApproval.teacherResponse': 'pending'
  })
  .sort({ createdAt: 1 });
};

// Static method to get approved appointments for teacher
appointmentSchema.statics.getApprovedAppointments = function(teacherId) {
  return this.find({ 
    teacherId: teacherId,
    'teacherApproval.approved': true
  })
  .sort({ date: 1 });
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

// Virtual for appointment summary
appointmentSchema.virtual('summary').get(function() {
  return `${this.student.name} with ${this.teacherName} on ${this.day} at ${this.time}`;
});

// Ensure virtual fields are serialized
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

const Appointment = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;