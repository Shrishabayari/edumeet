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

// CORRECTED: Simplified CORS origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://edumeet-1.onrender.com', // Your frontend URL
];

// In production, also allow your backend URL for same-origin requests
if (process.env.NODE_ENV === 'production') {
  allowedOrigins.push('https://edumeet.onrender.com');
}

console.log('🔗 Allowed CORS origins:', allowedOrigins);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

// CORRECTED: Socket.io setup with cleaner CORS
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Reasonable limit
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  skip: (req) => req.url.startsWith('/socket.io/')
});
app.use(limiter);

// CORRECTED: Simpler CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, same-origin, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.error(`[CORS] Blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
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

// CORRECTED: Socket authentication middleware
io.use(async (socket, next) => {
  try {
    console.log('🔐 Socket authentication attempt');
    
    const token = socket.handshake.auth.token;
    const userRole = socket.handshake.auth.role;
    const userName = socket.handshake.auth.name;
    
    console.log('Auth data:', { 
      hasToken: !!token, 
      role: userRole, 
      name: userName
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
        role: decoded.role
      });
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
    
    // Attach user info from token
    socket.userId = decoded.id;
    socket.userRole = decoded.role || userRole || 'student';
    
    // Fetch user details from database
    let user;
    try {
      if (socket.userRole === 'teacher') {
        user = await Teacher.findById(decoded.id).select('name email isActive hasAccount');
        
        if (!user || !user.hasAccount || !user.isActive) {
          console.log('❌ Teacher account not properly set up');
          return next(new Error('Authentication error: Teacher account not properly set up'));
        }
      } else {
        user = await User.findById(decoded.id).select('name email isActive approvalStatus');
        
        if (!user || !user.isActive || user.approvalStatus !== 'approved') {
          console.log('❌ Student account not active or approved');
          return next(new Error('Authentication error: Student account not active or approved'));
        }
      }
      
      socket.userName = user.name || userName || 'Unknown User';
      socket.userEmail = user.email;
      socket.user = user;
      
      console.log(`✅ Socket authenticated: ${socket.userName} (${socket.userRole})`);
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

// CORRECTED: Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🟢 Socket connected: ${socket.userName} (${socket.userRole})`);
  
  // Send connection confirmation
  socket.emit('connection-confirmed', {
    message: 'Connected successfully',
    user: {
      name: socket.userName,
      role: socket.userRole,
      id: socket.userId
    }
  });
  
  // Join room
  socket.on('join-room', (roomId) => {
    try {
      if (!roomId || typeof roomId !== 'string') {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }
      
      const cleanRoomId = roomId.trim();
      
      // Leave current room if any
      if (socket.currentRoom && socket.currentRoom !== cleanRoomId) {
        socket.leave(socket.currentRoom);
      }
      
      socket.join(cleanRoomId);
      socket.currentRoom = cleanRoomId;
      console.log(`🏠 ${socket.userName} joined room: ${cleanRoomId}`);
      
      socket.emit('room-joined', { 
        roomId: cleanRoomId,
        message: `Successfully joined ${cleanRoomId}`
      });
      
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Leave room
  socket.on('leave-room', (roomId) => {
    try {
      if (roomId && typeof roomId === 'string') {
        const cleanRoomId = roomId.trim();
        socket.leave(cleanRoomId);
        
        if (socket.currentRoom === cleanRoomId) {
          socket.currentRoom = null;
        }
        
        console.log(`🚪 ${socket.userName} left room: ${cleanRoomId}`);
        socket.emit('room-left', { roomId: cleanRoomId });
      }
    } catch (error) {
      console.error('❌ Error leaving room:', error);
    }
  });
  
  // CORRECTED: Send message handling
  socket.on('send-message', async (data) => {
    try {
      console.log(`💬 Message from ${socket.userName}:`, data);
      
      // Validate input
      if (!data || !data.text || !data.roomId) {
        socket.emit('error', { message: 'Invalid message data' });
        return;
      }
      
      if (data.text.trim().length === 0) {
        socket.emit('error', { message: 'Message cannot be empty' });
        return;
      }
      
      if (data.text.length > 1000) {
        socket.emit('error', { message: 'Message too long' });
        return;
      }
      
      const cleanRoomId = data.roomId.trim();
      const cleanText = data.text.trim();
      
      // Create message
      const messageData = {
        text: cleanText,
        sender: socket.userName,
        senderId: socket.userId,
        role: socket.userRole === 'teacher' ? 'teacher' : 'student',
        roomId: cleanRoomId
      };
      
      const savedMessage = await Message.createMessage(messageData);
      console.log(`✅ Message saved: ${savedMessage._id}`);
      
      // Format for client
      const messageForClient = {
        id: savedMessage._id,
        _id: savedMessage._id,
        text: savedMessage.text,
        sender: savedMessage.sender,
        senderId: savedMessage.senderId,
        role: savedMessage.role,
        roomId: savedMessage.roomId,
        reactions: savedMessage.reactions,
        timestamp: savedMessage.createdAt,
        createdAt: savedMessage.createdAt
      };
      
      // Broadcast to room
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
  
  // CORRECTED: Add reaction handling
  socket.on('add-reaction', async (data) => {
    try {
      console.log(`❤️ Reaction from ${socket.userName}:`, data);
      
      // Only teachers can add reactions
      if (socket.userRole !== 'teacher') {
        socket.emit('error', { message: 'Only teachers can add reactions' });
        return;
      }
      
      if (!data || !data.messageId || !data.reactionType) {
        socket.emit('error', { message: 'Invalid reaction data' });
        return;
      }
      
      const validReactions = ['heart', 'thumbs', 'star'];
      if (!validReactions.includes(data.reactionType)) {
        socket.emit('error', { message: 'Invalid reaction type' });
        return;
      }
      
      // Add reaction using model method
      const updatedMessage = await Message.addReactionToMessage(
        data.messageId,
        data.reactionType,
        socket.userId
      );
      
      console.log(`✅ Reaction added to message: ${updatedMessage._id}`);
      
      // Format for client
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
      
      // Broadcast updated message
      io.to(updatedMessage.roomId).emit('message-updated', messageForClient);
      
    } catch (error) {
      console.error('❌ Error adding reaction:', error);
      socket.emit('error', { 
        message: error.message || 'Failed to add reaction'
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.userName} - Reason: ${reason}`);
  });
  
  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.userName}:`, error);
  });
});

// Make io available to routes
app.set('io', io);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduMeet Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    socketIO: {
      connected: io.engine.clientsCount || 0,
      status: 'active'
    }
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.path} not found`,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EduMeet Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⚡ Socket.IO ready`);
  console.log(`🌍 CORS origins:`, allowedOrigins);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  
  server.close((err) => {
    if (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
    
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, io, server };