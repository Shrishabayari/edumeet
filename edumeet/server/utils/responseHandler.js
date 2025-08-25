// utils/responseHandler.js - FIXED SPELLING AND ENHANCED
const sendResponse = (res, statusCode, success, message, data = null, errors = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString(),
    requestId: res.locals?.requestId
  };

  // Add data if provided
  if (data !== null) {
    response.data = data;
  }

  // Add errors if provided
  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Add metadata if provided (pagination, etc.)
  if (meta !== null) {
    response.meta = meta;
  }

  // Log errors in development
  if (!success && process.env.NODE_ENV === 'development') {
    console.error(`[${statusCode}] ${message}`, errors || '');
  }

  return res.status(statusCode).json(response);
};

// Global error handler
const globalErrorHandler = (err, req, res, next) => {
  console.error('Global Error Handler:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    requestId: req.id
  });

  // Default error
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = { message, statusCode: 400 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate ${field} value`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map(val => ({
      field: val.path,
      message: val.message,
      value: val.value
    }));
    return sendResponse(res, 400, false, 'Validation Error', null, errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendResponse(res, 401, false, 'Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    return sendResponse(res, 401, false, 'Token expired');
  }

  // Rate limit error
  if (err.status === 429) {
    return sendResponse(res, 429, false, 'Too many requests, please try again later');
  }

  return sendResponse(
    res, 
    error.statusCode || 500, 
    false, 
    error.message || 'Internal Server Error',
    null,
    process.env.NODE_ENV === 'development' ? [{ message: err.stack }] : null
  );
};

// 404 handler
const notFoundHandler = (req, res) => {
  return sendResponse(
    res, 
    404, 
    false, 
    `Route ${req.originalUrl} not found`,
    null,
    null,
    {
      method: req.method,
      url: req.originalUrl,
      availableRoutes: [
        'GET /api/health - Health check',
        'POST /api/auth/login - User login', 
        'POST /api/auth/register - User registration',
        'GET /api/teachers - Get all teachers',
        'GET /api/appointments - Get appointments'
      ]
    }
  );
};

// Success response helper
const sendSuccess = (res, message, data = null, meta = null) => {
  return sendResponse(res, 200, true, message, data, null, meta);
};

// Error response helper  
const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  return sendResponse(res, statusCode, false, message, null, errors);
};

// Created response helper
const sendCreated = (res, message, data = null) => {
  return sendResponse(res, 201, true, message, data);
};

module.exports = {
  sendResponse,
  sendSuccess,
  sendError,
  sendCreated,
  globalErrorHandler,
  notFoundHandler
};