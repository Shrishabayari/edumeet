const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
  },
  role: {
    type: String,
    enum: {
      values: ['student', 'teacher', 'admin'],
      message: 'Role must be student, teacher, or admin'
    },
    default: 'student',
    index: true
  },
  profile: {
    phone: {
      type: String,
      match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    avatar: {
      type: String,
      default: ''
    },
    grade: {
      type: String,
      required: function() {
        return this.role === 'student';
      }
    },
    studentId: {
      type: String,
      unique: true,
      sparse: true
    },
    // Teacher specific fields
    subject: {
      type: String,
      required: function() {
        return this.role === 'teacher';
      }
    },
    department: {
      type: String,
      required: function() {
        return this.role === 'teacher';
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  // Admin approval system
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Auto-generate student ID for students
userSchema.pre('save', async function(next) {
  if (this.role === 'student' && !this.profile.studentId) {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    this.profile.studentId = `STU${year}${random}`;
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// Find user by email with password
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email }).select('+password');
};

// Check if user can login (approved and active)
userSchema.methods.canLogin = function() {
  return this.isActive && this.approvalStatus === 'approved';
};

// Approve user method
userSchema.methods.approve = function(adminId) {
  this.approvalStatus = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.rejectedAt = undefined;
  this.rejectionReason = undefined;
  return this.save();
};

// Reject user method
userSchema.methods.reject = function(adminId, reason) {
  this.approvalStatus = 'rejected';
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  this.approvedBy = undefined;
  this.approvedAt = undefined;
  return this.save();
};

module.exports = mongoose.model('User', userSchema);