const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher'); // Import Teacher model
const User = require('../models/User'); // Assuming User model is needed for general user management
const Appointment = require('../models/Appointment'); // Import Appointment model
const Student = require('../models/User'); // Assuming students are part of the User model or a separate Student model

// Register Admin
const registerAdmin = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin
    const admin = new Admin({
      name,
      email,
      password: hashedPassword
    });

    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('Admin registered successfully, token generated:', token);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

// Login Admin
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    console.log('Login attempt for email:', email);

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.log('Admin not found for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      console.log('Password mismatch for email:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin._id, email: admin.email, role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    console.log('Admin logged in successfully, token generated:', token);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};
// Add these methods to your adminController.js

// Get admin profile
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id; // From authentication middleware
    
    // Fetch admin from database (adjust based on your database setup)
    const admin = await Admin.findById(adminId).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update admin profile
const updateAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const updateData = req.body;

    // Remove password from update data if present
    delete updateData.password;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      adminId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: updatedAdmin,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    // Fetch counts from your database
    const totalTeachers = await Teacher.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' }); // Assuming students are users with role 'student'
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: 'pending' });
    const approvedTeachers = await Teacher.countDocuments({ status: 'approved' });
    const pendingTeachers = await Teacher.countDocuments({ status: 'pending' });

    res.json({
      success: true,
      data: {
        totalTeachers,
        totalStudents,
        totalAppointments,
        pendingAppointments,
        approvedTeachers,
        pendingTeachers
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    // You might want to fetch all users from your general User model
    // and filter by role on the frontend or add more specific queries here.
    // Assuming 'User' model covers both students and teachers if they are not separate collections.
    const teachers = await Teacher.find().select('-password'); // Fetch teachers from Teacher model
    const students = await User.find({ role: 'student' }).select('-password'); // Fetch students from User model with role 'student'

    res.json({
      success: true,
      data: {
        teachers,
        students
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Get all appointments
const getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate('teacherId', 'name email subject')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update teacher status
const updateTeacherStatus = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      teacherId,
      { status },
      { new: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    res.json({
      success: true,
      data: teacher,
      message: `Teacher ${status} successfully`
    });
  } catch (error) {
    console.error('Error updating teacher status:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query; // Expecting 'teacher' or 'student'

    let deletedUser;
    if (type === 'teacher') {
      deletedUser = await Teacher.findByIdAndDelete(userId);
    } else if (type === 'student') {
      deletedUser = await User.findByIdAndDelete(userId); // Assuming students are in User model
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type specified. Must be "teacher" or "student".'
      });
    }

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Export all functions
module.exports = {
  registerAdmin,
  loginAdmin,
  getAdminProfile,
  updateAdminProfile,
  getDashboardStats,
  getUsers,
  getAllAppointments,
  updateTeacherStatus,
  deleteUser
};
