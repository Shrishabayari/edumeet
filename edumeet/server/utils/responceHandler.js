// utils/responseHandler.js - Centralized response and error handling utilities

/**
 * Standardized API response utility
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - Success flag
 * @param {string} message - Response message
 * @param {Object|Array} data - Response data (optional)
 * @param {Array} errors - Validation or other errors (optional)
 * @param {Object} meta - Metadata like pagination info (optional)
 */
const sendResponse = (res, statusCode, success, message, data = null, errors = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || res.req?.id || 'unknown'
  };

  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  if (meta !== null) response.meta = meta;

  return res.status(statusCode).json(response);
};

/**
 * Handle validation errors from express-validator
 * @param {Object} req - Express request object
 * @returns {Object} - Object with hasErrors flag and formatted errors
 */
const handleValidationErrors = (req) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return {
      hasErrors: true,
      errors: errors.array().map(error => ({
        field: error.param || error.path,
        message: error.msg,
        value: error.value,
        location: error.location
      }))
    };
  }
  
  return { hasErrors: false };
};

/**
 * Handle async route errors - wrapper function
 * @param {Function} fn - Async route handler function
 * @returns {Function} - Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom Error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle different types of errors and format them consistently
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @returns {Object} - Formatted error object
 */
const formatError = (err, req) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose CastError - Invalid ObjectId
  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}`;
    error = new AppError(message, 400);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    const message = `Duplicate ${field}: ${value} already exists`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map(val => val.message)
      .join(', ') || 'Validation failed';
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token expired', 401);
  }

  // MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    error = new AppError('Database connection error. Please try again later.', 503);
  }

  // Rate limiting errors
  if (err.message && err.message.includes('Too many requests')) {
    error = new AppError('Too many requests. Please try again later.', 429);
  }

  return {
    statusCode: error.statusCode || 500,
    message: error.message || 'Internal Server Error',
    isOperational: error.isOperational || false,
    timestamp: error.timestamp || new Date().toISOString(),
    requestId: req.id || 'unknown',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      originalError: err.name
    })
  };
};

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const globalErrorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('[Global Error Handler]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    userId: req.user?.id || 'unauthenticated'
  });

  const formattedError = formatError(err, req);
  
  return sendResponse(
    res,
    formattedError.statusCode,
    false,
    formattedError.message,
    null,
    process.env.NODE_ENV === 'development' ? [{
      stack: formattedError.stack,
      originalError: formattedError.originalError
    }] : null,
    {
      requestId: formattedError.requestId,
      timestamp: formattedError.timestamp
    }
  );
};

/**
 * 404 handler for routes not found
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  
  const suggestions = [];
  const path = req.path.toLowerCase();
  
  if (path.includes('appointment')) {
    suggestions.push('Did you mean /api/appointments?');
  }
  if (path.includes('teacher')) {
    suggestions.push('Did you mean /api/teachers?');
  }
  if (path.includes('auth')) {
    suggestions.push('Did you mean /api/auth?');
  }
  if (path.includes('admin')) {
    suggestions.push('Did you mean /api/admin?');
  }
  
  return sendResponse(
    res,
    404,
    false,
    `Route ${req.path} not found`,
    null,
    null,
    {
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      suggestions: suggestions.length > 0 ? suggestions : ['Check API documentation for available endpoints'],
      availableEndpoints: [
        'GET /api/health - Server health check',
        'POST /api/auth/login - User authentication',
        'GET /api/appointments - List appointments',
        'GET /api/teachers - List teachers'
      ]
    }
  );
};

/**
 * Success response helpers for common scenarios
 */
const successResponses = {
  // Authentication responses
  loginSuccess: (res, data) => 
    sendResponse(res, 200, true, 'Login successful', data),
  
  registrationSuccess: (res, data) => 
    sendResponse(res, 201, true, 'Registration successful. Please wait for admin approval.', data),
  
  logoutSuccess: (res) => 
    sendResponse(res, 200, true, 'Logout successful'),
  
  // CRUD responses
  created: (res, resource, data) => 
    sendResponse(res, 201, true, `${resource} created successfully`, data),
  
  updated: (res, resource, data) => 
    sendResponse(res, 200, true, `${resource} updated successfully`, data),
  
  deleted: (res, resource) => 
    sendResponse(res, 200, true, `${resource} deleted successfully`),
  
  retrieved: (res, resource, data, meta = null) => 
    sendResponse(res, 200, true, `${resource} retrieved successfully`, data, null, meta),
  
  // Admin responses
  approved: (res, data) => 
    sendResponse(res, 200, true, 'User approved successfully', data),
  
  rejected: (res, data) => 
    sendResponse(res, 200, true, 'User rejected successfully', data)
};

/**
 * Error response helpers for common scenarios
 */
const errorResponses = {
  // Authentication errors
  invalidCredentials: (res) => 
    sendResponse(res, 401, false, 'Invalid credentials'),
  
  unauthorized: (res, message = 'Access denied. Authentication required.') => 
    sendResponse(res, 401, false, message),
  
  forbidden: (res, message = 'Access denied. Insufficient permissions.') => 
    sendResponse(res, 403, false, message),
  
  tokenExpired: (res) => 
    sendResponse(res, 401, false, 'Authentication token has expired'),
  
  // Validation errors
  validationFailed: (res, errors) => 
    sendResponse(res, 400, false, 'Validation failed', null, errors),
  
  // Resource errors
  notFound: (res, resource) => 
    sendResponse(res, 404, false, `${resource} not found`),
  
  alreadyExists: (res, resource) => 
    sendResponse(res, 400, false, `${resource} already exists`),
  
  // Server errors
  serverError: (res, message = 'Internal server error') => 
    sendResponse(res, 500, false, message),
  
  databaseError: (res) => 
    sendResponse(res, 503, false, 'Database connection error. Please try again later.'),
  
  // Rate limiting
  tooManyRequests: (res) => 
    sendResponse(res, 429, false, 'Too many requests. Please try again later.')
};

module.exports = {
  sendResponse,
  handleValidationErrors,
  asyncHandler,
  AppError,
  formatError,
  globalErrorHandler,
  notFoundHandler,
  successResponses,
  errorResponses
};