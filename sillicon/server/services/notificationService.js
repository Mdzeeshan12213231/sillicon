const Notification = require('../models/Notification');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.emailTransporter = this.createEmailTransporter();
  }

  createEmailTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async createNotification(userId, type, title, message, options = {}) {
    const notification = new Notification({
      user: userId,
      type,
      title,
      message,
      ticket: options.ticketId || null,
      comment: options.commentId || null,
      priority: options.priority || 'medium',
      metadata: options.metadata || {}
    });

    await notification.save();
    await notification.populate('user', 'name email preferences');

    // Send email notification if user has email notifications enabled
    if (notification.user.preferences?.notifications?.email) {
      await this.sendEmailNotification(notification);
    }

    return notification;
  }

  async sendEmailNotification(notification) {
    try {
      const user = notification.user;
      const ticket = notification.ticket ? await Ticket.findById(notification.ticket) : null;

      const emailTemplate = this.getEmailTemplate(notification, ticket);
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `[HelpDesk Mini] ${notification.title}`,
        html: emailTemplate
      };

      await this.emailTransporter.sendMail(mailOptions);
      await notification.markEmailSent();
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  getEmailTemplate(notification, ticket) {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const ticketUrl = ticket ? `${baseUrl}/tickets/${ticket._id}` : `${baseUrl}/dashboard`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9fafb; }
          .button { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>HelpDesk Mini</h1>
          </div>
          <div class="content">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            ${ticket ? `
              <p><strong>Ticket:</strong> ${ticket.title}</p>
              <p><strong>Status:</strong> ${ticket.status}</p>
              <p><strong>Priority:</strong> ${ticket.priority}</p>
            ` : ''}
            <p style="margin-top: 20px;">
              <a href="${ticketUrl}" class="button">View Details</a>
            </p>
          </div>
          <div class="footer">
            <p>This is an automated notification from HelpDesk Mini.</p>
            <p>You can manage your notification preferences in your profile settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async getNotifications(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const filter = { user: userId };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate('ticket', 'title status priority')
      .populate('comment', 'content author')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Notification.countDocuments(filter);

    return {
      notifications,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit
      }
    };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      user: userId
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({
      user: userId,
      isRead: false
    });
  }

  // Ticket-specific notifications
  async notifyTicketCreated(ticket) {
    const notification = await this.createNotification(
      ticket.createdBy,
      'ticket_created',
      'Ticket Created',
      `Your ticket "${ticket.title}" has been created successfully.`,
      {
        ticketId: ticket._id,
        priority: 'medium'
      }
    );

    // Notify agents about new ticket
    const agents = await User.find({ role: 'agent', isActive: true });
    for (const agent of agents) {
      await this.createNotification(
        agent._id,
        'ticket_created',
        'New Ticket Created',
        `A new ticket "${ticket.title}" has been created and needs attention.`,
        {
          ticketId: ticket._id,
          priority: 'high'
        }
      );
    }

    return notification;
  }

  async notifyTicketAssigned(ticket, assignedTo, assignedBy) {
    return await this.createNotification(
      assignedTo,
      'ticket_assigned',
      'Ticket Assigned',
      `You have been assigned to ticket "${ticket.title}".`,
      {
        ticketId: ticket._id,
        priority: 'high',
        metadata: { assignedBy: assignedBy }
      }
    );
  }

  async notifyTicketUpdated(ticket, updatedBy, changes) {
    const watchers = [ticket.createdBy];
    if (ticket.assignedTo) {
      watchers.push(ticket.assignedTo);
    }

    // Remove duplicates and the person who made the update
    const uniqueWatchers = [...new Set(watchers)].filter(id => 
      id.toString() !== updatedBy.toString()
    );

    const notifications = [];
    for (const watcherId of uniqueWatchers) {
      const notification = await this.createNotification(
        watcherId,
        'ticket_updated',
        'Ticket Updated',
        `Ticket "${ticket.title}" has been updated.`,
        {
          ticketId: ticket._id,
          priority: 'medium',
          metadata: { changes, updatedBy }
        }
      );
      notifications.push(notification);
    }

    return notifications;
  }

  async notifyCommentAdded(ticket, comment, commenter) {
    const watchers = [ticket.createdBy];
    if (ticket.assignedTo) {
      watchers.push(ticket.assignedTo);
    }

    // Remove duplicates and the person who commented
    const uniqueWatchers = [...new Set(watchers)].filter(id => 
      id.toString() !== commenter.toString()
    );

    const notifications = [];
    for (const watcherId of uniqueWatchers) {
      const notification = await this.createNotification(
        watcherId,
        'comment_added',
        'New Comment',
        `A new comment was added to ticket "${ticket.title}".`,
        {
          ticketId: ticket._id,
          commentId: comment._id,
          priority: 'medium',
          metadata: { commenter }
        }
      );
      notifications.push(notification);
    }

    return notifications;
  }

  async notifySLAWarning(ticket) {
    const watchers = [ticket.createdBy];
    if (ticket.assignedTo) {
      watchers.push(ticket.assignedTo);
    }

    const notifications = [];
    for (const watcherId of watchers) {
      const notification = await this.createNotification(
        watcherId,
        'sla_warning',
        'SLA Warning',
        `Ticket "${ticket.title}" is approaching its SLA deadline.`,
        {
          ticketId: ticket._id,
          priority: 'high'
        }
      );
      notifications.push(notification);
    }

    return notifications;
  }

  async notifySLABreach(ticket) {
    const watchers = [ticket.createdBy];
    if (ticket.assignedTo) {
      watchers.push(ticket.assignedTo);
    }

    // Also notify admins
    const admins = await User.find({ role: 'admin', isActive: true });
    for (const admin of admins) {
      watchers.push(admin._id);
    }

    const uniqueWatchers = [...new Set(watchers)];

    const notifications = [];
    for (const watcherId of uniqueWatchers) {
      const notification = await this.createNotification(
        watcherId,
        'sla_breach',
        'SLA Breach Alert',
        `Ticket "${ticket.title}" has exceeded its SLA deadline.`,
        {
          ticketId: ticket._id,
          priority: 'urgent'
        }
      );
      notifications.push(notification);
    }

    return notifications;
  }
}

module.exports = new NotificationService();
