const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: [true, 'Comment content is required'],
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  // Threaded comments support
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  // Comment type
  type: {
    type: String,
    enum: ['comment', 'status_change', 'assignment', 'internal_note'],
    default: 'comment'
  },
  // For status changes
  statusChange: {
    from: String,
    to: String,
    reason: String
  },
  // For assignments
  assignmentChange: {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  // Visibility
  isInternal: {
    type: Boolean,
    default: false // true for internal notes visible only to agents/admins
  },
  // Attachments
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
  // Reactions/Emojis
  reactions: [{
    emoji: String,
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  // Edit history
  editedAt: {
    type: Date,
    default: null
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Explicit indexes retained; no duplicate unique/index conflict detected

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  count: true
});

// Method to get all replies
commentSchema.methods.getReplies = async function() {
  return await this.constructor.find({ 
    parentComment: this._id, 
    isDeleted: false 
  }).populate('author', 'name email avatar').sort({ createdAt: 1 });
};

// Method to check if user can edit/delete comment
commentSchema.methods.canBeModifiedBy = function(userId, userRole) {
  if (userRole === 'admin') return true;
  if (this.author.toString() === userId) return true;
  if (userRole === 'agent' && !this.isInternal) return true;
  return false;
};

// Pre-save middleware to handle edit history
commentSchema.pre('save', function(next) {
  if (this.isModified('content') && !this.isNew) {
    this.editHistory.push({
      content: this.content,
      editedAt: new Date()
    });
    this.editedAt = new Date();
  }
  next();
});

// Soft delete method
commentSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

module.exports = mongoose.model('Comment', commentSchema);
