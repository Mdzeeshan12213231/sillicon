const aiService = require('./aiService');
const knowledgeBaseService = require('./knowledgeBaseService');
const notificationService = require('./notificationService');

class SupportBotService {
  constructor() {
    this.botResponses = new Map();
    this.conversationContexts = new Map();
    this.initializeBotResponses();
  }

  // Initialize common bot responses
  initializeBotResponses() {
    this.botResponses.set('greeting', [
      "Hello! I'm here to help you with any questions or issues you might have. How can I assist you today?",
      "Hi there! Welcome to our support. What can I help you with?",
      "Good day! I'm your virtual assistant. How may I help you today?"
    ]);

    this.botResponses.set('farewell', [
      "Thank you for contacting us! Have a great day!",
      "I'm glad I could help! Feel free to reach out if you need anything else.",
      "Take care! Don't hesitate to contact us again if you need assistance."
    ]);

    this.botResponses.set('escalation', [
      "I understand this is a complex issue. Let me connect you with one of our human agents who can provide more specialized assistance.",
      "This requires more detailed attention. I'm transferring you to our support team.",
      "I'd like to get you the best help possible. Let me connect you with a specialist."
    ]);

    this.botResponses.set('unclear', [
      "I want to make sure I understand your issue correctly. Could you provide more details?",
      "Could you help me understand this better? What specific problem are you experiencing?",
      "I'd like to help you effectively. Can you give me more information about what's happening?"
    ]);
  }

  // Process user message and generate response
  async processMessage(userMessage, userId, ticketId = null, context = {}) {
    try {
      // Get conversation context
      const conversationId = ticketId || userId;
      const contextData = this.conversationContexts.get(conversationId) || {
        messages: [],
        intent: null,
        confidence: 0,
        suggestedActions: []
      };

      // Analyze user intent and sentiment
      const analysis = await this.analyzeUserMessage(userMessage, contextData);
      
      // Update context
      contextData.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        sentiment: analysis.sentiment,
        intent: analysis.intent
      });

      // Generate bot response
      const botResponse = await this.generateResponse(analysis, contextData, ticketId);
      
      // Update context with bot response
      contextData.messages.push({
        role: 'bot',
        content: botResponse.content,
        timestamp: new Date(),
        confidence: botResponse.confidence,
        suggestedActions: botResponse.suggestedActions
      });

      // Store updated context
      this.conversationContexts.set(conversationId, contextData);

      // If escalation is needed, create ticket or notify agents
      if (botResponse.escalate) {
        await this.handleEscalation(userId, userMessage, ticketId, analysis);
      }

