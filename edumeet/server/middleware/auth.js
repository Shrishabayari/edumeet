const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure your User model is correctly defined
const Teacher = require('../models/Teacher'); // Ensure your Teacher model is correctly defined
const Admin = require('../models/Admin'); // Ensure your Admin model is correctly defined

// General protect middleware for regular users (students, teachers)
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (if you're using cookie-based auth)
    else if (req.cookies && req.cookies.jwt) { // Added check for req.cookies
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

    // Find user by ID. The token for general users (students/teachers) should have 'id'.
    // It could be a User or a Teacher, depending on how your system issues tokens.
    // Assuming 'id' in token refers to the primary User model ID.
    const user = await User.findById(decoded.id); 
    
    if (!user) {
      // If not found in User model, try Teacher model if applicable
      // This part might need adjustment based on how you differentiate tokens for User vs Teacher
      // For simplicity, sticking to User model as main authentication source unless specified.
      // If a teacher logs in via a separate teacher login, their token might point to Teacher model.
      // For this system, assuming 'User' model covers both roles for authentication.
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

    // Check if user is approved (except for admin, who uses authenticateAdmin)
    // This middleware is for general users, so check approval status.
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

// Admin-specific authentication middleware
exports.authenticateAdmin = async (req, res, next) => {
  try {
    let token;
    // Check for token in header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies (if you're using cookie-based auth)
    else if (req.cookies && req.cookies.jwt) { // Added check for req.cookies
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
    
    // Find admin using 'adminId' from the decoded token payload
    const admin = await Admin.findById(decoded.adminId); 
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found or token invalid.'
      });
    }

    // Check if the user is indeed an admin
    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Not an administrator.'
      });
    }

    // Attach admin to request object, ensuring 'id' property is available
    req.admin = {
      ...admin.toObject(), // Convert Mongoose document to plain object
      id: admin._id // Explicitly set 'id' for consistency if needed by controllers
    };
    // For consistency with 'protect' middleware, also set req.user if needed by 'restrictTo'
    req.user = req.admin; 
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

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // This middleware expects req.user to be set by a preceding authentication middleware (like 'protect' or 'authenticateAdmin')
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

// Restrict to specific roles (alias for authorize, kept for clarity if used differently)
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // This middleware expects req.user to be set by a preceding authentication middleware
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
