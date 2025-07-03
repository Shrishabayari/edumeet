const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Teacher name is required'],
    trim: true,
    minLength: [2, 'Name must be at least 2 characters long'],
    maxLength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
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
    ],
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  experience: {
    type: String,
    required: [true, 'Experience is required'],
    trim: true
  },
  qualification: {
    type: String,
    required: [true, 'Qualification is required'],
    trim: true,
    minLength: [5, 'Qualification must be at least 5 characters long']
  },
  bio: {
    type: String,
    trim: true,
    maxLength: [500, 'Bio cannot exceed 500 characters']
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
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: null
  },
  teachingRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalAppointments: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true, // This will add createdAt and updatedAt fields
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field for full contact info
teacherSchema.virtual('contactInfo').get(function() {
  return {
    email: this.email,
    phone: this.phone
  };
});

// Virtual field for experience years (if experience is in "X years" format)
teacherSchema.virtual('experienceYears').get(function() {
  const match = this.experience.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
});

// Index for better search performance
teacherSchema.index({ name: 'text', subject: 'text', department: 'text' });
teacherSchema.index({ department: 1, subject: 1 });
teacherSchema.index({ email: 1 });

// Pre-save middleware to validate subject based on department
teacherSchema.pre('save', function(next) {
  const subjectsByDepartment = {
    'Computer Science': ['Programming', 'Data Structures', 'Algorithms', 'Database Systems', 'Web Development', 'Machine Learning'],
    'Mathematics': ['Calculus', 'Algebra', 'Statistics', 'Geometry', 'Discrete Math', 'Applied Mathematics'],
    'Physics': ['Classical Mechanics', 'Thermodynamics', 'Electromagnetism', 'Quantum Physics', 'Optics'],
    'Chemistry': ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry'],
    'Biology': ['Cell Biology', 'Genetics', 'Ecology', 'Microbiology', 'Anatomy', 'Physiology'],
    'English': ['Literature', 'Grammar', 'Creative Writing', 'Composition', 'Public Speaking'],
    'History': ['World History', 'Ancient History', 'Modern History', 'Political History'],
    'Economics': ['Microeconomics', 'Macroeconomics', 'International Economics', 'Development Economics'],
    'Business Administration': ['Management', 'Marketing', 'Finance', 'Human Resources', 'Operations'],
    'Psychology': ['General Psychology', 'Cognitive Psychology', 'Social Psychology', 'Clinical Psychology']
  };

  if (this.department && this.subject) {
    const validSubjects = subjectsByDepartment[this.department];
    if (validSubjects && !validSubjects.includes(this.subject)) {
      return next(new Error(`Subject ${this.subject} is not valid for department ${this.department}`));
    }
  }
  
  next();
});

// Static method to get teachers by department
teacherSchema.statics.getByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Instance method to get available slots
teacherSchema.methods.getAvailableSlots = function() {
  return this.availability.filter(slot => slot);
};

// Instance method to add availability slot
teacherSchema.methods.addAvailabilitySlot = function(slot) {
  if (!this.availability.includes(slot)) {
    this.availability.push(slot);
  }
  return this.save();
};

// Instance method to remove availability slot
teacherSchema.methods.removeAvailabilitySlot = function(slot) {
  this.availability = this.availability.filter(s => s !== slot);
  return this.save();
};

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;