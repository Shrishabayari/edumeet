// middleware/auth.js - CORRECTED VERSION for messaging system
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');

// Enhanced protect middleware for all users (students, teachers, admins)
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

    let user = null;
    let userRole = decoded.role || 'student';

    // Find user based on role in token
    try {
      if (userRole === 'teacher') {
        user = await Teacher.findById(decoded.id);
        
        // For teachers, check if they have an active account
        if (user && (!user.hasAccount || !user.isActive)) {
          return res.status(401).json({
            success: false,
            message: 'Teacher account is not properly set up or is inactive.'
          });
        }
      } else if (userRole === 'admin') {
        user = await Admin.findById(decoded.id);
        
        if (user && !user.isActive) {
          return res.status(401).json({
            success: false,
            message: 'Admin account is deactivated.'
          });
        }
      } else {
        // Default to student/user
        user = await User.findById(decoded.id);
        
        if (user) {
          // Check if user is active
          if (!user.isActive) {
            return res.status(401).json({
              success: false,
              message: 'Account is deactivated. Please contact support.'
            });
          }
          
          // Check if user is approved (students need approval)
          if (user.approvalStatus !== 'approved') {
            return res.status(401).json({
              success: false,
              message: 'User account is not approved or is pending approval.'
            });
          }
        }
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token invalid or user does not exist.'
        });
      }
      
      // Attach user to request with proper role information
      req.user = user;
      req.user.role = userRole; // Ensure role is set correctly
      
      next();
      
    } catch (dbError) {
      console.error('Database error during authentication:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database error during authentication'
      });
    }

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
    
    // Try multiple possible ID fields in the token
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
    req.user = admin;
    req.user.role = 'admin'; // Ensure role is set
    
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

// Teacher-specific authentication middleware
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
    
    // Find teacher in Teacher model (not User model)
    const teacher = await Teacher.findById(teacherId);
    
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Teacher not found or token invalid.'
      });
    }

    // Check if teacher has an active account
    if (!teacher.isActive || !teacher.hasAccount) {
      return res.status(401).json({
        success: false,
        message: 'Teacher account is not properly set up or is inactive.'
      });
    }

    // Attach teacher to request object
    req.teacher = teacher;
    req.user = teacher;
    req.user.role = 'teacher'; // Ensure role is set
    
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

// Middleware specifically for messaging routes that require either student or teacher
exports.protectMessaging = async (req, res, next) => {
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
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Messaging auth - Decoded token:', { id: decoded.id, role: decoded.role });

    let user = null;
    const userRole = decoded.role || 'student';

    // Find user based on role
    if (userRole === 'teacher') {
      user = await Teacher.findById(decoded.id);
      
      if (!user || !user.isActive || !user.hasAccount) {
        return res.status(401).json({
          success: false,
          message: 'Teacher account not found or not properly set up.'
        });
      }
    } else {
      // Student or other user
      user = await User.findById(decoded.id);
      
      if (!user || !user.isActive || user.approvalStatus !== 'approved') {
        return res.status(401).json({
          success: false,
          message: 'User account not found, inactive, or not approved.'
        });
      }
    }

    // Attach user to request
    req.user = user;
    req.user.role = userRole;
    
    console.log(`✅ Messaging auth success: ${user.name} (${userRole})`);
    next();

  } catch (error) {
    console.error('Messaging authentication error:', error);
    
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
      const userRole = decoded.role || 'student';
      
      let user = null;
      
      if (userRole === 'teacher') {
        user = await Teacher.findById(decoded.id);
        if (user && user.isActive && user.hasAccount) {
          req.user = user;
          req.user.role = 'teacher';
        }
      } else if (userRole === 'admin') {
        user = await Admin.findById(decoded.id);
        if (user && user.isActive) {
          req.user = user;
          req.user.role = 'admin';
        }
      } else {
        user = await User.findById(decoded.id);
        if (user && user.isActive && user.approvalStatus === 'approved') {
          req.user = user;
          req.user.role = userRole;
        }
      }
    }

    next();

  } catch (error) {
    // Continue without authentication if token is invalid or expired for optional routes
    console.warn('Optional authentication failed but continuing:', error.message);
    next();
  }
};