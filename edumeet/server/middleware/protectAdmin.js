// middleware/protectAdmin.js
import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler'; // Ensure you have this installed: npm install express-async-handler
import Admin from '../models/Admin.js'; // Adjust path if necessary

/**
 * Middleware to protect admin routes.
 * Verifies JWT from header and attaches admin data to request (req.admin).
 */
export const protectAdmin = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token using the same JWT_SECRET (or a different one if admins have a separate secret)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find the admin by ID from the decoded token payload
      // Ensure your JWT payload for admin login includes an 'id' field corresponding to Admin._id
      req.admin = await Admin.findById(decoded.id).select('-password');

      if (!req.admin) {
        res.status(401);
        throw new Error('Not authorized, admin not found');
      }

      console.log('Admin Auth middleware - Admin authenticated:', {
        id: req.admin._id.toString(),
        email: req.admin.email,
        route: req.path
      });

      next(); // Proceed to the next middleware/controller
    } catch (error) {
      console.error('Admin authentication error:', error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
});