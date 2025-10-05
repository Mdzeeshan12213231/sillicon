const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const knowledgeBaseService = require('../services/knowledgeBaseService');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/knowledge-base/search
// @desc    Search knowledge base articles
// @access  Private
router.get('/search', authenticateToken, [
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().isIn(['technical', 'billing', 'general', 'faq', 'troubleshooting', 'how-to']).withMessage('Invalid category'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50'),
  query('sortBy').optional().isIn(['relevance', 'views', 'helpful', 'recent']).withMessage('Invalid sortBy')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { q, category, page = 1, limit = 10, sortBy = 'relevance' } = req.query;

    const result = await knowledgeBaseService.searchArticles(q, {
      category,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy
    });

    res.json(result);
  } catch (error) {
    console.error('Search knowledge base error:', error);
    res.status(500).json({ message: 'Server error searching knowledge base' });
  }
});

// @route   GET /api/knowledge-base/suggestions/:ticketId
// @desc    Get article suggestions for a ticket
// @access  Private
router.get('/suggestions/:ticketId', authenticateToken, [
  param('ticketId').isMongoId().withMessage('Invalid ticket ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { ticketId } = req.params;
    
    const Ticket = require('../models/Ticket');
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const suggestions = await knowledgeBaseService.generateTicketSuggestions(ticket);

    res.json({ suggestions });
  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({ message: 'Server error getting suggestions' });
  }
});

// @route   GET /api/knowledge-base/popular
// @desc    Get popular articles
// @access  Private
router.get('/popular', authenticateToken, [
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { limit = 10 } = req.query;
    const articles = await knowledgeBaseService.getPopularArticles(parseInt(limit));

    res.json({ articles });
  } catch (error) {
    console.error('Get popular articles error:', error);
    res.status(500).json({ message: 'Server error fetching popular articles' });
  }
});

// @route   GET /api/knowledge-base/category/:category
// @desc    Get articles by category
// @access  Private
router.get('/category/:category', authenticateToken, [
  param('category').isIn(['technical', 'billing', 'general', 'faq', 'troubleshooting', 'how-to']).withMessage('Invalid category'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    const articles = await knowledgeBaseService.getArticlesByCategory(category, parseInt(limit));

    res.json({ articles });
  } catch (error) {
    console.error('Get articles by category error:', error);
    res.status(500).json({ message: 'Server error fetching articles by category' });
  }
});

// @route   GET /api/knowledge-base/:id
// @desc    Get single article
// @access  Private
router.get('/:id', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid article ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const article = await knowledgeBaseService.getArticle(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ message: 'Server error fetching article' });
  }
});

// @route   POST /api/knowledge-base
// @desc    Create new article
// @access  Private (agents and admins)
router.post('/', authenticateToken, authorize('agent', 'admin'), [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('content').trim().isLength({ min: 50, max: 10000 }).withMessage('Content must be 50-10000 characters'),
  body('category').isIn(['technical', 'billing', 'general', 'faq', 'troubleshooting', 'how-to']).withMessage('Invalid category'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Each tag must be max 50 characters'),
  body('keywords').optional().isArray().withMessage('Keywords must be an array'),
  body('excerpt').optional().trim().isLength({ max: 300 }).withMessage('Excerpt must be max 300 characters'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const article = await knowledgeBaseService.createArticle(req.body, req.user._id);

    res.status(201).json({
      message: 'Article created successfully',
      article
    });
  } catch (error) {
    console.error('Create article error:', error);
    res.status(500).json({ message: 'Server error creating article' });
  }
});

// @route   PUT /api/knowledge-base/:id
// @desc    Update article
// @access  Private (agents and admins)
router.put('/:id', authenticateToken, authorize('agent', 'admin'), [
  param('id').isMongoId().withMessage('Invalid article ID'),
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('content').optional().trim().isLength({ min: 50, max: 10000 }).withMessage('Content must be 50-10000 characters'),
  body('category').optional().isIn(['technical', 'billing', 'general', 'faq', 'troubleshooting', 'how-to']).withMessage('Invalid category'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isLength({ max: 50 }).withMessage('Each tag must be max 50 characters'),
  body('keywords').optional().isArray().withMessage('Keywords must be an array'),
  body('excerpt').optional().trim().isLength({ max: 300 }).withMessage('Excerpt must be max 300 characters'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const article = await knowledgeBaseService.updateArticle(id, req.body, req.user._id);

    res.json({
      message: 'Article updated successfully',
      article
    });
  } catch (error) {
    console.error('Update article error:', error);
    if (error.message === 'Article not found') {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.status(500).json({ message: 'Server error updating article' });
  }
});

// @route   DELETE /api/knowledge-base/:id
// @desc    Delete article
// @access  Private (agents and admins)
router.delete('/:id', authenticateToken, authorize('agent', 'admin'), [
  param('id').isMongoId().withMessage('Invalid article ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const article = await knowledgeBaseService.deleteArticle(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Delete article error:', error);
    res.status(500).json({ message: 'Server error deleting article' });
  }
});

// @route   POST /api/knowledge-base/:id/rate
// @desc    Rate article
// @access  Private
router.post('/:id/rate', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid article ID'),
  body('isHelpful').isBoolean().withMessage('isHelpful must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { isHelpful } = req.body;

    const article = await knowledgeBaseService.rateArticle(id, isHelpful);

    res.json({
      message: 'Article rated successfully',
      article
    });
  } catch (error) {
    console.error('Rate article error:', error);
    if (error.message === 'Article not found') {
      return res.status(404).json({ message: 'Article not found' });
    }
    res.status(500).json({ message: 'Server error rating article' });
  }
});

// @route   GET /api/knowledge-base/stats/overview
// @desc    Get knowledge base statistics
// @access  Private (agents and admins)
router.get('/stats/overview', authenticateToken, authorize('agent', 'admin'), async (req, res) => {
  try {
    const stats = await knowledgeBaseService.getArticleStats();

    res.json({ stats });
  } catch (error) {
    console.error('Get knowledge base stats error:', error);
    res.status(500).json({ message: 'Server error fetching knowledge base statistics' });
  }
});

module.exports = router;
