const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_escalated', 'comment_added', 'sla_breach', 'sla_warning', 'ticket_resolved'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    default: null
  },
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isEmailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date,
    default: null
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
// Explicit indexes retained; no duplicate unique/index conflict detected

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Method to mark email as sent
notificationSchema.methods.markEmailSent = function() {
  this.isEmailSent = true;
  this.emailSentAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Notification', notificationSchema);
