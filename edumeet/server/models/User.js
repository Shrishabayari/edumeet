const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
    validate: {
      validator: function(value) {
        return /^[a-zA-Z\s.'-]+$/.test(value);
      },
      message: 'Name can only contain letters, spaces, dots, hyphens, and apostrophes'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(email) {
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
      },
      message: 'Please provide a valid email'
    }
  },
  password: {
    type: String,
    required: function() {
      // Password required for teachers and admins, optional for students initially
      return this.role === 'teacher' || this.role === 'admin';
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
    validate: {
      validator: function(password) {
        // Only validate if password is being set
        if (!password) return true;
        // At least one uppercase, one lowercase, one digit
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/.test(password);
      },
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'teacher', 'admin'],
      message: 'Role must be either student, teacher, or admin'
    },
    default: 'student',
    required: true
  },
  
  // Teacher-specific fields (only populated when role === 'teacher')
  teacherProfile: {
    phone: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      trim: true,
      validate: {
        validator: function(phone) {
          if (this.role !== 'teacher') return true;
          return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
        },
        message: 'Please provide a valid phone number'
      }
    },
    department: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      enum: {
        values: [
          'Computer Science',
          'Mathematics', 
          'Physics',
          'Chemistry',
          'Biology',
          'English',
          'History',
          'Economics',
          'Business Administration',
          'Psychology'
        ],
        message: 'Please select a valid department'
      }
    },
    subject: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      trim: true,
      maxlength: [50, 'Subject cannot exceed 50 characters']
    },
    experience: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      trim: true,
      maxlength: [50, 'Experience cannot exceed 50 characters']
    },
    qualification: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      trim: true,
      maxlength: [100, 'Qualification cannot exceed 100 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: ''
    },
    availability: [{
      type: String,
      enum: {
        values: [
          '9:00 AM - 10:00 AM',
          '10:00 AM - 11:00 AM', 
          '11:00 AM - 12:00 PM',
          '12:00 PM - 1:00 PM',
          '2:00 PM - 3:00 PM',
          '3:00 PM - 4:00 PM',
          '4:00 PM - 5:00 PM',
          '5:00 PM - 6:00 PM'
        ],
        message: 'Invalid availability time slot'
      }
    }],
    rating: {
      type: Number,
      default: 0,
      min: [0, 'Rating cannot be negative'],
      max: [5, 'Rating cannot exceed 5']
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: [0, 'Total ratings cannot be negative']
    }
  },
  
  // Student-specific fields (only populated when role === 'student')
  studentProfile: {
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(phone) {
          if (!phone) return true; // Optional for students
          return /^[\+]?[1-9][\d]{0,15}$/.test(phone);
        },
        message: 'Please provide a valid phone number'
      }
    },
    course: {
      type: String,
      trim: true,
      maxlength: [100, 'Course cannot exceed 100 characters']
    },
    year: {
      type: String,
      enum: {
        values: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'],
        message: 'Please select a valid year'
      }
    },
    interests: [{
      type: String,
      trim: true,
      maxlength: [50, 'Interest cannot exceed 50 characters']
    }]
  },
  
  // Common fields
  approvalStatus: {
    type: String,
    enum: {
      values: ['pending', 'approved', 'rejected'],
      message: 'Approval status must be pending, approved, or rejected'
    },
    default: function() {
      // Students are auto-approved, teachers and admins need approval
      return this.role === 'student' ? 'approved' : 'pending';
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    select: false
  },
  hasAccount: {
    type: Boolean,
    default: function() {
      // Students have accounts by default, teachers need setup
      return this.role === 'student';
    }
  },
  
  // Authentication and security tokens
  accountSetupToken: {
    type: String,
    select: false
  },
  accountSetupExpires: {
    type: Date,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerifiedAt: {
    type: Date
  },
  
  // Admin tracking fields - ADDED for better audit trail
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', 
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    default: null
  },
  
  // Activity tracking
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
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

// Compound indexes for better query performance - ENHANCED
userSchema.index({ email: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1, approvalStatus: 1 });
userSchema.index({ 'teacherProfile.department': 1 });
userSchema.index({ 'teacherProfile.subject': 1 });
userSchema.index({ 'teacherProfile.availability': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ approvalStatus: 1, role: 1 });

// Text index for search functionality - ENHANCED
userSchema.index({ 
  name: 'text', 
  email: 'text',
  'teacherProfile.subject': 'text',
  'teacherProfile.department': 'text',
  'studentProfile.course': 'text'
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Update timestamps
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }

  // Hash password if modified
  if (!this.isModified('password')) {
    return next();
  }
  
  if (this.password) {
    try {
      this.password = await bcrypt.hash(this.password, 12);
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Pre-validate middleware to ensure proper role-based field validation
userSchema.pre('validate', function(next) {
  // Ensure teacher profile exists for teachers
  if (this.role === 'teacher' && !this.teacherProfile) {
    this.teacherProfile = {};
  }
  
  // Ensure student profile exists for students
  if (this.role === 'student' && !this.studentProfile) {
    this.studentProfile = {};
  }
  
  // Clear inappropriate profile data based on role
  if (this.role !== 'teacher') {
    this.teacherProfile = undefined;
  }
  
  if (this.role !== 'student') {
    this.studentProfile = undefined;
  }
  
  next();
});

// Instance methods
userSchema.methods.correctPassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createAccountSetupToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.accountSetupToken = crypto
    .createHash('sha256')
    .update(resetToken)  
    .digest('hex');
  
  this.accountSetupExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return resetToken;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

userSchema.methods.createEmailVerificationToken = function() {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  return verificationToken;
};

userSchema.methods.incrementLoginCount = function() {
  this.loginCount = (this.loginCount || 0) + 1;
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// APPOINTMENT-SPECIFIC INSTANCE METHODS - NEW

userSchema.methods.getAppointmentInfo = function() {
  if (this.role !== 'teacher') {
    throw new Error('Only teachers can provide appointment info');
  }
  
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    department: this.teacherProfile?.department || '',
    subject: this.teacherProfile?.subject || '',
    phone: this.teacherProfile?.phone || '',
    availability: this.teacherProfile?.availability || [],
    rating: this.teacherProfile?.rating || 0,
    totalRatings: this.teacherProfile?.totalRatings || 0,
    averageRating: this.teacherProfile?.totalRatings > 0 
      ? Math.round((this.teacherProfile.rating / this.teacherProfile.totalRatings) * 10) / 10 
      : 0
  };
};

userSchema.methods.isAvailableForAppointments = function() {
  return this.role === 'teacher' && 
         this.isActive && 
         this.approvalStatus === 'approved' && 
         this.hasAccount &&
         this.teacherProfile?.availability?.length > 0;
};

userSchema.methods.updateRating = async function(newRating) {
  if (this.role !== 'teacher') {
    throw new Error('Only teachers can have ratings');
  }
  
  this.teacherProfile.rating = (this.teacherProfile.rating || 0) + newRating;
  this.teacherProfile.totalRatings = (this.teacherProfile.totalRatings || 0) + 1;
  
  return this.save({ validateBeforeSave: false });
};

// Static methods - ENHANCED for appointment integration
userSchema.statics.findTeachers = function(filters = {}) {
  const query = { 
    role: 'teacher', 
    isActive: true,
    approvalStatus: 'approved',
    ...filters 
  };
  
  return this.find(query)
    .select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires')
    .sort({ createdAt: -1 });
};

userSchema.statics.findTeachersByDepartment = function(department) {
  return this.find({
    role: 'teacher',
    'teacherProfile.department': department,
    isActive: true,
    approvalStatus: 'approved'
  }).select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires');
};

userSchema.statics.findAvailableTeachers = function(filters = {}) {
  const query = {
    role: 'teacher',
    isActive: true,
    approvalStatus: 'approved',
    hasAccount: true,
    'teacherProfile.availability': { $exists: true, $ne: [] },
    ...filters
  };
  
  return this.find(query)
    .select('name email teacherProfile.department teacherProfile.subject teacherProfile.availability teacherProfile.rating teacherProfile.totalRatings')
    .sort({ 'teacherProfile.rating': -1, createdAt: -1 });
};

userSchema.statics.findStudents = function(filters = {}) {
  const query = { 
    role: 'student', 
    isActive: true,
    approvalStatus: 'approved',
    ...filters 
  };
  
  return this.find(query)
    .select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires')
    .sort({ createdAt: -1 });
};

userSchema.statics.searchUsers = function(searchTerm, role = null) {
  const query = {
    $text: { $search: searchTerm },
    isActive: true,
    approvalStatus: 'approved'
  };
  
  if (role) {
    query.role = role;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .select('-password -__v -accountSetupToken -accountSetupExpires -passwordResetToken -passwordResetExpires')
    .sort({ score: { $meta: 'textScore' } });
};

// APPOINTMENT-SPECIFIC STATIC METHODS - NEW

userSchema.statics.findTeacherForAppointment = function(teacherId) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  return this.findOne({
    _id: teacherId,
    role: 'teacher',
    isActive: true,
    approvalStatus: 'approved',
    hasAccount: true
  }).select('name email teacherProfile.department teacherProfile.subject teacherProfile.phone teacherProfile.availability teacherProfile.rating teacherProfile.totalRatings');
};

userSchema.statics.findTeachersWithAvailability = function(department = null, subject = null) {
  const query = {
    role: 'teacher',
    isActive: true,
    approvalStatus: 'approved',
    hasAccount: true,
    'teacherProfile.availability': { $exists: true, $ne: [] }
  };
  
  if (department) {
    query['teacherProfile.department'] = department;
  }
  
  if (subject) {
    query['teacherProfile.subject'] = { $regex: subject, $options: 'i' };
  }
  
  return this.find(query)
    .select('name email teacherProfile.department teacherProfile.subject teacherProfile.availability teacherProfile.rating teacherProfile.totalRatings')
    .sort({ 'teacherProfile.rating': -1, 'teacherProfile.totalRatings': -1 });
};

userSchema.statics.getTeacherAppointmentStats = async function(teacherId) {
  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    throw new Error('Invalid teacher ID');
  }
  
  // This would typically require the Appointment model, but we'll return a placeholder
  // In practice, this should be called from the Appointment model
  const teacher = await this.findOne({ _id: teacherId, role: 'teacher' });
  if (!teacher) {
    throw new Error('Teacher not found');
  }
  
  return {
    teacherId: teacher._id,
    teacherName: teacher.name,
    department: teacher.teacherProfile?.department,
    subject: teacher.teacherProfile?.subject,
    availability: teacher.teacherProfile?.availability || [],
    rating: teacher.teacherProfile?.rating || 0,
    totalRatings: teacher.teacherProfile?.totalRatings || 0,
    averageRating: teacher.teacherProfile?.totalRatings > 0 
      ? Math.round((teacher.teacherProfile.rating / teacher.teacherProfile.totalRatings) * 10) / 10 
      : 0
  };
};

// Virtual properties - ENHANCED for appointment integration
userSchema.virtual('availableSlots').get(function() {
  return this.role === 'teacher' ? this.teacherProfile?.availability || [] : [];
});

userSchema.virtual('displayName').get(function() {
  return this.name;
});

userSchema.virtual('averageRating').get(function() {
  if (this.role === 'teacher' && this.teacherProfile?.totalRatings > 0) {
    return Math.round((this.teacherProfile.rating / this.teacherProfile.totalRatings) * 10) / 10;
  }
  return 0;
});

// NEW VIRTUALS FOR APPOINTMENT INTEGRATION

userSchema.virtual('isAppointmentReady').get(function() {
  if (this.role !== 'teacher') return false;
  
  return this.isActive && 
         this.approvalStatus === 'approved' && 
         this.hasAccount && 
         this.teacherProfile?.availability?.length > 0;
});

userSchema.virtual('appointmentDisplayInfo').get(function() {
  if (this.role !== 'teacher') return null;
  
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    department: this.teacherProfile?.department || '',
    subject: this.teacherProfile?.subject || '',
    availability: this.teacherProfile?.availability || [],
    rating: this.averageRating,
    isAvailable: this.isAppointmentReady
  };
});

userSchema.virtual('studentDisplayInfo').get(function() {
  if (this.role !== 'student') return null;
  
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    course: this.studentProfile?.course || '',
    year: this.studentProfile?.year || '',
    phone: this.studentProfile?.phone || ''
  };
});

// Enhanced toJSON transformation - UPDATED for appointment compatibility
userSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove sensitive fields
    delete ret.__v;
    delete ret.password;
    delete ret.accountSetupToken;
    delete ret.accountSetupExpires; 
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.emailVerificationToken;
    
    // Flatten profiles for easier frontend access - ENHANCED
    if (ret.role === 'teacher' && ret.teacherProfile) {
      // Merge teacher profile fields to root level for backward compatibility
      ret.phone = ret.teacherProfile.phone;
      ret.department = ret.teacherProfile.department;
      ret.subject = ret.teacherProfile.subject;
      ret.experience = ret.teacherProfile.experience;
      ret.qualification = ret.teacherProfile.qualification;
      ret.bio = ret.teacherProfile.bio || '';
      ret.availability = ret.teacherProfile.availability || [];
      ret.rating = ret.teacherProfile.rating || 0;
      ret.totalRatings = ret.teacherProfile.totalRatings || 0;
      
      // Add computed fields for appointments
      ret.averageRating = ret.totalRatings > 0 
        ? Math.round((ret.rating / ret.totalRatings) * 10) / 10 
        : 0;
      ret.isAppointmentReady = ret.isActive && 
                               ret.approvalStatus === 'approved' && 
                               ret.hasAccount && 
                               ret.availability.length > 0;
    }
    
    if (ret.role === 'student' && ret.studentProfile) {
      // Merge student profile fields to root level
      ret.phone = ret.studentProfile.phone;
      ret.course = ret.studentProfile.course;
      ret.year = ret.studentProfile.year;
      ret.interests = ret.studentProfile.interests || [];
    }
    
    return ret;
  }
});

