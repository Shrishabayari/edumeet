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

// Import Message model
const Message = require('./models/Message');

const app = express();

// Create HTTP server and Socket.io instance
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware: Security headers
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
app.use(limiter);

// Allowed Origins
const allowedOrigins = [
  'http://localhost:3000',
  'https://edumeet-1.onrender.com',
  'https://edumeet.onrender.com'
];

// Socket.io setup with CORS
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// CORS Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      console.log('[CORS] No origin - allowing request (Postman or same-origin)');
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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

// Optional: Log every request's method and origin
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl} - Origin: ${req.headers.origin || 'No Origin'}`);
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

// Socket.io middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('No token provided'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role; // 'student' or 'teacher'
    socket.userName = decoded.name;
    next();
  } catch (err) {
    console.error('Socket authentication error:', err);
    return next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userName} (${socket.userRole})`);
  
  // Join a room (could be based on class, subject, etc.)
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`${socket.userName} joined room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', {
      userName: socket.userName,
      userRole: socket.userRole,
      userId: socket.userId
    });
  });
  
  // Handle new messages
  socket.on('send-message', async (data) => {
    try {
      const messageData = {
        text: data.text,
        sender: socket.userName,
        senderId: socket.userId,
        senderModel: socket.userRole === 'teacher' ? 'Teacher' : 'User',
        role: socket.userRole,
        roomId: data.roomId,
        reactions: {
          heart: 0,
          thumbs: 0,
          star: 0
        }
      };
      
      // Save to database
      const savedMessage = await Message.create(messageData);
      
      // Convert to plain object and add id for frontend compatibility
      const messageForClient = {
        id: savedMessage._id,
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        role: savedMessage.role,
        timestamp: savedMessage.createdAt,
        roomId: savedMessage.roomId,
        reactions: savedMessage.reactions
      };
      
      // Broadcast to all users in the room
      io.to(data.roomId).emit('new-message', messageForClient);
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle reactions (only teachers can react)
  socket.on('add-reaction', async (data) => {
    if (socket.userRole !== 'teacher') {
      return socket.emit('error', { message: 'Only teachers can react' });
    }
    
    try {
      const message = await Message.findById(data.messageId);
      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }
      
      // Add reaction
      if (message.reactions[data.reactionType] !== undefined) {
        message.reactions[data.reactionType]++;
        await message.save();
        
        // Convert to client format
        const updatedMessage = {
          id: message._id,
          text: message.text,
          sender: message.sender,
          senderId: message.senderId,
          role: message.role,
          timestamp: message.createdAt,
          roomId: message.roomId,
          reactions: message.reactions
        };
        
        // Broadcast the updated message
        io.to(message.roomId).emit('message-updated', updatedMessage);
      } else {
        socket.emit('error', { message: 'Invalid reaction type' });
      }
      
    } catch (error) {
      console.error('Error adding reaction:', error);
      socket.emit('error', { message: 'Failed to add reaction' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing-start', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      userName: socket.userName,
      userId: socket.userId
    });
  });
  
  socket.on('typing-stop', (data) => {
    socket.to(data.roomId).emit('user-stop-typing', {
      userName: socket.userName,
      userId: socket.userId
    });
  });
  
  // Handle leaving room
  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
    socket.to(roomId).emit('user-left', {
      userName: socket.userName,
      userId: socket.userId
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userName}`);
  });
});

// Make io available to routes
app.set('io', io);

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Catch-all for undefined routes (Updated section of your server.js)
app.all('*', (req, res) => {
  console.log(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `Route ${req.path} not found`,
    availableRoutes: [
      // Health check
      'GET /api/health',
      
      // Auth routes
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'POST /api/auth/logout',
      
      // Teacher routes
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
      'POST /api/teachers/logout',
      
      // Appointment routes - COMPLETE LIST
      'GET /api/appointments',
      'POST /api/appointments',
      'GET /api/appointments/:id',
      'PUT /api/appointments/:id',
      'DELETE /api/appointments/:id',
      'GET /api/appointments/stats',
      'POST /api/appointments/request',
      'POST /api/appointments/book',  // <-- This was missing!
      'PUT /api/appointments/:id/accept',
      'PUT /api/appointments/:id/reject',
      'PUT /api/appointments/:id/complete',
      'PUT /api/appointments/:id/cancel',
      'GET /api/appointments/teacher/:teacherId',
      'GET /api/appointments/teacher/:teacherId/pending',
      
      // Message routes
      'GET /api/messages/room/:roomId',
      'DELETE /api/messages/:messageId',
      
      // Admin routes
      'POST /api/admin/register',
      'POST /api/admin/login',
      'GET /api/admin/profile',
      'PUT /api/admin/profile',
      'GET /api/admin/dashboard/stats',
      'GET /api/admin/users',
      'DELETE /api/admin/users/:userId',
      'GET /api/admin/appointments'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);

  let error = { ...err };
  error.message = err.message;

  // Mongoose errors
  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 };
  }

  if (err.code === 11000) {
    error = { message: 'Duplicate field value entered', statusCode: 400 };
  }

  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
});

// Unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// Uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// Export for use in other files
module.exports = { app, io, server };