      return {
        response: botResponse.content,
        confidence: botResponse.confidence,
        suggestedActions: botResponse.suggestedActions,
        escalate: botResponse.escalate,
        context: contextData
      };
    } catch (error) {
      console.error('Error processing bot message:', error);
      return {
        response: "I'm sorry, I'm experiencing some technical difficulties. Let me connect you with a human agent.",
        confidence: 0.1,
        suggestedActions: ["Contact support"],
        escalate: true,
        context: {}
      };
    }
  }

  // Analyze user message for intent and sentiment
  async analyzeUserMessage(message, context) {
    try {
      // Use AI service for advanced analysis
      const analysis = await aiService.generateBotResponse(message, JSON.stringify(context));
      
      // Determine intent based on keywords and context
      const intent = this.determineIntent(message, analysis);
      
      // Determine sentiment
      const sentiment = this.determineSentiment(message, analysis);
      
      return {
        intent,
        sentiment,
        confidence: analysis.confidence,
        keywords: this.extractKeywords(message),
        suggestedActions: analysis.suggested_actions || []
      };
    } catch (error) {
      console.error('Error analyzing user message:', error);
      return {
        intent: 'general',
        sentiment: 'neutral',
        confidence: 0.5,
        keywords: [],
        suggestedActions: []
      };
    }
  }

  // Generate appropriate bot response
  async generateResponse(analysis, context, ticketId) {
    const { intent, sentiment, confidence } = analysis;

    // High confidence responses for common intents
    if (confidence > 0.8) {
      switch (intent) {
        case 'greeting':
          return {
            content: this.getRandomResponse('greeting'),
            confidence: 0.9,
            suggestedActions: ['Ask question', 'Report issue', 'Check status'],
            escalate: false
          };

        case 'farewell':
          return {
            content: this.getRandomResponse('farewell'),
            confidence: 0.9,
            suggestedActions: [],
            escalate: false
          };

        case 'check_status':
          return await this.handleStatusCheck(ticketId);

        case 'password_reset':
          return this.handlePasswordReset();

        case 'billing_inquiry':
          return this.handleBillingInquiry();

        case 'technical_issue':
          return await this.handleTechnicalIssue(analysis.keywords);

        case 'feature_request':
          return this.handleFeatureRequest();

        case 'complaint':
          return this.handleComplaint(sentiment);
      }
    }

    // Medium confidence - try to help with knowledge base
    if (confidence > 0.5) {
      const suggestions = await this.getKnowledgeBaseSuggestions(analysis.keywords);
      if (suggestions.length > 0) {
        return {
          content: this.formatKnowledgeBaseResponse(suggestions),
          confidence: 0.7,
          suggestedActions: ['View article', 'Contact agent'],
          escalate: false
        };
      }
    }

    // Low confidence - ask for clarification or escalate
    if (confidence < 0.3) {
      return {
        content: this.getRandomResponse('unclear'),
        confidence: 0.3,
        suggestedActions: ['Provide more details', 'Contact agent'],
        escalate: false
      };
    }

    // Default escalation
    return {
      content: this.getRandomResponse('escalation'),
      confidence: 0.5,
      suggestedActions: ['Contact agent', 'Create ticket'],
      escalate: true
    };
  }

  // Handle status check requests
  async handleStatusCheck(ticketId) {
    if (!ticketId) {
      return {
        content: "I'd be happy to check your ticket status. Could you provide your ticket number?",
        confidence: 0.8,
        suggestedActions: ['Provide ticket number', 'Create new ticket'],
        escalate: false
      };
    }

    // In a real implementation, you'd fetch the ticket status
    return {
      content: "I can help you check your ticket status. Let me look that up for you.",
      confidence: 0.8,
      suggestedActions: ['View ticket details', 'Add comment'],
      escalate: false
    };
  }

  // Handle password reset requests
  handlePasswordReset() {
    return {
      content: "I can help you reset your password. Please visit our password reset page at [reset link] or I can guide you through the process. Do you have access to your registered email?",
      confidence: 0.9,
      suggestedActions: ['Reset password', 'Check email', 'Contact support'],
      escalate: false
    };
  }

  // Handle billing inquiries
  handleBillingInquiry() {
    return {
      content: "I can help with billing questions. For account-specific billing information, I'll need to connect you with our billing team. Would you like me to create a ticket for you?",
      confidence: 0.8,
      suggestedActions: ['Create billing ticket', 'View account', 'Contact billing'],
      escalate: true
    };
  }

  // Handle technical issues
  async handleTechnicalIssue(keywords) {
    const suggestions = await this.getKnowledgeBaseSuggestions(keywords, 'technical');
    
    if (suggestions.length > 0) {
      return {
        content: `I found some helpful articles that might solve your technical issue:\n\n${this.formatKnowledgeBaseResponse(suggestions)}\n\nIf these don't help, I can connect you with our technical team.`,
        confidence: 0.8,
        suggestedActions: ['View articles', 'Contact technical support'],
        escalate: false
      };
    }

    return {
      content: "I understand you're experiencing a technical issue. Let me connect you with our technical support team who can provide specialized assistance.",
      confidence: 0.7,
      suggestedActions: ['Contact technical support', 'Create ticket'],
      escalate: true
    };
  }

  // Handle feature requests
  handleFeatureRequest() {
    return {
      content: "Thank you for your feature request! I'll make sure our product team sees this. Would you like me to create a formal feature request ticket for you?",
      confidence: 0.9,
      suggestedActions: ['Create feature request', 'View roadmap', 'Contact product team'],
      escalate: true
    };
  }

  // Handle complaints
  handleComplaint(sentiment) {
    const responses = {
      angry: "I sincerely apologize for the frustration you're experiencing. I want to make this right for you. Let me connect you with a senior support agent immediately.",
      frustrated: "I understand your frustration, and I'm here to help resolve this issue. Let me get you connected with someone who can provide immediate assistance.",
      negative: "I'm sorry to hear about your experience. Let me connect you with our support team to address your concerns."
    };

    return {
      content: responses[sentiment] || responses.negative,
      confidence: 0.9,
      suggestedActions: ['Speak with manager', 'Escalate issue', 'File complaint'],
      escalate: true
    };
  }

  // Get knowledge base suggestions
  async getKnowledgeBaseSuggestions(keywords, category = null) {
    try {
      const searchQuery = keywords.join(' ');
      const result = await knowledgeBaseService.searchArticles(searchQuery, { category });
      return result.articles.slice(0, 3); // Return top 3 suggestions
    } catch (error) {
      console.error('Error getting knowledge base suggestions:', error);
      return [];
    }
  }

  // Format knowledge base response
  formatKnowledgeBaseResponse(suggestions) {
    if (suggestions.length === 0) return "I couldn't find specific articles for your issue.";

    return suggestions.map((article, index) => 
      `${index + 1}. **${article.title}**\n   ${article.excerpt}\n   [Read more](${article.url})`
    ).join('\n\n');
  }

  // Handle escalation
  async handleEscalation(userId, userMessage, ticketId, analysis) {
    try {
      // Create or update ticket
      if (!ticketId) {
        // Create new ticket
        const Ticket = require('../models/Ticket');
        const ticket = new Ticket({
          title: `Bot Escalation: ${userMessage.substring(0, 50)}...`,
          description: userMessage,
          category: analysis.intent || 'general',
          priority: analysis.sentiment === 'angry' ? 'urgent' : 'medium',
          createdBy: userId,
          status: 'open',
          tags: ['bot-escalation']
        });

        await ticket.save();
        ticketId = ticket._id;

        // Notify agents
        await notificationService.createNotification(
          null, // Will be sent to all agents
          'ticket_created',
          'Bot Escalation - New Ticket',
          `A user has been escalated from the bot and a new ticket has been created.`,
          { ticketId, priority: 'high' }
        );
      } else {
        // Update existing ticket
        await notificationService.createNotification(
          null,
          'ticket_updated',
          'Bot Escalation - Ticket Updated',
          `A user has been escalated from the bot for an existing ticket.`,
          { ticketId, priority: 'medium' }
        );
      }

      return ticketId;
    } catch (error) {
      console.error('Error handling escalation:', error);
      throw error;
    }
  }

  // Helper methods
  determineIntent(message, analysis) {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('hello') || messageLower.includes('hi') || messageLower.includes('hey')) {
      return 'greeting';
    }
    if (messageLower.includes('bye') || messageLower.includes('goodbye') || messageLower.includes('thanks')) {
      return 'farewell';
    }
    if (messageLower.includes('status') || messageLower.includes('check') || messageLower.includes('ticket')) {
      return 'check_status';
    }
    if (messageLower.includes('password') || messageLower.includes('reset') || messageLower.includes('login')) {
      return 'password_reset';
    }
    if (messageLower.includes('bill') || messageLower.includes('payment') || messageLower.includes('charge')) {
      return 'billing_inquiry';
    }
    if (messageLower.includes('bug') || messageLower.includes('error') || messageLower.includes('not working')) {
      return 'technical_issue';
    }
    if (messageLower.includes('feature') || messageLower.includes('request') || messageLower.includes('suggestion')) {
      return 'feature_request';
    }
    if (messageLower.includes('complaint') || messageLower.includes('angry') || messageLower.includes('terrible')) {
      return 'complaint';
    }
    
    return analysis.intent || 'general';
  }

  determineSentiment(message, analysis) {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('angry') || messageLower.includes('furious') || messageLower.includes('terrible')) {
      return 'angry';
    }
    if (messageLower.includes('frustrated') || messageLower.includes('annoying') || messageLower.includes('upset')) {
      return 'frustrated';
    }
    if (messageLower.includes('great') || messageLower.includes('awesome') || messageLower.includes('excellent')) {
      return 'positive';
    }
    if (messageLower.includes('okay') || messageLower.includes('fine') || messageLower.includes('alright')) {
      return 'neutral';
    }
    
    return analysis.sentiment || 'neutral';
  }

  extractKeywords(message) {
    // Simple keyword extraction - in production, use more sophisticated NLP
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'];
    
    return message.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 10);
  }

  getRandomResponse(type) {
    const responses = this.botResponses.get(type) || ['I understand. How can I help you?'];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Clear conversation context
  clearContext(conversationId) {
    this.conversationContexts.delete(conversationId);
  }

  // Get conversation history
  getConversationHistory(conversationId) {
    return this.conversationContexts.get(conversationId) || { messages: [] };
  }
}

module.exports = new SupportBotService();

