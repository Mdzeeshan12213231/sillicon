const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['technical', 'billing', 'general', 'bug_report', 'feature_request']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  // SLA Management
  sla: {
    responseTime: {
      type: Number, // in hours
      default: 24
    },
    resolutionTime: {
      type: Number, // in hours
      default: 72
    },
    firstResponseAt: {
      type: Date,
      default: null
    },
    resolvedAt: {
      type: Date,
      default: null
    },
    dueDate: {
      type: Date,
      default: function() {
        return new Date(Date.now() + this.sla.resolutionTime * 60 * 60 * 1000);
      }
    }
  },
  // Optimistic locking
  version: {
    type: Number,
    default: 0
  },
  // Tags for better organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
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
  // Internal notes (visible only to agents and admins)
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Customer satisfaction
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    submittedAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ 'sla.dueDate': 1 });
ticketSchema.index({ tags: 1 });

// Virtual for SLA status
ticketSchema.virtual('slaStatus').get(function() {
  const now = new Date();
  const dueDate = this.sla.dueDate;
  const responseTime = this.sla.responseTime;
  const firstResponse = this.sla.firstResponseAt;
  
  if (this.status === 'resolved' || this.status === 'closed') {
    return 'completed';
  }
  
  if (firstResponse && now > new Date(firstResponse.getTime() + responseTime * 60 * 60 * 1000)) {
    return 'response_breach';
  }
  
  if (now > dueDate) {
    return 'resolution_breach';
  }
  
  if (now > new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)) {
    return 'warning';
  }
  
  return 'on_time';
});

// Virtual for time remaining
ticketSchema.virtual('timeRemaining').get(function() {
  if (this.status === 'resolved' || this.status === 'closed') {
    return null;
  }
  
  const now = new Date();
  const dueDate = this.sla.dueDate;
  const remaining = dueDate.getTime() - now.getTime();
  
  return remaining > 0 ? Math.ceil(remaining / (1000 * 60 * 60)) : 0; // hours
});

// Method to check if ticket can be modified
ticketSchema.methods.canBeModified = function(userRole, userId) {
  if (userRole === 'admin') return true;
  if (userRole === 'agent' && (this.assignedTo?.toString() === userId || !this.assignedTo)) return true;
  if (userRole === 'user' && this.createdBy.toString() === userId && this.status === 'open') return true;
  return false;
};

// Pre-save middleware to update version for optimistic locking
ticketSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
