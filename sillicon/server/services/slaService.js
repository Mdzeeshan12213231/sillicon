const Ticket = require('../models/Ticket');
const notificationService = require('./notificationService');
const cron = require('node-cron');

class SLAService {
  constructor() {
    this.startSLAWatcher();
  }

  // Start the SLA monitoring cron job
  startSLAWatcher() {
    // Check every 15 minutes for SLA warnings and breaches
    cron.schedule('*/15 * * * *', async () => {
      await this.checkSLAStatus();
    });

    // Check every hour for escalation
    cron.schedule('0 * * * *', async () => {
      await this.checkEscalations();
    });
  }

  async checkSLAStatus() {
    try {
      const now = new Date();
      
      // Find tickets that are approaching SLA deadline (within 2 hours)
      const warningTickets = await Ticket.find({
        status: { $in: ['open', 'in_progress'] },
        'sla.dueDate': {
          $gte: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
          $lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours from now
        }
      });

      for (const ticket of warningTickets) {
        await this.handleSLAWarning(ticket);
      }

      // Find tickets that have breached SLA
      const breachedTickets = await Ticket.find({
        status: { $in: ['open', 'in_progress'] },
        'sla.dueDate': { $lt: now }
      });

      for (const ticket of breachedTickets) {
        await this.handleSLABreach(ticket);
      }
    } catch (error) {
      console.error('Error checking SLA status:', error);
    }
  }

  async checkEscalations() {
    try {
      const now = new Date();
      
      // Find tickets that have been open for more than 24 hours without assignment
      const unassignedTickets = await Ticket.find({
        status: 'open',
        assignedTo: null,
        createdAt: { $lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
      });

      for (const ticket of unassignedTickets) {
        await this.escalateTicket(ticket);
      }

      // Find high priority tickets that haven't been updated in 4 hours
      const staleHighPriorityTickets = await Ticket.find({
        status: { $in: ['open', 'in_progress'] },
        priority: { $in: ['high', 'urgent'] },
        updatedAt: { $lt: new Date(now.getTime() - 4 * 60 * 60 * 1000) }
      });

      for (const ticket of staleHighPriorityTickets) {
        await this.escalateTicket(ticket);
      }
    } catch (error) {
      console.error('Error checking escalations:', error);
    }
  }

  async handleSLAWarning(ticket) {
    // Check if we've already sent a warning for this ticket
    const lastWarning = await notificationService.getNotifications(ticket.createdBy, {
      unreadOnly: false,
      limit: 1
    });

    const hasRecentWarning = lastWarning.notifications.some(notif => 
      notif.type === 'sla_warning' && 
      notif.ticket && 
      notif.ticket._id.toString() === ticket._id.toString() &&
      new Date(notif.createdAt) > new Date(Date.now() - 60 * 60 * 1000) // Within last hour
    );

    if (!hasRecentWarning) {
      await notificationService.notifySLAWarning(ticket);
    }
  }

  async handleSLABreach(ticket) {
    // Check if we've already sent a breach notification
    const lastBreach = await notificationService.getNotifications(ticket.createdBy, {
      unreadOnly: false,
      limit: 1
    });

    const hasRecentBreach = lastBreach.notifications.some(notif => 
      notif.type === 'sla_breach' && 
      notif.ticket && 
      notif.ticket._id.toString() === ticket._id.toString() &&
      new Date(notif.createdAt) > new Date(Date.now() - 2 * 60 * 60 * 1000) // Within last 2 hours
    );

    if (!hasRecentBreach) {
      await notificationService.notifySLABreach(ticket);
      
      // Auto-escalate the ticket
      await this.escalateTicket(ticket);
    }
  }

  async escalateTicket(ticket) {
    try {
      // Update ticket priority if it's not already urgent
      if (ticket.priority !== 'urgent') {
        ticket.priority = 'urgent';
        await ticket.save();
      }

      // Add internal note about escalation
      const escalationNote = {
        note: `Ticket escalated due to SLA breach or inactivity. Priority updated to urgent.`,
        addedBy: null, // System escalation
        addedAt: new Date()
      };

      ticket.internalNotes.push(escalationNote);
      await ticket.save();

      // Notify admins about escalation
      const User = require('../models/User');
      const admins = await User.find({ role: 'admin', isActive: true });
      
      for (const admin of admins) {
        await notificationService.createNotification(
          admin._id,
          'ticket_escalated',
          'Ticket Escalated',
          `Ticket "${ticket.title}" has been escalated due to SLA breach or inactivity.`,
          {
            ticketId: ticket._id,
            priority: 'urgent'
          }
        );
      }

      console.log(`Ticket ${ticket._id} escalated successfully`);
    } catch (error) {
      console.error('Error escalating ticket:', error);
    }
  }

  // Calculate SLA due date based on priority
  calculateSLADueDate(priority, createdAt = new Date()) {
    const slaHours = {
      'urgent': 2,    // 2 hours
      'high': 8,      // 8 hours
      'medium': 24,   // 24 hours
      'low': 72       // 72 hours
    };

    const hours = slaHours[priority] || slaHours['medium'];
    return new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  }

  // Update ticket SLA when priority changes
  async updateTicketSLA(ticketId, newPriority) {
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) return;

      const newDueDate = this.calculateSLADueDate(newPriority, ticket.createdAt);
      
      ticket.sla.dueDate = newDueDate;
      ticket.priority = newPriority;
      
      await ticket.save();
      
      return ticket;
    } catch (error) {
      console.error('Error updating ticket SLA:', error);
      throw error;
    }
  }

  // Get SLA statistics
  async getSLAStats() {
    try {
      const now = new Date();
      
      const stats = await Ticket.aggregate([
        {
          $match: {
            status: { $in: ['open', 'in_progress', 'resolved', 'closed'] }
          }
        },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            onTime: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'resolved'] },
                      { $eq: ['$status', 'closed'] },
                      { $lt: ['$sla.dueDate', now] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            breached: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$status', ['open', 'in_progress']] },
                      { $lt: ['$sla.dueDate', now] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            warning: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $in: ['$status', ['open', 'in_progress']] },
                      { $gte: ['$sla.dueDate', now] },
                      { $lte: ['$sla.dueDate', new Date(now.getTime() + 2 * 60 * 60 * 1000)] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      const result = stats[0] || {
        totalTickets: 0,
        onTime: 0,
        breached: 0,
        warning: 0
      };

      result.slaCompliance = result.totalTickets > 0 
        ? Math.round((result.onTime / result.totalTickets) * 100) 
        : 100;

      return result;
    } catch (error) {
      console.error('Error getting SLA stats:', error);
      throw error;
    }
  }
}

module.exports = new SLAService();
