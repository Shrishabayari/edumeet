// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin'); // Add Admin model

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route - No token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Try to find user first, then admin
      let user = await User.findById(decoded.id);
      let userType = 'user';
      
      if (!user) {
        // If not found in User collection, try Admin collection
        user = await Admin.findById(decoded.id);
        userType = 'admin';
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'No user found with this token'
        });
      }

      // Check if user is active (only for regular users, not admins)
      if (userType === 'user' && user.isActive !== undefined && !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Add user and userType to request object
      req.user = user;
      req.userType = userType;
      next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid token - Not authorized to access this route'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Authorize specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Check if user has role property or if it's an admin
    const userRole = req.user.role || (req.userType === 'admin' ? 'admin' : 'user');

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `User role '${userRole}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is admin
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  // Check if it's an admin from Admin collection or user with admin role
  const isAdmin = req.userType === 'admin' || req.user.role === 'admin';
  
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Check if user is teacher or admin
const teacherOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  const userRole = req.user.role || (req.userType === 'admin' ? 'admin' : 'user');
  
  if (!['teacher', 'admin'].includes(userRole)) {
    return res.status(403).json({
      success: false,
      message: 'Teacher or admin access required'
    });
  }
  next();
};

// Check if user owns the resource or is admin
const ownerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  const isAdmin = req.userType === 'admin' || req.user.role === 'admin';
  const isOwner = req.user._id.toString() === req.params.userId;

  if (isAdmin || isOwner) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied: You can only access your own resources'
  });
};

// Additional middleware for admin-specific routes
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find admin
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid admin token'
    });
  }
};

module.exports = {
  protect,
  authorize,
  adminOnly,
  teacherOrAdmin,
  ownerOrAdmin,
  protectAdmin
};