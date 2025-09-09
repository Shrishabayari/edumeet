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

// FIXED: More permissive CORS origins for debugging
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', // In case you're using a different port
  'https://edumeet-1.onrender.com', // Your deployed frontend URL
  'https://edumeet.onrender.com',   // Your backend URL (for same-origin)
];

// In production, be more permissive temporarily for debugging
if (process.env.NODE_ENV === 'production') {
  // Allow all origins ending with render.com during debugging
  allowedOrigins.push(/.*\.onrender\.com$/);
}

console.log('🔗 Allowed CORS origins:', allowedOrigins);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// FIXED: Socket.io setup with more permissive CORS for production debugging
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, same-origin, etc.)
      if (!origin) return callback(null, true);
      
      // Check against allowed origins
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        }
        if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        return callback(null, true);
      }
      
      // In production, log but allow for debugging
      if (process.env.NODE_ENV === 'production') {
        console.warn(`🚨 CORS WARNING: Allowing potentially blocked origin for debugging: ${origin}`);
        return callback(null, true);
      }
      
      console.error(`❌ CORS blocked: ${origin}`);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware: Security headers (relaxed for Socket.IO)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate Limiting (more lenient for Socket.IO)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  skip: (req) => {
    return req.url.startsWith('/socket.io/') || req.url.startsWith('/api/health');
  }
});
app.use(limiter);

