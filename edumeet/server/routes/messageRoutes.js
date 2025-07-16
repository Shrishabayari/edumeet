// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth'); // Your existing auth middleware

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

// Get messages for a specific room
router.get('/room/:roomId', protect, validatePagination, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page, limit } = req.pagination;
    
    // Validate roomId
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }
    
    // Use the static method from the model
    const result = await Message.getMessagesForRoom(roomId, page, limit);
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete a message (only sender or teacher can delete)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Validate messageId
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
    
    // Check if user can delete (sender or teacher)
    if (message.senderId.toString() !== req.user.id && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // Soft delete
    message.isDeleted = true;
    await message.save();
    
    // Notify clients via Socket.IO (if available)
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
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get room statistics (for teachers)
router.get('/room/:roomId/stats', protect, async (req, res) => {
  try {
    // Only teachers can view room statistics
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can view room statistics'
      });
    }
    
    const { roomId } = req.params;
    
    if (!roomId || roomId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Room ID is required'
      });
    }
    
    // Use the static method from the model
    const stats = await Message.getRoomStats(roomId);
    
    // Get additional statistics
    const totalMessages = await Message.countDocuments({ roomId, isDeleted: false });
    const totalReactions = await Message.aggregate([
      { $match: { roomId, isDeleted: false } },
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
    console.error('Error fetching room stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all rooms (for admin/teacher)
router.get('/rooms', protect, async (req, res) => {
  try {
    // Only teachers and admins can view all rooms
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view all rooms'
      });
    }
    
    const rooms = await Message.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$roomId',
          messageCount: { $sum: 1 },
          lastMessage: { $max: '$createdAt' },
          participants: { $addToSet: '$sender' }
        }
      },
      { $sort: { lastMessage: -1 } }
    ]);
    
    res.json({
      success: true,
      data: rooms
    });
    
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search messages in a room (for teachers)
router.get('/room/:roomId/search', protect, validatePagination, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can search messages'
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
    
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({
      roomId,
      isDeleted: false,
      text: { $regex: searchTerm, $options: 'i' }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'name email');
    
    const total = await Message.countDocuments({
      roomId,
      isDeleted: false,
      text: { $regex: searchTerm, $options: 'i' }
    });
    
    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        searchTerm
      }
    });
    
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;