userSchema.set('toObject', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.password;
    delete ret.accountSetupToken;
    delete ret.accountSetupExpires; 
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.emailVerificationToken;
    return ret;
  }
});

// Error handling middleware - ENHANCED
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || 'field';
    const duplicateError = new Error(`User with this ${field} already exists`);
    duplicateError.statusCode = 400;
    duplicateError.code = 'DUPLICATE_ERROR';
    next(duplicateError);
  } else if (error.name === 'ValidationError') {
    const validationError = new Error('User validation failed');
    validationError.statusCode = 400;
    validationError.code = 'VALIDATION_ERROR';
    validationError.details = Object.values(error.errors || {}).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    next(validationError);
  } else {
    next(error);
  }
});

// Performance optimization hooks
userSchema.query.lean = function() {
  return this.setOptions({ lean: true });
};

// Add method to get user data formatted for appointment creation
userSchema.methods.getAppointmentUserData = function() {
  const baseData = {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role
  };
  
  if (this.role === 'teacher') {
    return {
      ...baseData,
      department: this.teacherProfile?.department || '',
      subject: this.teacherProfile?.subject || '',
      phone: this.teacherProfile?.phone || '',
      availability: this.teacherProfile?.availability || []
    };
  }
  
  if (this.role === 'student') {
    return {
      ...baseData,
      course: this.studentProfile?.course || '',
      year: this.studentProfile?.year || '',
      phone: this.studentProfile?.phone || ''
    };
  }
  
  return baseData;
};

module.exports = mongoose.model('User', userSchema);