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
const appointmentRoutes = require('./routes/appointmentRoute');
const messageRoutes = require('./routes/messageRoutes');

// Import database connection
const connectDB = require('./config/db');

// Import models
const Message = require('./models/Message');
const User = require('./models/User');
const Teacher = require('./models/Teacher');

const app = express();

// Create HTTP server and Socket.io instance
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware: Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for Socket.IO
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased for socket connections
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  skip: (req) => {
    // Skip rate limiting for socket.io requests
    return req.url.startsWith('/socket.io/');
  }
});
app.use(limiter);

const allowedOrigins = [
  'http://localhost:3000',
  'https://edumeet-1.onrender.com', // Your deployed frontend URL
  'https://edumeet.onrender.com',   // Alternative if you have this too
  // Add your actual deployed frontend URL here if different
];

// Socket.io setup with CORS - UPDATED
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  // Add these options for better production support
  pingTimeout: 60000,
  pingInterval: 25000,
});

// CORS Middleware - UPDATED with better production handling
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('[CORS] No origin - allowing request (Postman or same-origin)');
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log(`[CORS] Origin allowed: ${origin}`);
      return callback(null, true);
    } else {
      console.error(`[CORS] Blocked origin: ${origin}`);
      // In production, you might want to be more lenient during debugging
      if (process.env.NODE_ENV === 'production') {
        // Log the blocked origin but still allow it for debugging
        console.warn(`[CORS] WARNING: Allowing blocked origin in production for debugging: ${origin}`);
        return callback(null, true);
      }
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
    'Access-Control-Allow-Origin'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
}));

