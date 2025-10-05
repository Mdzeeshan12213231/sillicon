const axios = require('axios');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiBaseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  // AI-powered ticket classification
  async classifyTicket(title, description) {
    try {
      const prompt = `
        Analyze this support ticket and classify it into the most appropriate category.
        
        Title: "${title}"
        Description: "${description}"
        
        Categories: technical, billing, general, bug_report, feature_request, login_issue, account_issue, payment_issue, product_issue, service_issue
        
        Return only the category name and a confidence score (0-1) in JSON format:
        {"category": "category_name", "confidence": 0.95, "reasoning": "brief explanation"}
      `;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error classifying ticket:', error);
      return { category: 'general', confidence: 0.5, reasoning: 'Unable to classify' };
    }
  }

  // Sentiment analysis
  async analyzeSentiment(title, description) {
    try {
      const prompt = `
        Analyze the sentiment and urgency of this support ticket.
        
        Title: "${title}"
        Description: "${description}"
        
        Return JSON with:
        - sentiment: "positive", "neutral", "negative", "angry", "frustrated"
        - urgency: "low", "medium", "high", "critical"
        - confidence: 0-1
        - keywords: array of emotional keywords found
        - suggested_priority: "low", "medium", "high", "urgent"
      `;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return { 
        sentiment: 'neutral', 
        urgency: 'medium', 
        confidence: 0.5, 
        keywords: [], 
        suggested_priority: 'medium' 
      };
    }
  }

  // Generate response suggestions for agents
  async generateResponseSuggestions(ticket, knowledgeBaseArticles = []) {
    try {
      const context = knowledgeBaseArticles.map(article => 
        `Title: ${article.title}\nContent: ${article.excerpt}`
      ).join('\n\n');

      const prompt = `
        As a helpful support agent, suggest 3 professional responses for this ticket.
        
        Ticket Details:
        Title: "${ticket.title}"
        Description: "${ticket.description}"
        Category: "${ticket.category}"
        Priority: "${ticket.priority}"
        
        Knowledge Base Context:
        ${context}
        
        Provide 3 different response approaches:
        1. Acknowledgment and immediate solution
        2. Investigation and follow-up approach  
        3. Escalation and expert consultation
        
        Return JSON array with:
        [{"type": "immediate", "response": "suggested text", "tone": "professional"},
         {"type": "investigation", "response": "suggested text", "tone": "helpful"},
         {"type": "escalation", "response": "suggested text", "tone": "supportive"}]
      `;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating response suggestions:', error);
      return [];
    }
  }

  // Detect duplicate tickets
  async detectDuplicates(ticket, existingTickets) {
    try {
      const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
      const duplicates = [];

      for (const existingTicket of existingTickets) {
        const existingText = `${existingTicket.title} ${existingTicket.description}`.toLowerCase();
        
        // Simple similarity check using common words
        const similarity = this.calculateSimilarity(ticketText, existingText);
        
        if (similarity > 0.7) {
          duplicates.push({
            ticketId: existingTicket._id,
            title: existingTicket.title,
            similarity: similarity,
            status: existingTicket.status,
            createdAt: existingTicket.createdAt
          });
        }
      }

      return duplicates.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.error('Error detecting duplicates:', error);
      return [];
    }
  }

  // Generate FAQ bot responses
  async generateBotResponse(userMessage, context = '') {
    try {
      const prompt = `
        You are a helpful customer support bot. Respond to this user message professionally and helpfully.
        
        User Message: "${userMessage}"
        Context: "${context}"
        
        Guidelines:
        - Be friendly and professional
        - Provide helpful information
        - If you can't solve the issue, suggest escalating to a human agent
        - Keep responses concise but informative
        - Ask clarifying questions if needed
        
        Return JSON with:
        {"response": "bot response", "confidence": 0.95, "suggested_actions": ["action1", "action2"], "escalate": false}
      `;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating bot response:', error);
      return {
        response: "I'm sorry, I'm having trouble processing your request. Let me connect you with a human agent.",
        confidence: 0.1,
        suggested_actions: ["Contact support"],
        escalate: true
      };
    }
  }

  // Auto-translate text
  async translateText(text, targetLanguage = 'en') {
    try {
      const prompt = `
        Translate the following text to ${targetLanguage}. Return only the translated text.
        
        Text: "${text}"
      `;

      const response = await this.callOpenAI(prompt);
      return response.trim();
    } catch (error) {
      console.error('Error translating text:', error);
      return text; // Return original text if translation fails
    }
  }

  // Generate ticket summary
  async generateTicketSummary(ticket, comments = []) {
    try {
      const commentsText = comments.map(c => `${c.author.name}: ${c.content}`).join('\n');
      
      const prompt = `
        Generate a concise summary of this support ticket for reporting purposes.
        
        Ticket: "${ticket.title}"
        Description: "${ticket.description}"
        Status: "${ticket.status}"
        Priority: "${ticket.priority}"
        
        Comments:
        ${commentsText}
        
        Return JSON with:
        {"summary": "brief summary", "key_points": ["point1", "point2"], "resolution_status": "resolved/pending/escalated"}
      `;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error generating ticket summary:', error);
      return {
        summary: ticket.description.substring(0, 200) + '...',
        key_points: [],
        resolution_status: ticket.status
      };
    }
  }

  // Helper method to call OpenAI API
  async callOpenAI(prompt, model = 'gpt-3.5-turbo') {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      `${this.openaiBaseUrl}/chat/completions`,
      {
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant specialized in customer support and ticket management.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  // Calculate text similarity (simple implementation)
  calculateSimilarity(text1, text2) {
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Generate workflow automation suggestions
  async suggestWorkflowRules(ticketData) {
    try {
      const prompt = `
        Based on this ticket data, suggest workflow automation rules that could help.
        
        Ticket Data: ${JSON.stringify(ticketData, null, 2)}
        
        Suggest rules like:
        - Auto-assign based on category
        - Escalation rules based on priority and time
        - Auto-response rules
        - SLA adjustment rules
        
        Return JSON array of suggested rules.
      `;

      const response = await this.callOpenAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      console.error('Error suggesting workflow rules:', error);
      return [];
    }
  }
}

module.exports = new AIService();

