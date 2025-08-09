const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: {
    type: String,
    required: [true, 'Message text is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  sender: {
    type: String,
    required: [true, 'Sender name is required'],
    trim: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    required: [true, 'Sender ID is required'],
    refPath: 'senderModel'
  },
  senderModel: {
    type: String,
    required: [true, 'Sender model is required'],
    enum: {
      values: ['User', 'Teacher'],
      message: 'Sender model must be either User or Teacher'
    }
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['student', 'teacher'],
      message: 'Role must be either student or teacher'
    }
  },
  roomId: {
    type: String,
    required: [true, 'Room ID is required'],
    trim: true,
    index: true
  },
  reactions: {
    heart: {
      type: Number,
      default: 0,
      min: [0, 'Reaction count cannot be negative']
    },
    thumbs: {
      type: Number,
      default: 0,
      min: [0, 'Reaction count cannot be negative']
    },
    star: {
      type: Number,
      default: 0,
      min: [0, 'Reaction count cannot be negative']
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1, createdAt: -1 });
messageSchema.index({ roomId: 1, isDeleted: 1, createdAt: -1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString();
});

// Virtual for total reactions
messageSchema.virtual('totalReactions').get(function() {
  return this.reactions.heart + this.reactions.thumbs + this.reactions.star;
});

// Instance method to add reaction
messageSchema.methods.addReaction = function(reactionType) {
  if (this.reactions[reactionType] !== undefined) {
    this.reactions[reactionType]++;
    return this.save();
  }
  throw new Error('Invalid reaction type');
};

// Static method to get room statistics
messageSchema.statics.getRoomStats = function(roomId) {
  return this.aggregate([
    { $match: { roomId, isDeleted: false } },
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        totalReactions: {
          $sum: {
            $add: ['$reactions.heart', '$reactions.thumbs', '$reactions.star']
          }
        }
      }
    }
  ]);
};

// Static method to get messages for a room with pagination
messageSchema.statics.getMessagesForRoom = async function(roomId, page = 1, limit = 50) {
  try {
    const skip = (page - 1) * limit;
    
    // Execute both queries in parallel
    const [messages, total] = await Promise.all([
      this.find({ roomId, isDeleted: false })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name email')
        .lean(), // Use lean() for better performance
      this.countDocuments({ roomId, isDeleted: false })
    ]);
    
    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    };
  } catch (error) {
    console.error('Error in getMessagesForRoom:', error);
    throw error;
  }
};

// Static method to create a new message with validation
messageSchema.statics.createMessage = async function(messageData) {
  try {
    // Validate required fields
    const { text, sender, senderId, role, roomId } = messageData;
    
    if (!text || !sender || !senderId || !role || !roomId) {
      throw new Error('Missing required message fields');
    }
    
    // Determine sender model based on role
    const senderModel = role === 'teacher' ? 'Teacher' : 'User';
    
    const message = new this({
      text,
      sender,
      senderId,
      senderModel,
      role,
      roomId,
      reactions: {
        heart: 0,
        thumbs: 0,
        star: 0
      }
    });
    
    await message.save();
    return message;
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
};

// Static method to add reaction to a message
messageSchema.statics.addReactionToMessage = async function(messageId, reactionType, userId) {
  try {
    const message = await this.findById(messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (message.isDeleted) {
      throw new Error('Cannot react to deleted message');
    }
    
    // Validate reaction type
    const validReactions = ['heart', 'thumbs', 'star'];
    if (!validReactions.includes(reactionType)) {
      throw new Error('Invalid reaction type');
    }
    
    // Increment reaction count
    message.reactions[reactionType]++;
    await message.save();
    
    return message;
  } catch (error) {
    console.error('Error adding reaction:', error);
    throw error;
  }
};

// Pre-save middleware to set editedAt when message is modified
messageSchema.pre('save', function(next) {
  if (this.isModified('text') && !this.isNew) {
    this.editedAt = new Date();
  }
  next();
});

// Pre-save middleware to validate sender model consistency
messageSchema.pre('save', function(next) {
  // Ensure senderModel matches role
  if (this.role === 'teacher' && this.senderModel !== 'Teacher') {
    this.senderModel = 'Teacher';
  } else if (this.role === 'student' && this.senderModel !== 'User') {
    this.senderModel = 'User';
  }
  next();
});

// Ensure virtuals are included in JSON output
messageSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Remove mongoose internal fields
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

messageSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Message', messageSchema);