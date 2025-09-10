// routes/messageRoutes.js - CORRECTED VERSION
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// Validation middleware
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'Page number must be greater than 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be between 1 and 100'
    });
  }
  
  req.pagination = { page, limit };
  next();
};

// CORRECTED: Get messages for a specific room
router.get('/room/:roomId', protect, validatePagination, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page, limit } = req.pagination;
    
    console.log(`📂 Loading messages for room: ${roomId} (Page: ${page}, Limit: ${limit})`);
    
    // Validate roomId
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }
    
    const cleanRoomId = roomId.trim();
    
    // Use the static method from the model
    const result = await Message.getMessagesForRoom(cleanRoomId, page, limit);
    
    console.log(`✅ Found ${result.messages.length} messages for room: ${cleanRoomId}`);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// CORRECTED: Delete a message (soft delete)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Validate messageId format
    if (!messageId || !messageId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message ID format'
      });
    }
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Message is already deleted'
      });
    }
    
    // Check permissions: sender can delete their own message, teachers can delete any message
    const canDelete = message.senderId.toString() === req.user.id || req.user.role === 'teacher';
    
    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // Soft delete
    message.isDeleted = true;
    await message.save();
    
    console.log(`🗑️ Message deleted: ${messageId} by ${req.user.role} ${req.user.id}`);
    
    // Notify clients via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      io.to(message.roomId).emit('message-deleted', {
        messageId: message._id,
        roomId: message.roomId
      });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// CORRECTED: Get room statistics (for teachers and admins)
router.get('/room/:roomId/stats', protect, async (req, res) => {
  try {
    // Only teachers and admins can view room statistics
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can view room statistics'
      });
    }
    
    const { roomId } = req.params;
    
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }
    
    const cleanRoomId = roomId.trim();
    console.log(`📊 Getting stats for room: ${cleanRoomId}`);
    
    // Use the static method from the model
    const stats = await Message.getRoomStats(cleanRoomId);
    
    // Get additional statistics
    const totalMessages = await Message.countDocuments({ 
      roomId: cleanRoomId, 
      isDeleted: false 
    });
    
    const totalReactions = await Message.aggregate([
      { $match: { roomId: cleanRoomId, isDeleted: false } },
      {
        $group: {
          _id: null,
          totalHearts: { $sum: '$reactions.heart' },
          totalThumbs: { $sum: '$reactions.thumbs' },
          totalStars: { $sum: '$reactions.star' }
        }
      }
    ]);
    
    const reactionSummary = totalReactions.length > 0 ? totalReactions[0] : {
      totalHearts: 0,
      totalThumbs: 0,
      totalStars: 0
    };
    
    res.json({
      success: true,
      data: {
        roomId: cleanRoomId,
        roleStats: stats,
        totalMessages,
        reactionSummary: {
          hearts: reactionSummary.totalHearts,
          thumbs: reactionSummary.totalThumbs,
          stars: reactionSummary.totalStars,
          total: reactionSummary.totalHearts + reactionSummary.totalThumbs + reactionSummary.totalStars
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching room stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// CORRECTED: Get all rooms (for teachers and admins)
router.get('/rooms', protect, async (req, res) => {
  try {
    // Only teachers and admins can view all rooms
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can view all rooms'
      });
    }
    
    console.log(`📂 Getting all rooms for ${req.user.role}: ${req.user.id}`);
    
    const rooms = await Message.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$roomId',
          messageCount: { $sum: 1 },
          lastMessage: { $max: '$createdAt' },
          participants: { $addToSet: '$sender' },
          studentMessages: {
            $sum: { $cond: [{ $eq: ['$role', 'student'] }, 1, 0] }
          },
          teacherMessages: {
            $sum: { $cond: [{ $eq: ['$role', 'teacher'] }, 1, 0] }
          }
        }
      },
      { $sort: { lastMessage: -1 } }
    ]);
    
    console.log(`✅ Found ${rooms.length} active rooms`);
    
    res.json({
      success: true,
      data: rooms.map(room => ({
        roomId: room._id,
        messageCount: room.messageCount,
        lastMessage: room.lastMessage,
        participantCount: room.participants.length,
        studentMessages: room.studentMessages,
        teacherMessages: room.teacherMessages
      }))
    });
    
  } catch (error) {
    console.error('❌ Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// CORRECTED: Search messages in a room (for teachers and admins)
router.get('/room/:roomId/search', protect, validatePagination, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can search messages'
      });
    }
    
    const { roomId } = req.params;
    const { page, limit } = req.pagination;
    const searchTerm = req.query.q;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    const cleanRoomId = roomId.trim();
    const cleanSearchTerm = searchTerm.trim();
    
    console.log(`🔍 Searching messages in room ${cleanRoomId} for: "${cleanSearchTerm}"`);
    
    const skip = (page - 1) * limit;
    
    // Search query with case-insensitive regex
    const searchQuery = {
      roomId: cleanRoomId,
      isDeleted: false,
      text: { $regex: cleanSearchTerm, $options: 'i' }
    };
    
    const [messages, total] = await Promise.all([
      Message.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name email')
        .lean(),
      Message.countDocuments(searchQuery)
    ]);
    
    console.log(`✅ Found ${messages.length} messages matching search in room ${cleanRoomId}`);
    
    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        },
        searchTerm: cleanSearchTerm,
        roomId: cleanRoomId
      }
    });
    
  } catch (error) {
    console.error('❌ Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// CORRECTED: Add a new endpoint to create messages via HTTP (for testing)
router.post('/room/:roomId', protect, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text } = req.body;
    
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }
    
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message text is required'
      });
    }
    
    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot exceed 1000 characters'
      });
    }
    
    const cleanRoomId = roomId.trim();
    const cleanText = text.trim();
    
    console.log(`💬 Creating message in room ${cleanRoomId} by ${req.user.role} ${req.user.id}`);
    
    // Create message using the model's static method
    const messageData = {
      text: cleanText,
      sender: req.user.name || req.user.email || 'Unknown User',
      senderId: req.user.id,
      role: req.user.role === 'teacher' ? 'teacher' : 'student',
      roomId: cleanRoomId
    };
    
    const savedMessage = await Message.createMessage(messageData);
    
    console.log(`✅ Message created: ${savedMessage._id}`);
    
    // Notify clients via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
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
      
      io.to(cleanRoomId).emit('new-message', messageForClient);
    }
    
    res.status(201).json({
      success: true,
      data: {
        message: savedMessage,
        roomId: cleanRoomId
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;