// Request logging middleware
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'No Origin'}`);
  }
  next();
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logger (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORRECTED Socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      console.log('❌ Socket connection rejected: No token provided');
      return next(new Error('No token provided'));
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Socket token decoded:', { id: decoded.id, role: decoded.role });
    
    // Attach basic user info from token
    socket.userId = decoded.id;
    socket.userRole = decoded.role || 'student';
    
    // Fetch user details from database based on role
    let user;
    try {
      if (socket.userRole === 'teacher') {
        user = await Teacher.findById(decoded.id).select('name email isActive hasAccount');
        
        // Additional check for teacher account status
        if (user && (!user.hasAccount || !user.isActive)) {
          console.log('❌ Socket connection rejected: Teacher account not properly set up');
          return next(new Error('Teacher account not properly set up'));
        }
      } else {
        // For students and other users
        user = await User.findById(decoded.id).select('name email isActive approvalStatus');
        
        // Check user status
        if (user && (!user.isActive || user.approvalStatus !== 'approved')) {
          console.log('❌ Socket connection rejected: User not active or approved');
          return next(new Error('User account is not active or approved'));
        }
      }
      
      if (!user) {
        console.log('❌ Socket connection rejected: User not found in database');
        return next(new Error('User not found'));
      }
      
      // Attach user details to socket
      socket.userName = user.name;
      socket.userEmail = user.email;
      socket.user = user;
      
      console.log(`✅ Socket authenticated: ${socket.userName} (${socket.userRole}) - ID: ${socket.userId}`);
      next();
      
    } catch (dbError) {
      console.error('❌ Database error during socket authentication:', dbError);
      return next(new Error('Database error during authentication'));
    }
    
  } catch (error) {
    console.error('❌ Socket authentication error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    return next(new Error('Authentication failed'));
  }
});

// CORRECTED Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.userName} (${socket.userRole}) - Socket ID: ${socket.id}`);
  
  // Join a room
  socket.on('join-room', (roomId) => {
    try {
      if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }
      
      // Clean the roomId
      const cleanRoomId = roomId.trim();
      
      socket.join(cleanRoomId);
      socket.currentRoom = cleanRoomId;
      console.log(`🏠 ${socket.userName} (${socket.userRole}) joined room: ${cleanRoomId}`);
      
      // Notify others in the room
      socket.to(cleanRoomId).emit('user-joined', {
        userName: socket.userName,
        userRole: socket.userRole,
        userId: socket.userId
      });
      
      // Confirm room join to the user
      socket.emit('room-joined', { roomId: cleanRoomId });
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Leave a room
  socket.on('leave-room', (roomId) => {
    try {
      if (roomId && typeof roomId === 'string') {
        const cleanRoomId = roomId.trim();
        socket.leave(cleanRoomId);
        socket.to(cleanRoomId).emit('user-left', {
          userName: socket.userName,
          userRole: socket.userRole,
          userId: socket.userId
        });
        console.log(`🚪 ${socket.userName} left room: ${cleanRoomId}`);
        
        if (socket.currentRoom === cleanRoomId) {
          socket.currentRoom = null;
        }
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  });
  
  // Handle sending messages - CORRECTED
  socket.on('send-message', async (data) => {
    try {
      // Validate input data
      if (!data || typeof data !== 'object') {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }
      
      if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
        socket.emit('error', { message: 'Message text is required' });
        return;
      }
      
      if (!data.roomId || typeof data.roomId !== 'string' || data.roomId.trim() === '') {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      if (data.text.length > 1000) {
        socket.emit('error', { message: 'Message cannot exceed 1000 characters' });
        return;
      }
      
      // Ensure user is authenticated
      if (!socket.userName || !socket.userId) {
        socket.emit('error', { message: 'User authentication required' });
        return;
      }
      
      const cleanRoomId = data.roomId.trim();
      const cleanText = data.text.trim();
      
      console.log(`💬 Processing message from: ${socket.userName} (${socket.userRole}) in room: ${cleanRoomId}`);
      
      // Create message using the Message model's static method
      const messageData = {
        text: cleanText,
        sender: socket.userName,
        senderId: socket.userId,
        role: socket.userRole === 'teacher' ? 'teacher' : 'student',
        roomId: cleanRoomId
      };
      
      const savedMessage = await Message.createMessage(messageData);
      console.log(`✅ Message saved: ${savedMessage._id}`);
      
      // Format message for client
      const messageForClient = {
        id: savedMessage._id,
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        role: savedMessage.role,
        roomId: savedMessage.roomId,
        reactions: savedMessage.reactions,
        timestamp: savedMessage.createdAt,
        createdAt: savedMessage.createdAt,
        formattedTime: savedMessage.formattedTime,
        formattedDate: savedMessage.formattedDate
      };
      
      // Broadcast to all users in the room
      io.to(cleanRoomId).emit('new-message', messageForClient);
      console.log(`📢 Message broadcasted to room: ${cleanRoomId}`);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { 
        message: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Handle reactions (only teachers can react) - CORRECTED
  socket.on('add-reaction', async (data) => {
    try {
      // Only teachers can add reactions
      if (socket.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can add reactions' });
        return;
      }
      
      if (!data || typeof data !== 'object') {
        socket.emit('error', { message: 'Invalid reaction data' });
        return;
      }
      
      if (!data.messageId || typeof data.messageId !== 'string') {
        socket.emit('error', { message: 'Message ID is required' });
        return;
      }
      
      if (!data.reactionType || typeof data.reactionType !== 'string') {
        socket.emit('error', { message: 'Reaction type is required' });
        return;
      }
      
      const validReactions = ['heart', 'thumbs', 'star'];
      if (!validReactions.includes(data.reactionType)) {
        socket.emit('error', { message: 'Invalid reaction type. Must be: heart, thumbs, or star' });
        return;
      }
      
      console.log(`❤️ Adding reaction: ${data.reactionType} to message ${data.messageId} by ${socket.userName}`);
      
      // Use the static method from Message model
      const updatedMessage = await Message.addReactionToMessage(
        data.messageId,
        data.reactionType,
        socket.userId
      );
      
      // Format updated message for client
      const messageForClient = {
        id: updatedMessage._id,
        text: updatedMessage.text,
        sender: updatedMessage.sender,
        senderId: updatedMessage.senderId,
        role: updatedMessage.role,
        roomId: updatedMessage.roomId,
        reactions: updatedMessage.reactions,
        timestamp: updatedMessage.createdAt,
        createdAt: updatedMessage.createdAt,
        formattedTime: updatedMessage.formattedTime,
        formattedDate: updatedMessage.formattedDate
      };
      
      // Broadcast updated message to all users in the room
      io.to(updatedMessage.roomId).emit('message-updated', messageForClient);
      console.log(`✅ Reaction added and broadcasted to room: ${updatedMessage.roomId}`);
      
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to add reaction',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Handle typing indicators
  socket.on('typing-start', (data) => {
    try {
      if (data && data.roomId && typeof data.roomId === 'string') {
        const cleanRoomId = data.roomId.trim();
        if (socket.currentRoom === cleanRoomId) {
          socket.to(cleanRoomId).emit('user-typing', {
            userName: socket.userName,
            userId: socket.userId,
            userRole: socket.userRole
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling typing start:', error);
    }
  });
  
  socket.on('typing-stop', (data) => {
    try {
      if (data && data.roomId && typeof data.roomId === 'string') {
        const cleanRoomId = data.roomId.trim();
        if (socket.currentRoom === cleanRoomId) {
          socket.to(cleanRoomId).emit('user-stop-typing', {
            userName: socket.userName,
            userId: socket.userId,
            userRole: socket.userRole
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling typing stop:', error);
    }
  });
  
  // Handle message deletion - CORRECTED
  socket.on('delete-message', async (data) => {
    try {
      if (!data || !data.messageId) {
        socket.emit('error', { message: 'Message ID is required' });
        return;
      }
      
      const { messageId } = data;
      
      console.log(`🗑️ Attempting to delete message ${messageId} by ${socket.userName} (${socket.userRole})`);
      
      // Use the static method from Message model
      const deletedMessage = await Message.deleteMessage(messageId, socket.userId, socket.userRole);
      
      // Notify all users in the room
      io.to(deletedMessage.roomId).emit('message-deleted', {
        messageId: deletedMessage._id,
        roomId: deletedMessage.roomId,
        deletedBy: socket.userName
      });
      
      console.log(`✅ Message ${messageId} deleted by ${socket.userName}`);
      
    } catch (error) {
      console.error('❌ Error deleting message:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to delete message',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Handle getting room info
  socket.on('get-room-info', async (data) => {
    try {
      if (!data || !data.roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const cleanRoomId = data.roomId.trim();
      
      // Get basic room information
      const roomStats = await Message.getRoomStats(cleanRoomId);
      const totalMessages = await Message.countDocuments({ roomId: cleanRoomId, isDeleted: false });
      
      socket.emit('room-info', {
        roomId: cleanRoomId,
        totalMessages,
        stats: roomStats
      });
      
    } catch (error) {
      console.error('❌ Error getting room info:', error);
      socket.emit('error', { message: 'Failed to get room information' });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`👋 User disconnected: ${socket.userName} (${socket.userRole}) - Reason: ${reason}`);
    
    // Notify current room if user was in one
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('user-left', {
        userName: socket.userName,
        userRole: socket.userRole,
        userId: socket.userId
      });
    }
  });
  
  // Handle socket errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for user ${socket.userName}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Mount routes with proper prefixes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);

// Enhanced health check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus[dbState],
      name: mongoose.connection.name
    },
    socketIO: {
      connected: io.engine.clientsCount,
      status: 'active'
    }
  });
});

// Enhanced route listing for 404 handler
app.all('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.path} not found`,
    method: req.method,
    availableRoutes: {
      health: ['GET /api/health'],
      auth: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/profile',
        'POST /api/auth/logout',
        'GET /api/auth/verify-token'
      ],
      teachers: [
        'GET /api/teachers',
        'POST /api/teachers',
        'GET /api/teachers/:id',
        'PUT /api/teachers/:id',
        'DELETE /api/teachers/:id',
        'GET /api/teachers/stats',
        'GET /api/teachers/department/:department',
        'POST /api/teachers/login',
        'POST /api/teachers/send-setup-link',
        'POST /api/teachers/setup-account/:token',
        'GET /api/teachers/profile',
        'POST /api/teachers/logout'
      ],
      appointments: [
        'GET /api/appointments',
        'POST /api/appointments',
        'GET /api/appointments/:id',
        'PUT /api/appointments/:id',
        'DELETE /api/appointments/:id',
        'GET /api/appointments/stats',
        'POST /api/appointments/request',
        'POST /api/appointments/book',
        'PUT /api/appointments/:id/accept',
        'PUT /api/appointments/:id/reject',
        'PUT /api/appointments/:id/complete',
        'PUT /api/appointments/:id/cancel',
        'GET /api/appointments/teacher/:teacherId',
        'GET /api/appointments/teacher/:teacherId/pending'
      ],
      messages: [
        'GET /api/messages/room/:roomId',
        'POST /api/messages/room/:roomId',
        'POST /api/messages/:messageId/reaction',
        'DELETE /api/messages/:messageId',
        'GET /api/messages/room/:roomId/stats',
        'GET /api/messages/rooms',
        'GET /api/messages/room/:roomId/search',
        'GET /api/messages/my-rooms'
      ],
      admin: [
        'POST /api/admin/register',
        'POST /api/admin/login',
        'GET /api/admin/profile',
        'PUT /api/admin/profile',
        'GET /api/admin/dashboard/stats',
        'GET /api/admin/users',
        'DELETE /api/admin/users/:userId',
        'GET /api/admin/appointments',
        'PUT /api/admin/users/:id/approve',
        'PUT /api/admin/users/:id/reject'
      ]
    }
  });
});

// Enhanced global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });

  let error = { ...err };
  error.message = err.message;

  // Mongoose CastError
  if (err.name === 'CastError') {
    error = { 
      message: `Resource not found with ID: ${err.value}`, 
      statusCode: 404 
    };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = { 
      message: `Duplicate ${field}: ${value} already exists`, 
      statusCode: 400 
    };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err
    })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🔗 Available at: http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Enhanced process handlers
process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Promise Rejection: ${err.message}`);
  console.error('Closing server...');
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.message}`);
  console.error('Shutting down immediately...');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated gracefully');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Process terminated gracefully');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Export for use in other files
module.exports = { app, io, server };