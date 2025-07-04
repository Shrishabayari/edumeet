const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
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
    required: [true, 'Subject is required'],
    trim: true,
    minlength: [2, 'Subject must be at least 2 characters'],
    maxlength: [50, 'Subject cannot exceed 50 characters']
  },
  experience: {
    type: String,
    required: [true, 'Experience is required'],
    trim: true,
    maxlength: [50, 'Experience cannot exceed 50 characters']
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    trim: true,
    minlength: [5, 'Qualification must be at least 5 characters'],
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
  }],
  
  // NEW AUTHENTICATION FIELDS
  password: {
    type: String,
    select: false // Don't include password in queries by default
  },
  hasAccount: {
    type: Boolean,
    default: false
  },
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
  
  isActive: {
    type: Boolean,
    default: true
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

// Hash password before saving
teacherSchema.pre('save', async function(next) {
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

// Compare password method
teacherSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Generate account setup token
teacherSchema.methods.createAccountSetupToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.accountSetupToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  this.accountSetupExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  
  return resetToken;
};

// Static method to get teachers by department
teacherSchema.statics.getByDepartment = function(department) {
  return this.find({ department, isActive: true }).select('-__v');
};

// Instance method to get available slots
teacherSchema.methods.getAvailableSlots = function() {
  return this.availability || [];
};

// Virtual for full profile
teacherSchema.virtual('profile').get(function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    department: this.department,
    subject: this.subject,
    experience: this.experience,
    qualification: this.qualification,
    bio: this.bio,
    availability: this.availability,
    hasAccount: this.hasAccount,
    lastLogin: this.lastLogin,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
});

// Ensure virtual fields are serialized
teacherSchema.set('toJSON', { 
  virtuals: true, 
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.password;
    delete ret.accountSetupToken;
    delete ret.accountSetupExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  }
});

const Teacher = mongoose.model('Teacher', teacherSchema);
module.exports = Teacher;