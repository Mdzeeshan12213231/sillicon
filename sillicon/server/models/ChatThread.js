const mongoose = require('mongoose');

const chatThreadSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['customer', 'agent', 'admin'],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'system'],
      default: 'text'
    },
    attachments: [{
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isInternal: {
      type: Boolean,
      default: false
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editedAt: {
      type: Date,
      default: null
    },
    reactions: [{
      emoji: String,
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }],
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  // Chat settings
  settings: {
    allowCustomerInvite: {
      type: Boolean,
      default: false
    },
    autoAssignOnJoin: {
      type: Boolean,
      default: true
    },
    notificationSettings: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
chatThreadSchema.index({ ticket: 1 });
chatThreadSchema.index({ 'participants.user': 1 });
chatThreadSchema.index({ lastMessageAt: -1 });
chatThreadSchema.index({ isActive: 1 });

// Virtual for unread message count per user
chatThreadSchema.virtual('unreadCount').get(function() {
  // This would be calculated based on readBy data
  return 0;
});

// Method to add a message
chatThreadSchema.methods.addMessage = function(senderId, content, messageType = 'text', attachments = [], isInternal = false) {
  const message = {
    sender: senderId,
    content,
    messageType,
    attachments,
    isInternal,
    readBy: [{
      user: senderId,
      readAt: new Date()
    }]
  };

  this.messages.push(message);
  this.lastMessageAt = new Date();
  
  return this.save();
};

// Method to add a participant
chatThreadSchema.methods.addParticipant = function(userId, role) {
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (existingParticipant) {
    existingParticipant.isActive = true;
    existingParticipant.joinedAt = new Date();
  } else {
    this.participants.push({
      user: userId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Method to remove a participant
chatThreadSchema.methods.removeParticipant = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.isActive = false;
  }
  
  return this.save();
};

// Method to mark message as read
chatThreadSchema.methods.markAsRead = function(userId, messageId = null) {
  if (messageId) {
    // Mark specific message as read
    const message = this.messages.id(messageId);
    if (message) {
      const existingRead = message.readBy.find(r => r.user.toString() === userId.toString());
      if (existingRead) {
        existingRead.readAt = new Date();
      } else {
        message.readBy.push({
          user: userId,
          readAt: new Date()
        });
      }
    }
  } else {
    // Mark all messages as read
    this.messages.forEach(message => {
      const existingRead = message.readBy.find(r => r.user.toString() === userId.toString());
      if (existingRead) {
        existingRead.readAt = new Date();
      } else {
        message.readBy.push({
          user: userId,
          readAt: new Date()
        });
      }
    });
  }
  
  return this.save();
};

// Method to add reaction to message
chatThreadSchema.methods.addReaction = function(messageId, userId, emoji) {
  const message = this.messages.id(messageId);
  if (!message) return null;

  let reaction = message.reactions.find(r => r.emoji === emoji);
  
  if (reaction) {
    // Toggle user in reaction
    const userIndex = reaction.users.findIndex(u => u.toString() === userId.toString());
    if (userIndex > -1) {
      reaction.users.splice(userIndex, 1);
      if (reaction.users.length === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      reaction.users.push(userId);
    }
  } else {
    // Create new reaction
    message.reactions.push({
      emoji,
      users: [userId]
    });
  }
  
  return this.save();
};

// Method to edit message
chatThreadSchema.methods.editMessage = function(messageId, newContent, userId) {
  const message = this.messages.id(messageId);
  if (!message || message.sender.toString() !== userId.toString()) {
    return null;
  }

  message.content = newContent;
  message.isEdited = true;
  message.editedAt = new Date();
  
  return this.save();
};

// Method to get unread count for user
chatThreadSchema.methods.getUnreadCount = function(userId) {
  let unreadCount = 0;
  
  this.messages.forEach(message => {
    const hasRead = message.readBy.some(r => r.user.toString() === userId.toString());
    if (!hasRead) {
      unreadCount++;
    }
  });
  
  return unreadCount;
};

// Static method to find threads for user
chatThreadSchema.statics.findForUser = function(userId, userRole) {
  let filter = { isActive: true };
  
  if (userRole === 'user') {
    filter['participants.user'] = userId;
    filter['participants.role'] = 'customer';
  } else {
    filter['participants.user'] = userId;
  }
  
  return this.find(filter)
    .populate('ticket', 'title status priority')
    .populate('participants.user', 'name email avatar')
    .populate('messages.sender', 'name email avatar')
    .sort({ lastMessageAt: -1 });
};

module.exports = mongoose.model('ChatThread', chatThreadSchema);

