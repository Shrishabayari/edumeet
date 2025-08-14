require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Import database connection
const connectDB = require('./config/db');

// Import models
const Message = require('./models/Message');
const User = require('./models/User');
const Admin = require('./models/Admin');

const app = express();

// Create HTTP server and Socket.io instance
const server = http.createServer(app);

// Connect to MongoDB with error handling
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting with different limits for different routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for socket.io requests and health checks
    return req.url.startsWith('/socket.io/') || req.url === '/api/health';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use(generalLimiter);

// Allowed Origins with environment variable support
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://edumeet-1.onrender.com',
  'https://edumeet.onrender.com',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

// Socket.io setup with enhanced CORS and error handling
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Enhanced CORS middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('[CORS] No origin - allowing request');
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Origin allowed: ${origin}`);
      return callback(null, true);
    } else {
      console.error(`[CORS] Blocked origin: ${origin}`);
      return callback(new Error(`CORS error: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Request logging middleware with better formatting
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`, {
      origin: req.headers.origin || 'No Origin',
      userAgent: req.headers['user-agent']?.substring(0, 50) + '...' || 'No User Agent'
    });
  }
  next();
});

// Body parsers with enhanced limits and error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON format'
      });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 20
}));

app.use(cookieParser());

// Enhanced logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('combined'));
}

// Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const cleanToken = token.replace('Bearer ', '');
    
    let decoded;
    try {
      decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    } catch (tokenError) {
      return next(new Error('Invalid or expired token'));
    }
    
    const userId = decoded.id || decoded._id;
    if (!userId) {
      return next(new Error('Invalid token structure'));
    }
    
    socket.userId = userId;
    socket.userRole = decoded.role || 'student';
    
    let user;
    if (decoded.role === 'admin') {
      user = await Admin.findById(userId).select('name email isActive');
    } else {
      user = await User.findById(userId).select('name email isActive approvalStatus role');
    }
    
    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }
    
    if (decoded.role !== 'admin' && user.approvalStatus !== 'approved') {
      return next(new Error('Account not approved'));
    }
    
    socket.userName = user.name;
    socket.user = user;
    
    console.log(`✅ Socket authenticated: ${socket.userName} (${socket.userRole})`);
    next();
    
  } catch (error) {
    console.error('❌ Socket auth error:', error.message);
    return next(new Error('Authentication failed'));
  }
});

// Enhanced Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.userName} (${socket.userRole}) - Socket ID: ${socket.id}`);
  
  // Store connected users
  socket.on('user-online', () => {
    socket.broadcast.emit('user-status', {
      userId: socket.userId,
      userName: socket.userName,
      status: 'online'
    });
  });
  
  // Enhanced room management
  socket.on('join-room', (data) => {
    try {
      const { roomId, roomType = 'general' } = data;
      
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }
      
      // Leave current room if in one
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
        socket.to(socket.currentRoom).emit('user-left', {
          userName: socket.userName,
          userId: socket.userId
        });
      }
      
      socket.join(roomId);
      socket.currentRoom = roomId;
      socket.roomType = roomType;
      
      console.log(`🏠 ${socket.userName} joined room: ${roomId} (${roomType})`);
      
      // Notify others in the room
      socket.to(roomId).emit('user-joined', {
        userName: socket.userName,
        userRole: socket.userRole,
        userId: socket.userId
      });
      
      // Confirm room join to the user
      socket.emit('room-joined', { roomId, roomType });
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Enhanced message handling
  socket.on('send-message', async (data) => {
    try {
      // Comprehensive input validation
      if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
        socket.emit('message-error', { message: 'Message text is required' });
        return;
      }
      
      if (!data.roomId || typeof data.roomId !== 'string') {
        socket.emit('message-error', { message: 'Room ID is required' });
        return;
      }
      
      if (data.text.length > 1000) {
        socket.emit('message-error', { message: 'Message too long (max 1000 characters)' });
        return;
      }
      
      // Ensure user is authenticated and in the room
      if (!socket.userName || !socket.userId) {
        socket.emit('message-error', { message: 'Authentication required' });
        return;
      }
      
      if (socket.currentRoom !== data.roomId) {
        socket.emit('message-error', { message: 'You must join the room first' });
        return;
      }
      
      console.log(`💬 Processing message from: ${socket.userName} in room: ${data.roomId}`);
      
      // Create message
      const messageData = {
        text: data.text.trim(),
        sender: socket.userName,
        senderId: socket.userId,
        role: socket.userRole,
        roomId: data.roomId,
        messageType: data.messageType || 'text'
      };
      
      const savedMessage = await Message.create(messageData);
      console.log(`✅ Message saved: ${savedMessage._id}`);
      
      // Format message for client
      const messageForClient = {
        id: savedMessage._id,
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        role: savedMessage.role,
        roomId: savedMessage.roomId,
        messageType: savedMessage.messageType,
        reactions: savedMessage.reactions || [],
        timestamp: savedMessage.createdAt,
        createdAt: savedMessage.createdAt
      };
      
      // Broadcast to all users in the room
      io.to(data.roomId).emit('new-message', messageForClient);
      console.log(`📢 Message broadcasted to room: ${data.roomId}`);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('message-error', { 
        message: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Enhanced typing indicators with throttling
  let typingTimeout;
  socket.on('typing-start', (data) => {
    try {
      if (data.roomId && socket.currentRoom === data.roomId) {
        clearTimeout(typingTimeout);
        socket.to(data.roomId).emit('user-typing', {
          userName: socket.userName,
          userId: socket.userId
        });
        
        // Auto-stop typing after 3 seconds
        typingTimeout = setTimeout(() => {
          socket.to(data.roomId).emit('user-stop-typing', {
            userName: socket.userName,
            userId: socket.userId
          });
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error handling typing start:', error);
    }
  });
  
  socket.on('typing-stop', (data) => {
    try {
      clearTimeout(typingTimeout);
      if (data.roomId && socket.currentRoom === data.roomId) {
        socket.to(data.roomId).emit('user-stop-typing', {
          userName: socket.userName,
          userId: socket.userId
        });
      }
    } catch (error) {
      console.error('❌ Error handling typing stop:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`👋 User disconnected: ${socket.userName} - Reason: ${reason}`);
    
    clearTimeout(typingTimeout);
    
    // Notify current room if user was in one
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('user-left', {
        userName: socket.userName,
        userRole: socket.userRole,
        userId: socket.userId
      });
    }
    
    // Broadcast user offline status
    socket.broadcast.emit('user-status', {
      userId: socket.userId,
      userName: socket.userName,
      status: 'offline'
    });
  });
  
  // Handle socket errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for user ${socket.userName}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Request ID middleware for better debugging
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Mount routes with proper error handling
app.use('/api/auth', (req, res, next) => {
  console.log(`🔐 Auth route accessed: ${req.method} ${req.originalUrl}`);
  next();
}, authRoutes);

app.use('/api/admin', (req, res, next) => {
  console.log(`👑 Admin route accessed: ${req.method} ${req.originalUrl}`);
  next();
}, adminRoutes);

app.use('/api/teachers', (req, res, next) => {
  console.log(`👨‍🏫 Teacher route accessed: ${req.method} ${req.originalUrl}`);
  next();
}, teacherRoutes);

app.use('/api/appointments', (req, res, next) => {
  console.log(`📅 Appointment route accessed: ${req.method} ${req.originalUrl}`);
  next();
}, appointmentRoutes);

app.use('/api/messages', (req, res, next) => {
  console.log(`💬 Message route accessed: ${req.method} ${req.originalUrl}`);
  next();
}, messageRoutes);

// Enhanced health check with dependency status
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  // Check if JWT secret is configured
  const jwtConfigured = !!process.env.JWT_SECRET;
  
  // Get basic stats
  let stats = {};
  try {
    const userCount = await User.countDocuments();
    const adminCount = await Admin.countDocuments();
    stats = { users: userCount, admins: adminCount };
  } catch (error) {
    console.error('Health check stats error:', error);
    stats = { error: 'Unable to fetch stats' };
  }

  const healthData = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    database: {
      status: dbStatus[dbState],
      name: mongoose.connection.name || 'unknown'
    },
    socketIO: {
      connected: io.engine.clientsCount,
      status: 'active'
    },
    configuration: {
      jwtConfigured,
      corsOrigins: allowedOrigins.length
    },
    stats
  };

  const statusCode = dbState === 1 ? 200 : 503;
  res.status(statusCode).json(healthData);
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'EduMeet API Documentation',
    version: '1.0.0',
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new user',
        'POST /api/auth/login': 'User login',
        'GET /api/auth/profile': 'Get user profile',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/verify-token': 'Verify JWT token'
      },
      appointments: {
        'GET /api/appointments': 'Get all appointments',
        'POST /api/appointments/request': 'Student request appointment',
        'POST /api/appointments/book': 'Teacher book appointment directly',
        'PUT /api/appointments/:id/accept': 'Teacher accept request',
        'PUT /api/appointments/:id/reject': 'Teacher reject request',
        'PUT /api/appointments/:id/complete': 'Mark appointment complete',
        'PUT /api/appointments/:id/cancel': 'Cancel appointment',
        'GET /api/appointments/teacher/:teacherId': 'Get teacher appointments',
        'GET /api/appointments/stats': 'Get appointment statistics'
      },
      teachers: {
        'GET /api/teachers': 'Get all teachers',
        'GET /api/teachers/:id': 'Get teacher by ID',
        'POST /api/teachers': 'Create new teacher',
        'PUT /api/teachers/:id': 'Update teacher',
        'DELETE /api/teachers/:id': 'Delete teacher'
      },
      admin: {
        'POST /api/admin/login': 'Admin login',
        'GET /api/admin/dashboard/stats': 'Dashboard statistics',
        'GET /api/admin/users': 'Get all users',
        'PUT /api/admin/users/:id/approve': 'Approve user',
        'PUT /api/admin/users/:id/reject': 'Reject user'
      },
      messages: {
        'GET /api/messages/room/:roomId': 'Get room messages',
        'DELETE /api/messages/:messageId': 'Delete message',
        'GET /api/messages/room/:roomId/stats': 'Get room statistics'
      }
    },
    websocket: {
      events: {
        'join-room': 'Join a chat room',
        'send-message': 'Send a message',
        'typing-start': 'Start typing indicator',
        'typing-stop': 'Stop typing indicator'
      }
    }
  });
});

// Enhanced 404 handler with helpful information
app.all('*', (req, res) => {
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
  
  res.status(404).json({
    success: false,
    message: `Route ${req.path} not found`,
    method: req.method,
    timestamp: new Date().toISOString(),
    requestId: req.id,
    suggestions: suggestions.length > 0 ? suggestions : ['Check /api/docs for available endpoints'],
    availableEndpoints: [
      'GET /api/health - Server health check',
      'GET /api/docs - API documentation',
      'POST /api/auth/login - User authentication',
      'GET /api/appointments - List appointments',
      'GET /api/teachers - List teachers'
    ]
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });

  let error = { ...err };
  error.message = err.message;

  // Mongoose CastError
  if (err.name === 'CastError') {
    error = { 
      message: `Invalid ${err.path}: ${err.value}`, 
      statusCode: 400 
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'unknown';
    error = { 
      message: `Duplicate ${field}: ${value} already exists`, 
      statusCode: 400 
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {}).map(val => val.message).join(', ');
    error = { message: message || 'Validation failed', statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid authentication token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Authentication token expired', statusCode: 401 };
  }

  // MongoDB connection errors
  if (err.name === 'MongooseError') {
    error = { message: 'Database operation failed', statusCode: 500 };
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    error = { message: 'CORS policy violation', statusCode: 403 };
  }

  const statusCode = error.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(statusCode).json({
    success: false,
    message: error.message || 'Internal Server Error',
    requestId: req.id,
    timestamp: new Date().toISOString(),
    ...(isDevelopment && { 
      stack: err.stack,
      originalError: err.name
    })
  });
});

// Server startup
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 EduMeet Server Started Successfully!');
  console.log('='.repeat(50));
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Server URL: http://${HOST}:${PORT}`);
  console.log(`📊 Health Check: http://${HOST}:${PORT}/api/health`);
  console.log(`📚 API Docs: http://${HOST}:${PORT}/api/docs`);
  console.log(`📡 Socket.IO: Ready for connections`);
  console.log(`🗄️ Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log(`🔐 CORS Origins: ${allowedOrigins.length} configured`);
  console.log('='.repeat(50) + '\n');
});

// Enhanced process handlers with graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n📴 ${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      return process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    // Close Socket.IO
    io.close(() => {
      console.log('✅ Socket.IO server closed');
      
      // Close database connection
      mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        console.log('🎯 Graceful shutdown completed');
        process.exit(0);
      });
    });
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after 30 seconds');
    process.exit(1);
  }, 30000);
};

// Error handlers
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Promise Rejection: ${err.message}`);
  console.error('Stack:', err.stack);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  console.error('Stack:', err.stack);
  console.error('Shutting down immediately...');
  process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle warnings
process.on('warning', (warning) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Warning:', warning.name, warning.message);
  }
});

// Export for testing
module.exports = { app, io, server };