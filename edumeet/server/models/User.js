const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: function() {
      return this.role !== 'student'; // Only teachers/admins need passwords initially
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    default: 'student',
    required: true
  },
  
  // Teacher-specific fields (only populated when role === 'teacher')
  teacherProfile: {
    phone: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      trim: true,
      match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
    },
    department: {
      type: String,
      required: function() { return this.role === 'teacher'; },
      enum: [
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
      ]
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
      maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    availability: [{
      type: String,
      enum: [
        '9:00 AM - 10:00 AM',
        '10:00 AM - 11:00 AM', 
        '11:00 AM - 12:00 PM',
        '12:00 PM - 1:00 PM',
        '2:00 PM - 3:00 PM',
        '3:00 PM - 4:00 PM',
        '4:00 PM - 5:00 PM',
        '5:00 PM - 6:00 PM'
      ]
    }]
  },
  
  // Common fields
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function() {
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
      return this.role === 'student';
    }
  },
  
  // Authentication tokens
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
  lastLogin: {
    type: Date
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

// Indexes
userSchema.index({ email: 1, role: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ 'teacherProfile.department': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    this.updatedAt = Date.now();
    return next();
  }
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  this.updatedAt = Date.now();
  next();
});

// Instance methods
userSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createAccountSetupToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.accountSetupToken = crypto
    .createHash('sha256')
    .update(resetToken)  
    .digest('hex');
  
  this.accountSetupExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return resetToken;
};

// Static methods
userSchema.statics.findTeachers = function(filters = {}) {
  return this.find({ 
    role: 'teacher', 
    isActive: true,
    approvalStatus: 'approved',
    ...filters 
  }).select('-password -__v');
};

userSchema.statics.findTeachersByDepartment = function(department) {
  return this.find({
    role: 'teacher',
    'teacherProfile.department': department,
    isActive: true,
    approvalStatus: 'approved'
  }).select('-password -__v');
};

// Virtual for teacher's available slots
userSchema.virtual('availableSlots').get(function() {
  return this.role === 'teacher' ? this.teacherProfile?.availability || [] : [];
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.password;
    delete ret.accountSetupToken;
    delete ret.accountSetupExpires; 
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    // Flatten teacher profile for easier access
    if (ret.role === 'teacher' && ret.teacherProfile) {
      Object.assign(ret, ret.teacherProfile);
      delete ret.teacherProfile;
    }
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);