// middleware/auth.js - FIXED version to match frontend token structure
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Teacher =require('../models/Teacher');
const Admin = require('../models/Admin');

// General protect middleware for regular users (students, teachers)
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (if you're using cookie-based auth)
    else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Decoded token payload (protect):', decoded);

    // Find user by ID (use 'id' field from token)
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token invalid or user does not exist.'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Check if user is approved (except for admin)
    if (user.role !== 'admin' && user.approvalStatus !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'User account is not approved or is pending approval.'
      });
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (error) {
    console.error('Authentication error (protect middleware):', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// FIXED Admin-specific authentication middleware
exports.authenticateAdmin = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      console.log('❌ No admin token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Decoded admin token payload:', decoded);
    
    // FIXED: Try multiple possible ID fields in the token
    let adminId = decoded.adminId || decoded.id || decoded._id;
    
    if (!adminId) {
      console.log('❌ No admin ID found in token payload');
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure - no admin ID found'
      });
    }
    
    // Find admin using the ID from token
    const admin = await Admin.findById(adminId);
    
    if (!admin) {
      console.log('❌ Admin not found with ID:', adminId);
      return res.status(401).json({
        success: false,
        message: 'Admin not found or token invalid.'
      });
    }

    console.log('✅ Admin authenticated:', admin.email);

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Admin account is deactivated.'
      });
    }

    // Attach admin to request object
    req.admin = admin;
    // For consistency with 'protect' middleware, also set req.user
    req.user = admin;
    
    next();
    
  } catch (error) {
    console.error('Authentication error (authenticateAdmin middleware):', error);
    
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token signature or malformed token';
    }
    
    return res.status(401).json({
      success: false,
      message: message
    });
  }
};

// ADDED: Teacher-specific authentication middleware
exports.authenticateTeacher = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Decoded teacher token payload:', decoded);
    
    // Try multiple possible ID fields in the token
    let teacherId = decoded.teacherId || decoded.id || decoded._id;
    
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure - no teacher ID found'
      });
    }
    
    // Find teacher - assuming you have a Teacher model or teachers are stored in User model
    const teacher = await User.findById(teacherId);
    
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(401).json({
        success: false,
        message: 'Teacher not found or token invalid.'
      });
    }

    // Check if teacher is active
    if (!teacher.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Teacher account is deactivated.'
      });
    }

    // Attach teacher to request object
    req.teacher = teacher;
    req.user = teacher;
    
    next();
    
  } catch (error) {
    console.error('Authentication error (authenticateTeacher middleware):', error);
    
    let message = 'Invalid token';
    if (error.name === 'TokenExpiredError') {
      message = 'Token expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token signature or malformed token';
    }
    
    return res.status(401).json({
      success: false,
      message: message
    });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User role not found or not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${req.user.role} role is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Restrict to specific roles (alias for authorize)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User role not found or not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }
    
    next();
  };
};

// Optional authentication middleware (doesn't fail if no token)
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (token) {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find user by ID
      const user = await User.findById(decoded.id);
      
      // Only attach user if found, active, and approved (or admin)
      if (user && user.isActive && (user.role === 'admin' || user.approvalStatus === 'approved')) {
        req.user = user;
      }
    }

    next();

  } catch (error) {
    // Continue without authentication if token is invalid or expired for optional routes
    console.warn('Optional authentication failed but continuing:', error.message);
    next();
  }
};