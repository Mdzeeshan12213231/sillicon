const Ticket = require('../models/Ticket');
const User = require('../models/User');
const notificationService = require('./notificationService');
const aiService = require('./aiService');

class WorkflowService {
  constructor() {
    this.rules = new Map();
    this.initializeDefaultRules();
  }

  // Initialize default workflow rules
  initializeDefaultRules() {
    // Auto-assignment rules
    this.addRule('auto_assign_technical', {
      condition: (ticket) => ticket.category === 'technical',
      action: async (ticket) => {
        const technicalAgents = await User.find({ 
          role: 'agent', 
          isActive: true,
          'preferences.specializations': { $in: ['technical'] }
        });
        
        if (technicalAgents.length > 0) {
          const randomAgent = technicalAgents[Math.floor(Math.random() * technicalAgents.length)];
          ticket.assignedTo = randomAgent._id;
          ticket.assignedAt = new Date();
          await ticket.save();
          
          await notificationService.notifyTicketAssigned(ticket, randomAgent._id, 'system');
        }
      }
    });

    // High priority escalation
    this.addRule('escalate_high_priority', {
      condition: (ticket) => ticket.priority === 'urgent' && ticket.status === 'open',
      action: async (ticket) => {
        // Notify all admins
        const admins = await User.find({ role: 'admin', isActive: true });
        for (const admin of admins) {
          await notificationService.createNotification(
            admin._id,
            'ticket_escalated',
            'Urgent Ticket Requires Attention',
            `Urgent ticket "${ticket.title}" needs immediate attention.`,
            { ticketId: ticket._id, priority: 'urgent' }
          );
        }
      }
    });

    // Auto-close inactive tickets
    this.addRule('auto_close_inactive', {
      condition: (ticket) => {
        const daysSinceUpdate = (Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return ticket.status === 'resolved' && daysSinceUpdate >= 7;
      },
      action: async (ticket) => {
        ticket.status = 'closed';
        await ticket.save();
        
        await notificationService.createNotification(
          ticket.createdBy,
          'ticket_closed',
          'Ticket Auto-Closed',
          `Your ticket "${ticket.title}" has been automatically closed due to inactivity.`,
          { ticketId: ticket._id }
        );
      }
    });

    // Auto-close resolved tickets after user confirmation
    this.addRule('auto_close_resolved', {
      condition: (ticket) => {
        const daysSinceResolved = (Date.now() - new Date(ticket.sla.resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
        return ticket.status === 'resolved' && daysSinceResolved >= 3;
      },
      action: async (ticket) => {
        ticket.status = 'closed';
        await ticket.save();
        
        await notificationService.createNotification(
          ticket.createdBy,
          'ticket_closed',
          'Ticket Closed',
          `Your ticket "${ticket.title}" has been closed. Thank you for using our support!`,
          { ticketId: ticket._id }
        );
      }
    });
  }

  // Add a new workflow rule
  addRule(name, rule) {
    this.rules.set(name, rule);
  }

  // Remove a workflow rule
  removeRule(name) {
    this.rules.delete(name);
  }

  // Execute workflow rules for a ticket
  async executeRules(ticket, trigger = 'ticket_created') {
    try {
      for (const [ruleName, rule] of this.rules) {
        if (rule.trigger && rule.trigger !== trigger) {
          continue;
        }

        if (rule.condition && rule.condition(ticket)) {
          console.log(`Executing workflow rule: ${ruleName}`);
          await rule.action(ticket);
        }
      }
    } catch (error) {
      console.error(`Error executing workflow rules for ticket ${ticket._id}:`, error);
    }
  }

  // Create custom workflow rule
  async createCustomRule(ruleData) {
    const rule = {
      name: ruleData.name,
      description: ruleData.description,
      trigger: ruleData.trigger || 'ticket_updated',
      condition: this.buildCondition(ruleData.conditions),
      action: this.buildAction(ruleData.actions),
      enabled: ruleData.enabled !== false
    };

    this.addRule(ruleData.name, rule);
    return rule;
  }

  // Build condition function from rule data
  buildCondition(conditions) {
    return (ticket) => {
      return conditions.every(condition => {
        switch (condition.field) {
          case 'category':
            return condition.operator === 'equals' ? 
              ticket.category === condition.value : 
              ticket.category !== condition.value;
          
          case 'priority':
            return condition.operator === 'equals' ? 
              ticket.priority === condition.value : 
              ticket.priority !== condition.value;
          
          case 'status':
            return condition.operator === 'equals' ? 
              ticket.status === condition.value : 
              ticket.status !== condition.value;
          
          case 'assignedTo':
            return condition.operator === 'equals' ? 
              ticket.assignedTo?.toString() === condition.value : 
              ticket.assignedTo?.toString() !== condition.value;
          
          case 'createdAt':
            const daysSinceCreated = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            return condition.operator === 'greater_than' ? 
              daysSinceCreated > condition.value : 
              daysSinceCreated < condition.value;
          
          case 'updatedAt':
            const daysSinceUpdated = (Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            return condition.operator === 'greater_than' ? 
              daysSinceUpdated > condition.value : 
              daysSinceUpdated < condition.value;
          
          default:
            return false;
        }
      });
    };
  }

  // Build action function from rule data
  buildAction(actions) {
    return async (ticket) => {
      for (const action of actions) {
        switch (action.type) {
          case 'assign_to_agent':
            ticket.assignedTo = action.value;
            ticket.assignedAt = new Date();
            await ticket.save();
            
            await notificationService.notifyTicketAssigned(ticket, action.value, 'workflow');
            break;
          
          case 'change_priority':
            ticket.priority = action.value;
            await ticket.save();
            break;
          
          case 'change_status':
            ticket.status = action.value;
            if (action.value === 'resolved') {
              ticket.sla.resolvedAt = new Date();
            }
            await ticket.save();
            break;
          
          case 'add_tag':
            if (!ticket.tags) ticket.tags = [];
            if (!ticket.tags.includes(action.value)) {
              ticket.tags.push(action.value);
              await ticket.save();
            }
            break;
          
          case 'send_notification':
            await notificationService.createNotification(
              action.recipient === 'ticket_creator' ? ticket.createdBy : action.recipient,
              'workflow_notification',
              action.title,
              action.message,
              { ticketId: ticket._id }
            );
            break;
          
          case 'escalate_to_admin':
            const admins = await User.find({ role: 'admin', isActive: true });
            for (const admin of admins) {
              await notificationService.createNotification(
                admin._id,
                'ticket_escalated',
                'Ticket Escalated by Workflow',
                `Ticket "${ticket.title}" has been escalated by workflow rule.`,
                { ticketId: ticket._id, priority: 'urgent' }
              );
            }
            break;
        }
      }
    };
  }

  // Get all workflow rules
  getRules() {
    return Array.from(this.rules.entries()).map(([name, rule]) => ({
      name,
      ...rule
    }));
  }

  // Test a workflow rule
  async testRule(ruleName, ticketData) {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new Error('Rule not found');
    }

    const mockTicket = {
      ...ticketData,
      _id: 'test-ticket-id'
    };

    const conditionResult = rule.condition(mockTicket);
    return {
      conditionResult,
      wouldExecute: conditionResult
    };
  }

  // Get workflow statistics
  async getWorkflowStats() {
    const stats = {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(rule => rule.enabled !== false).length,
      rulesByTrigger: {}
    };

    for (const [name, rule] of this.rules) {
      const trigger = rule.trigger || 'ticket_created';
      stats.rulesByTrigger[trigger] = (stats.rulesByTrigger[trigger] || 0) + 1;
    }

    return stats;
  }
}

module.exports = new WorkflowService();

