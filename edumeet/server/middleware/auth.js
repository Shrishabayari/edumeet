const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// General protect middleware for regular users (students, teachers)
exports.protect = async (req, res, next) => {
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
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError.message);
      
      if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
      
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      throw tokenError;
    }

    console.log('🔍 Decoded token payload (protect):', decoded);

    // Use consistent field name 'id' for all lookups
    const userId = decoded.id || decoded._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure - no user ID found'
      });
    }

    // Find user by ID
    const user = await User.findById(userId).select('+isActive +approvalStatus');
    
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
    console.log(`✅ User authenticated: ${user.name} (${user.role})`);
    next();

  } catch (error) {
    console.error('Authentication error (protect middleware):', error);
    
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
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error('Admin token verification failed:', tokenError.message);
      
      let message = 'Invalid token';
      if (tokenError.name === 'TokenExpiredError') {
        message = 'Token expired';
      } else if (tokenError.name === 'JsonWebTokenError') {
        message = 'Invalid token signature or malformed token';
      }
      
      return res.status(401).json({
        success: false,
        message: message
      });
    }

    console.log('🔍 Decoded admin token payload:', decoded);
    
    // Use consistent field name 'id'
    const adminId = decoded.id || decoded._id;
    
    if (!adminId) {
      console.log('❌ No admin ID found in token payload');
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure - no admin ID found'
      });
    }
    
    // Find admin using the ID from token
    const admin = await Admin.findById(adminId).select('+isActive');
    
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
    req.user = admin; // For consistency with 'protect' middleware
    
    next();
    
  } catch (error) {
    console.error('Authentication error (authenticateAdmin middleware):', error);
    
    return res.status(500).json({
      success: false,
      message: 'Server error during admin authentication'
    });
  }
};

// Teacher-specific authentication middleware (using User model with role check)
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
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error('Teacher token verification failed:', tokenError.message);
      
      let message = 'Invalid token';
      if (tokenError.name === 'TokenExpiredError') {
        message = 'Token expired';
      } else if (tokenError.name === 'JsonWebTokenError') {
        message = 'Invalid token signature or malformed token';
      }
      
      return res.status(401).json({
        success: false,
        message: message
      });
    }

    console.log('🔍 Decoded teacher token payload:', decoded);
    
    // Use consistent field name 'id'
    const teacherId = decoded.id || decoded._id;
    
    if (!teacherId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token structure - no teacher ID found'
      });
    }
    
    // Find teacher in User model with role check
    const teacher = await User.findById(teacherId).select('+isActive +approvalStatus');
    
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

    // Check if teacher is approved
    if (teacher.approvalStatus !== 'approved') {
      return res.status(401).json({
        success: false,
        message: 'Teacher account is not approved.'
      });
    }

    // Attach teacher to request object
    req.teacher = teacher;
    req.user = teacher; // For consistency with other middlewares
    
    console.log(`✅ Teacher authenticated: ${teacher.name}`);
    next();
    
  } catch (error) {
    console.error('Authentication error (authenticateTeacher middleware):', error);
    
    return res.status(500).json({
      success: false,
      message: 'Server error during teacher authentication'
    });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log('🔐 Authorization check:', {
      requiredRoles: roles,
      userRole: req.user?.role,
      userName: req.user?.name,
      userId: req.user?.id || req.user?._id
    });

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }

    if (!req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. User role not found.'
      });
    }

    const userRole = req.user.role;
    
    if (!roles.includes(userRole)) {
      console.log(`❌ Authorization failed: User role '${userRole}' not in required roles:`, roles);
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${userRole}' is not authorized for this resource.`
      });
    }

    console.log(`✅ Authorization passed for role: ${userRole}`);
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
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Use consistent field name
        const userId = decoded.id || decoded._id;
        
        if (userId) {
          // Find user by ID
          const user = await User.findById(userId).select('+isActive +approvalStatus');
          
          // Only attach user if found, active, and approved (or admin)
          if (user && user.isActive && (user.role === 'admin' || user.approvalStatus === 'approved')) {
            req.user = user;
          }
        }
      } catch (tokenError) {
        // Continue without authentication for optional routes
        console.warn('Optional authentication failed:', tokenError.message);
      }
    }

    next();

  } catch (error) {
    // Continue without authentication if token processing fails for optional routes
    console.warn('Optional authentication processing failed but continuing:', error.message);
    next();
  }
};

// Middleware to check if user owns the resource or is admin
exports.checkOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin can access everything
      if (req.user.role === 'admin') {
        return next();
      }

      // Check if user owns the resource
      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (resourceUserId && req.user.id.toString() !== resourceUserId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during ownership verification'
      });
    }
  };
};

// Middleware to validate MongoDB ObjectId
exports.validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`
      });
    }

    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }

    next();
  };
};

// Middleware to log authentication attempts
exports.logAuthAttempt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const hasToken = authHeader && authHeader.startsWith('Bearer');
  
  console.log(`🔑 Auth attempt: ${req.method} ${req.originalUrl}`, {
    hasToken,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent']
  });

  next();
};