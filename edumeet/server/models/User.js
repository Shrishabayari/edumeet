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

// Compound indexes for better query performance
userSchema.index({ email: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1, approvalStatus: 1 });
userSchema.index({ 'teacherProfile.department': 1 });
userSchema.index({ 'teacherProfile.subject': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Text index for search functionality
userSchema.index({ 
  name: 'text', 
  email: 'text',
  'teacherProfile.subject': 'text',
  'teacherProfile.department': 'text'
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

// Static methods
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

// Virtual for teacher's available slots
userSchema.virtual('availableSlots').get(function() {
  return this.role === 'teacher' ? this.teacherProfile?.availability || [] : [];
});

// Virtual for full name (if you want to add firstName/lastName later)
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Virtual for teacher rating display
userSchema.virtual('averageRating').get(function() {
  if (this.role === 'teacher' && this.teacherProfile?.totalRatings > 0) {
    return Math.round((this.teacherProfile.rating / this.teacherProfile.totalRatings) * 10) / 10;
  }
  return 0;
});

// Ensure virtuals are included in JSON
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
    
    // Flatten profiles for easier frontend access
    if (ret.role === 'teacher' && ret.teacherProfile) {
      // Merge teacher profile fields to root level
      ret.phone = ret.teacherProfile.phone;
      ret.department = ret.teacherProfile.department;
      ret.subject = ret.teacherProfile.subject;
      ret.experience = ret.teacherProfile.experience;
      ret.qualification = ret.teacherProfile.qualification;
      ret.bio = ret.teacherProfile.bio || '';
      ret.availability = ret.teacherProfile.availability || [];
      ret.rating = ret.teacherProfile.rating || 0;
      ret.totalRatings = ret.teacherProfile.totalRatings || 0;
      
      // Keep original structure for backward compatibility
      // but also provide flattened access
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

// Ensure virtuals are included in Object
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

module.exports = mongoose.model('User', userSchema);