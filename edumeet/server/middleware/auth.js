const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Utility function for standardized API responses
const sendResponse = (res, statusCode, success, message, data = null, errors = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  if (meta !== null) response.meta = meta;

  return res.status(statusCode).json(response);
};

// Consolidated authentication middleware
const authenticate = (options = {}) => {
  const {
    roles = [], // Array of allowed roles
    required = true, // Whether authentication is required
    checkApproval = true // Whether to check approval status
  } = options;

  return async (req, res, next) => {
    try {
      let token;
      
      // Extract token from header or cookies
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
      }

      // Handle case where no token is provided
      if (!token) {
        if (!required) {
          return next(); // Continue without authentication for optional routes
        }
        return sendResponse(res, 401, false, 'Access denied. No authentication token provided.');
      }

      // Verify token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError.message);
        
        let message = 'Invalid authentication token';
        if (tokenError.name === 'TokenExpiredError') {
          message = 'Authentication token has expired';
        } else if (tokenError.name === 'JsonWebTokenError') {
          message = 'Invalid token format or signature';
        }
        
        return sendResponse(res, 401, false, message);
      }

      // Validate token payload
      const userId = decoded.id;
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return sendResponse(res, 401, false, 'Invalid token structure - no valid user ID found');
      }

      console.log('🔍 Decoded token payload:', {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email
      });

      // Find user based on role
      let user;
      try {
        if (decoded.role === 'admin') {
          user = await Admin.findById(userId).select('+isActive');
          if (user) {
            user.role = 'admin'; // Ensure role is set
          }
        } else {
          user = await User.findById(userId).select('+isActive +approvalStatus');
        }
      } catch (dbError) {
        console.error('Database error during authentication:', dbError);
        return sendResponse(res, 500, false, 'Database error during authentication');
      }
      
      // Check if user exists
      if (!user) {
        return sendResponse(res, 401, false, 'User not found. Token invalid or user does not exist.');
      }

      // Check if user is active
      if (user.isActive === false) {
        return sendResponse(res, 401, false, 'Account is deactivated. Please contact support.');
      }

      // Check approval status (except for admin)
      if (checkApproval && user.role !== 'admin' && user.approvalStatus !== 'approved') {
        return sendResponse(res, 401, false, 'User account is not approved or is pending approval.');
      }

      // Check role authorization
      if (roles.length > 0 && !roles.includes(user.role || decoded.role)) {
        console.log(`❌ Authorization failed: User role '${user.role || decoded.role}' not in required roles:`, roles);
        return sendResponse(res, 403, false, `Access denied. Role '${user.role || decoded.role}' is not authorized for this resource.`);
      }

      // Attach user to request with consistent format
      req.user = {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || decoded.role,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus
      };

      // For backward compatibility, also set role-specific properties
      if (user.role === 'admin' || decoded.role === 'admin') {
        req.admin = req.user;
      } else if (user.role === 'teacher' || decoded.role === 'teacher') {
        req.teacher = req.user;
      }
      
      console.log(`✅ User authenticated: ${user.name} (${user.role || decoded.role})`);
      next();

    } catch (error) {
      console.error('Authentication error:', error);
      return sendResponse(res, 500, false, 'Server error during authentication');
    }
  };
};

// Convenience middleware functions using the consolidated authenticate function
const protect = authenticate({ required: true });

const authenticateAdmin = authenticate({ 
  roles: ['admin'], 
  required: true 
});

const authenticateTeacher = authenticate({ 
  roles: ['teacher'], 
  required: true 
});

const authorize = (...roles) => {
  return authenticate({ 
    roles: roles.flat(), 
    required: true 
  });
};

const restrictTo = (...roles) => {
  return authenticate({ 
    roles: roles.flat(), 
    required: true 
  });
};

const optionalAuth = authenticate({ 
  required: false 
});

// Middleware to check ownership or admin access
const checkOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return sendResponse(res, 401, false, 'Authentication required');
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      const currentUserId = req.user.id;
      
      if (resourceUserId && currentUserId.toString() !== resourceUserId.toString()) {
        return sendResponse(res, 403, false, 'Access denied. You can only access your own resources.');
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return sendResponse(res, 500, false, 'Server error during ownership verification');
    }
  };
};

// Middleware to validate MongoDB ObjectId
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return sendResponse(res, 400, false, `${paramName} parameter is required`);
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, `Invalid ${paramName} format`);
    }

    next();
  };
};

// Enhanced middleware for checking teacher appointment access
const checkTeacherAppointmentAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid appointment ID');
    }

    // Find the appointment
    const Appointment = require('../models/Appointment');
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return sendResponse(res, 404, false, 'Appointment not found');
    }

    // Admin can access all appointments
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if teacher owns the appointment
    const currentUserId = req.user.id;
    if (req.user.role === 'teacher' && currentUserId.toString() === appointment.teacherId.toString()) {
      return next();
    }

    return sendResponse(res, 403, false, 'Access denied. You can only access your own appointments.');

  } catch (error) {
    console.error('Teacher appointment access check error:', error);
    return sendResponse(res, 500, false, 'Server error during appointment access verification');
  }
};

// Middleware to log authentication attempts
const logAuthAttempt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const hasToken = authHeader && authHeader.startsWith('Bearer');
  
  console.log(`🔑 Auth attempt: ${req.method} ${req.originalUrl}`, {
    hasToken,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']?.substring(0, 50) + '...' || 'Unknown'
  });

  next();
};

module.exports = {
  // Main authentication function
  authenticate,
  
  // Convenience functions (for backward compatibility)
  protect,
  authenticateAdmin,
  authenticateTeacher,
  authorize,
  restrictTo,
  optionalAuth,
  
  // Utility functions
  checkOwnershipOrAdmin,
  validateObjectId,
  checkTeacherAppointmentAccess,
  logAuthAttempt,
  
  // Response utility (can be used in controllers)
  sendResponse
};