// FIXED: More permissive CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin
    if (!origin) {
      console.log('[CORS] No origin - allowing request');
      return callback(null, true);
    }

    // Check allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      }
      if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      console.log(`[CORS] Origin allowed: ${origin}`);
      return callback(null, true);
    }

    // In production, be more permissive for debugging
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[CORS] WARNING: Allowing blocked origin in production: ${origin}`);
      return callback(null, true);
    }

    console.error(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error(`CORS error: ${origin} not allowed`));
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

// Enhanced request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'No Origin'} - IP: ${req.ip}`);
  next();
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Logger (in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// FIXED: Enhanced Socket.io authentication middleware
io.use(async (socket, next) => {
  try {
    console.log('🔐 Socket authentication attempt');
    
    const token = socket.handshake.auth.token;
    const userRole = socket.handshake.auth.role;
    const userName = socket.handshake.auth.name;
    
    console.log('Auth data:', { 
      hasToken: !!token, 
      role: userRole, 
      name: userName,
      tokenStart: token ? token.substring(0, 20) + '...' : 'None'
    });
    
    if (!token) {
      console.log('❌ Socket auth failed: No token provided');
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('🔍 Token decoded successfully:', { 
        id: decoded.id, 
        role: decoded.role,
        exp: new Date(decoded.exp * 1000).toISOString()
      });
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return next(new Error('Authentication error: Token expired'));
      }
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Attach basic user info from token
    socket.userId = decoded.id;
    socket.userRole = decoded.role || userRole || 'student';
    
    // Fetch user details from database based on role
    let user;
    try {
      if (socket.userRole === 'teacher') {
        user = await Teacher.findById(decoded.id).select('name email isActive hasAccount');
        console.log('👨‍🏫 Teacher lookup result:', user ? 'Found' : 'Not found');
        
        if (!user) {
          console.log('❌ Teacher not found in database');
          return next(new Error('Authentication error: Teacher not found'));
        }
        
        if (!user.hasAccount || !user.isActive) {
          console.log('❌ Teacher account not properly set up:', { hasAccount: user.hasAccount, isActive: user.isActive });
          return next(new Error('Authentication error: Teacher account not properly set up'));
        }
      } else {
        // For students
        user = await User.findById(decoded.id).select('name email isActive approvalStatus');
        console.log('👨‍🎓 Student lookup result:', user ? 'Found' : 'Not found');
        
        if (!user) {
          console.log('❌ Student not found in database');
          return next(new Error('Authentication error: Student not found'));
        }
        
        if (!user.isActive) {
          console.log('❌ Student account not active');
          return next(new Error('Authentication error: Student account not active'));
        }
        
        if (user.approvalStatus !== 'approved') {
          console.log('❌ Student not approved:', user.approvalStatus);
          return next(new Error('Authentication error: Student account not approved'));
        }
      }
      
      // Attach user details to socket
      socket.userName = user.name || userName || 'Unknown User';
      socket.userEmail = user.email;
      socket.user = user;
      
      console.log(`✅ Socket authenticated successfully: ${socket.userName} (${socket.userRole}) - ID: ${socket.userId}`);
      next();
      
    } catch (dbError) {
      console.error('❌ Database error during socket authentication:', dbError);
      return next(new Error('Authentication error: Database error'));
    }
    
  } catch (error) {
    console.error('❌ Socket authentication error:', error);
    return next(new Error('Authentication failed'));
  }
});

// FIXED: Enhanced Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.userName} (${socket.userRole}) - Socket ID: ${socket.id}`);
  
  // Send connection confirmation
  socket.emit('connection-confirmed', {
    message: 'Connected successfully',
    user: {
      name: socket.userName,
      role: socket.userRole,
      id: socket.userId
    }
  });
  
  // Join a room
  socket.on('join-room', (roomId) => {
    try {
      if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
        console.log('❌ Invalid room ID:', roomId);
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }
      
      const cleanRoomId = roomId.trim();
      
      // Leave current room if any
      if (socket.currentRoom && socket.currentRoom !== cleanRoomId) {
        socket.leave(socket.currentRoom);
        console.log(`🚪 ${socket.userName} left room: ${socket.currentRoom}`);
      }
      
      socket.join(cleanRoomId);
      socket.currentRoom = cleanRoomId;
      console.log(`🏠 ${socket.userName} (${socket.userRole}) joined room: ${cleanRoomId}`);
      
      // Notify others in the room
      socket.to(cleanRoomId).emit('user-joined', {
        userName: socket.userName,
        userRole: socket.userRole,
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
      
      // Confirm room join to the user
      socket.emit('room-joined', { 
        roomId: cleanRoomId,
        message: `Successfully joined ${cleanRoomId}`,
        timestamp: new Date().toISOString()
      });
      
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
          userId: socket.userId,
          timestamp: new Date().toISOString()
        });
        console.log(`🚪 ${socket.userName} left room: ${cleanRoomId}`);
        
        if (socket.currentRoom === cleanRoomId) {
          socket.currentRoom = null;
        }
        
        socket.emit('room-left', { roomId: cleanRoomId });
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  });
  
  // FIXED: Enhanced message sending with better validation
  socket.on('send-message', async (data) => {
    try {
      console.log(`💬 Message attempt from ${socket.userName} (${socket.userRole}):`, data);
      
      // Validate input data
      if (!data || typeof data !== 'object') {
        console.log('❌ Invalid message data structure');
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }
      
      if (!data.text || typeof data.text !== 'string' || data.text.trim().length === 0) {
        console.log('❌ Empty or invalid message text');
        socket.emit('error', { message: 'Message text is required' });
        return;
      }
      
      if (!data.roomId || typeof data.roomId !== 'string' || data.roomId.trim() === '') {
        console.log('❌ Invalid room ID');
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      if (data.text.length > 1000) {
        console.log('❌ Message too long');
        socket.emit('error', { message: 'Message cannot exceed 1000 characters' });
        return;
      }
      
      // Ensure user is authenticated
      if (!socket.userName || !socket.userId) {
        console.log('❌ User not properly authenticated');
        socket.emit('error', { message: 'User authentication required' });
        return;
      }
      
      const cleanRoomId = data.roomId.trim();
      const cleanText = data.text.trim();
      
      console.log(`📝 Processing valid message from: ${socket.userName} in room: ${cleanRoomId}`);
      
      // Create message using the Message model's static method
      const messageData = {
        text: cleanText,
        sender: socket.userName,
        senderId: socket.userId,
        role: socket.userRole === 'teacher' ? 'teacher' : 'student',
        roomId: cleanRoomId
      };
      
      const savedMessage = await Message.createMessage(messageData);
      console.log(`✅ Message saved with ID: ${savedMessage._id}`);
      
      // Format message for client
      const messageForClient = {
        id: savedMessage._id,
        _id: savedMessage._id, // Include both for compatibility
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        role: savedMessage.role,
        roomId: savedMessage.roomId,
        reactions: savedMessage.reactions,
        timestamp: savedMessage.createdAt,
        createdAt: savedMessage.createdAt
      };
      
      // Broadcast to all users in the room (including sender)
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
  
  // FIXED: Enhanced reaction handling
  socket.on('add-reaction', async (data) => {
    try {
      console.log(`❤️ Reaction attempt from ${socket.userName} (${socket.userRole}):`, data);
      
      // Only teachers can add reactions
      if (socket.userRole !== 'teacher') {
        console.log('❌ Non-teacher trying to add reaction');
        socket.emit('error', { message: 'Only teachers can add reactions' });
        return;
      }
      
      if (!data || typeof data !== 'object') {
        console.log('❌ Invalid reaction data');
        socket.emit('error', { message: 'Invalid reaction data' });
        return;
      }
      
      if (!data.messageId || typeof data.messageId !== 'string') {
        console.log('❌ Invalid message ID');
        socket.emit('error', { message: 'Message ID is required' });
        return;
      }
      
      if (!data.reactionType || typeof data.reactionType !== 'string') {
        console.log('❌ Invalid reaction type');
        socket.emit('error', { message: 'Reaction type is required' });
        return;
      }
      
      const validReactions = ['heart', 'thumbs', 'star'];
      if (!validReactions.includes(data.reactionType)) {
        console.log('❌ Invalid reaction type:', data.reactionType);
        socket.emit('error', { message: 'Invalid reaction type. Must be: heart, thumbs, or star' });
        return;
      }
      
      console.log(`➕ Adding reaction: ${data.reactionType} to message ${data.messageId}`);
      
      // Use the static method from Message model
      const updatedMessage = await Message.addReactionToMessage(
        data.messageId,
        data.reactionType,
        socket.userId
      );
      
      console.log(`✅ Reaction added to message: ${updatedMessage._id}`);
      
      // Format updated message for client
      const messageForClient = {
        id: updatedMessage._id,
        _id: updatedMessage._id,
        text: updatedMessage.text,
        sender: updatedMessage.sender,
        senderId: updatedMessage.senderId,
        role: updatedMessage.role,
        roomId: updatedMessage.roomId,
        reactions: updatedMessage.reactions,
        timestamp: updatedMessage.createdAt,
        createdAt: updatedMessage.createdAt
      };
      
      // Broadcast updated message to all users in the room
      io.to(updatedMessage.roomId).emit('message-updated', messageForClient);
      console.log(`📢 Reaction broadcasted to room: ${updatedMessage.roomId}`);
      
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to add reaction',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
  
  // Enhanced typing indicators
  socket.on('typing-start', (data) => {
    try {
      if (data && data.roomId && typeof data.roomId === 'string') {
        const cleanRoomId = data.roomId.trim();
        if (socket.currentRoom === cleanRoomId) {
          socket.to(cleanRoomId).emit('user-typing', {
            userName: socket.userName,
            userId: socket.userId,
            userRole: socket.userRole,
            timestamp: new Date().toISOString()
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
            userRole: socket.userRole,
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling typing stop:', error);
    }
  });
  
  // Get room info
  socket.on('get-room-info', async (data) => {
    try {
      if (!data || !data.roomId) {
        socket.emit('error', { message: 'Room ID is required' });
        return;
      }
      
      const cleanRoomId = data.roomId.trim();
      console.log(`📊 Getting room info for: ${cleanRoomId}`);
      
      const roomStats = await Message.getRoomStats(cleanRoomId);
      const totalMessages = await Message.countDocuments({ roomId: cleanRoomId, isDeleted: false });
      
      socket.emit('room-info', {
        roomId: cleanRoomId,
        totalMessages,
        stats: roomStats,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error getting room info:', error);
      socket.emit('error', { message: 'Failed to get room information' });
    }
  });
  
  // Ping-pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: new Date().toISOString() });
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.userName} (${socket.userRole}) - Reason: ${reason}`);
    
    // Notify current room if user was in one
    if (socket.currentRoom) {
      socket.to(socket.currentRoom).emit('user-left', {
        userName: socket.userName,
        userRole: socket.userRole,
        userId: socket.userId,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Handle socket errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.userName}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Enhanced health check with Socket.IO status
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
    message: 'EduMeet Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStatus[dbState],
      name: mongoose.connection.name || 'Unknown'
    },
    socketIO: {
      connected: io.engine.clientsCount || 0,
      status: 'active'
    },
    cors: {
      allowedOrigins: allowedOrigins,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Mount routes with proper prefixes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);

// Enhanced 404 handler
app.all('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.path} not found`,
    method: req.method,
    availableEndpoints: {
      health: 'GET /api/health',
      auth: 'POST /api/auth/login, POST /api/auth/register',
      messages: 'GET /api/messages/room/:roomId',
      socketIO: 'WebSocket connection available'
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

  // Handle specific error types
  if (err.name === 'CastError') {
    error = { message: `Resource not found`, statusCode: 404 };
  }
  
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)?.[0] || 'field';
    error = { message: `Duplicate ${field} value`, statusCode: 400 };
  }
  
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }
  
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  }
  
  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err
    })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EduMeet Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 Server listening on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Socket.IO ready for connections`);
  console.log(`🌍 CORS origins:`, allowedOrigins);
});

// Enhanced graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`📴 ${signal} received. Starting graceful shutdown...`);
  
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    
    console.log('✅ HTTP server closed');
    
    mongoose.connection.close(false, (err) => {
      if (err) {
        console.error('❌ Error closing MongoDB connection:', err);
        process.exit(1);
      }
      
      console.log('✅ MongoDB connection closed');
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Process handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (err, promise) => {
  console.error(`❌ Unhandled Promise Rejection:`, err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception:`, err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

module.exports = { app, io, server };