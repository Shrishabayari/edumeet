const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Utility function for standardized API responses
const sendResponse = (res, statusCode, success, message, data = null, errors = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.locals?.requestId || res.req?.id || 'unknown'
  };

  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  if (meta !== null) response.meta = meta;

  return res.status(statusCode).json(response);
};

// Enhanced JWT verification with better error handling
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          reject({ name: 'TokenExpiredError', message: 'Token has expired' });
        } else if (err.name === 'JsonWebTokenError') {
          reject({ name: 'JsonWebTokenError', message: 'Invalid token' });
        } else {
          reject({ name: 'TokenError', message: 'Token verification failed' });
        }
      } else {
        resolve(decoded);
      }
    });
  });
};

// FIXED: Consolidated authentication middleware
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

      // Skip if token is logout placeholder
      if (token === 'loggedout') {
        if (!required) {
          return next();
        }
        return sendResponse(res, 401, false, 'Access denied. Please log in again.');
      }

      // Verify token
      let decoded;
      try {
        decoded = await verifyToken(token);
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError.message);
        
        let message = 'Invalid authentication token';
        if (tokenError.name === 'TokenExpiredError') {
          message = 'Authentication token has expired. Please log in again.';
        } else if (tokenError.name === 'JsonWebTokenError') {
          message = 'Invalid token format or signature';
        }
        
        return sendResponse(res, 401, false, message);
      }

      // Validate token payload
      const userId = decoded.id;
      if (!userId) {
        return sendResponse(res, 401, false, 'Invalid token structure - no user ID found');
      }

      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return sendResponse(res, 401, false, 'Invalid token structure - invalid user ID format');
      }

      console.log('🔍 Token verified for user:', {
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
        console.error('User not found:', userId);
        return sendResponse(res, 401, false, 'User not found. Token may be invalid or user may have been deleted.');
      }

      // Check if user is active
      if (user.isActive === false) {
        console.error('User account deactivated:', userId);
        return sendResponse(res, 401, false, 'Account is deactivated. Please contact support.');
      }

      // Check approval status (except for admin)
      if (checkApproval && user.role !== 'admin' && decoded.role !== 'admin') {
        if (user.approvalStatus === 'rejected') {
          return sendResponse(res, 401, false, 'Account has been rejected. Please contact admin.');
        }
        if (user.approvalStatus === 'pending') {
          return sendResponse(res, 401, false, 'Account is pending approval. Please contact admin.');
        }
        if (user.approvalStatus !== 'approved') {
          return sendResponse(res, 401, false, 'Account is not approved.');
        }
      }

      // Determine user role
      const userRole = user.role || decoded.role;

      // Check role authorization
      if (roles.length > 0 && !roles.includes(userRole)) {
        console.log(`Authorization failed: User role '${userRole}' not in required roles:`, roles);
        return sendResponse(res, 403, false, `Access denied. Role '${userRole}' is not authorized for this resource.`);
      }

      // Attach user to request with consistent format
      req.user = {
        id: user._id.toString(),
        _id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        isActive: user.isActive,
        approvalStatus: user.approvalStatus || 'approved'
      };

      // For backward compatibility, also set role-specific properties
      if (userRole === 'admin') {
        req.admin = req.user;
      } else if (userRole === 'teacher') {
        req.teacher = req.user;
      } else if (userRole === 'student') {
        req.student = req.user;
      }
      
      console.log(`User authenticated: ${user.name} (${userRole})`);
      next();

    } catch (error) {
      console.error('Authentication error:', error);
      return sendResponse(res, 500, false, 'Server error during authentication', null, [{ message: error.message }]);
    }
  };
};

// Convenience middleware functions using the consolidated authenticate function
const protect = authenticate({ required: true });

const authenticateAdmin = authenticate({ 
  roles: ['admin'], 
  required: true,
  checkApproval: false // Admins don't need approval status check
});

const authenticateTeacher = authenticate({ 
  roles: ['teacher'], 
  required: true 
});

const authenticateStudent = authenticate({ 
  roles: ['student'], 
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
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField] || req.params.id;
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

// Enhanced middleware for checking teacher appointment access - FIXED
const checkTeacherAppointmentAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendResponse(res, 400, false, 'Invalid appointment ID');
    }

    // Admin can access all appointments
    if (req.user.role === 'admin') {
      return next();
    }

    // Find the appointment - FIXED: Import Appointment model correctly
    const Appointment = require('../models/Appointment');
    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return sendResponse(res, 404, false, 'Appointment not found');
    }

    // Check if teacher owns the appointment
    const currentUserId = req.user.id;
    if (req.user.role === 'teacher' && currentUserId.toString() === appointment.teacherId.toString()) {
      return next();
    }

    // FIXED: For students - check if they made the appointment request
    if (req.user.role === 'student') {
      // Students can view appointments they requested (by email match)
      if (appointment.student?.email?.toLowerCase() === req.user.email?.toLowerCase()) {
        return next();
      }
    }

    return sendResponse(res, 403, false, 'Access denied. You can only access your own appointments.');

  } catch (error) {
    console.error('Appointment access check error:', error);
    return sendResponse(res, 500, false, 'Server error during appointment access verification');
  }
};

// Middleware to log authentication attempts (for debugging)
const logAuthAttempt = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const authHeader = req.headers.authorization;
    const hasToken = authHeader && authHeader.startsWith('Bearer');
    
    console.log(`Auth attempt: ${req.method} ${req.originalUrl}`, {
      hasToken,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...' || 'Unknown'
    });
  }

  next();
};

// Middleware to check if user has account setup
const requireAccountSetup = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendResponse(res, 401, false, 'Authentication required');
    }

    if (req.user.role === 'admin') {
      return next(); // Admins don't need account setup
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return sendResponse(res, 404, false, 'User not found');
    }

    if (!user.hasAccount) {
      return sendResponse(res, 403, false, 'Account setup required. Please complete your account setup first.');
    }

    next();
  } catch (error) {
    console.error('Account setup check error:', error);
    return sendResponse(res, 500, false, 'Server error during account setup verification');
  }
};

module.exports = {
  // Main authentication function
  authenticate,
  
  // Convenience functions
  protect,
  authenticateAdmin,
  authenticateTeacher,
  authenticateStudent,
  authorize,
  restrictTo,
  optionalAuth,
  
  // Utility functions
  checkOwnershipOrAdmin,
  validateObjectId,
  checkTeacherAppointmentAccess,
  logAuthAttempt,
  requireAccountSetup,
  
  // Response utility
  sendResponse
};