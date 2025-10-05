const express = require('express');
const { body, validationResult } = require('express-validator');
const aiService = require('../services/aiService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/ai/classify-ticket
// @desc    Classify ticket using AI
// @access  Private
router.post('/classify-ticket', authenticateToken, [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description } = req.body;
    const classification = await aiService.classifyTicket(title, description);

    res.json({ classification });
  } catch (error) {
    console.error('AI classification error:', error);
    res.status(500).json({ message: 'Server error classifying ticket' });
  }
});

// @route   POST /api/ai/analyze-sentiment
// @desc    Analyze ticket sentiment
// @access  Private
router.post('/analyze-sentiment', authenticateToken, [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description } = req.body;
    const sentiment = await aiService.analyzeSentiment(title, description);

    res.json({ sentiment });
  } catch (error) {
    console.error('AI sentiment analysis error:', error);
    res.status(500).json({ message: 'Server error analyzing sentiment' });
  }
});

// @route   POST /api/ai/generate-responses
// @desc    Generate response suggestions for agents
// @access  Private (agents and admins)
router.post('/generate-responses', authenticateToken, [
  body('ticketId').isMongoId().withMessage('Invalid ticket ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { ticketId } = req.body;
    
    // Get ticket details
    const Ticket = require('../models/Ticket');
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Get knowledge base articles for context
    const knowledgeBaseService = require('../services/knowledgeBaseService');
    const suggestions = await knowledgeBaseService.generateTicketSuggestions(ticket);

    const responses = await aiService.generateResponseSuggestions(ticket, suggestions);

    res.json({ responses });
  } catch (error) {
    console.error('AI response generation error:', error);
    res.status(500).json({ message: 'Server error generating responses' });
  }
});

// @route   POST /api/ai/detect-duplicates
// @desc    Detect duplicate tickets
// @access  Private
router.post('/detect-duplicates', authenticateToken, [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description } = req.body;
    
    // Get recent tickets for comparison
    const Ticket = require('../models/Ticket');
    const recentTickets = await Ticket.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).select('title description status createdAt');

    const ticket = { title, description };
    const duplicates = await aiService.detectDuplicates(ticket, recentTickets);

    res.json({ duplicates });
  } catch (error) {
    console.error('AI duplicate detection error:', error);
    res.status(500).json({ message: 'Server error detecting duplicates' });
  }
});

// @route   POST /api/ai/translate
// @desc    Translate text
// @access  Private
router.post('/translate', authenticateToken, [
  body('text').trim().isLength({ min: 1, max: 1000 }).withMessage('Text must be 1-1000 characters'),
  body('targetLanguage').isLength({ min: 2, max: 5 }).withMessage('Target language must be 2-5 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { text, targetLanguage } = req.body;
    const translatedText = await aiService.translateText(text, targetLanguage);

    res.json({ translatedText });
  } catch (error) {
    console.error('AI translation error:', error);
    res.status(500).json({ message: 'Server error translating text' });
  }
});

// @route   POST /api/ai/generate-summary
// @desc    Generate ticket summary
// @access  Private
router.post('/generate-summary', authenticateToken, [
  body('ticketId').isMongoId().withMessage('Invalid ticket ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { ticketId } = req.body;
    
    // Get ticket and comments
    const Ticket = require('../models/Ticket');
    const Comment = require('../models/Comment');
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const comments = await Comment.find({ ticket: ticketId })
      .populate('author', 'name')
      .sort({ createdAt: 1 });

    const summary = await aiService.generateTicketSummary(ticket, comments);

    res.json({ summary });
  } catch (error) {
    console.error('AI summary generation error:', error);
    res.status(500).json({ message: 'Server error generating summary' });
  }
});

module.exports = router;

