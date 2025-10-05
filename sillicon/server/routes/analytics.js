const express = require('express');
const { query, validationResult } = require('express-validator');
const analyticsService = require('../services/analyticsService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const analytics = await analyticsService.getDashboardAnalytics(req.user._id, req.user.role);
    res.json({ analytics });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard analytics' });
  }
});

// @route   GET /api/analytics/agent-performance/:agentId
// @desc    Get agent performance metrics
// @access  Private (agents and admins)
router.get('/agent-performance/:agentId', authenticateToken, [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { agentId } = req.params;
    const { startDate, endDate } = req.query;
    
    const dateRange = {};
    if (startDate) dateRange.startDate = new Date(startDate);
    if (endDate) dateRange.endDate = new Date(endDate);

    const performance = await analyticsService.getAgentPerformance(agentId, dateRange);
    res.json({ performance });
  } catch (error) {
    console.error('Get agent performance error:', error);
    res.status(500).json({ message: 'Server error fetching agent performance' });
  }
});

// @route   GET /api/analytics/trends
// @desc    Get trend analysis
// @access  Private
router.get('/trends', authenticateToken, [
  query('period').optional().isIn(['day', 'week', 'month']).withMessage('Period must be day, week, or month')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { period = 'week' } = req.query;
    
    // Build base filter based on user role
    let baseFilter = {};
    if (req.user.role === 'user') {
      baseFilter.createdBy = req.user._id;
    }

    const trends = await analyticsService.getTrendAnalysis(baseFilter, period);
    res.json({ trends });
  } catch (error) {
    console.error('Get trend analysis error:', error);
    res.status(500).json({ message: 'Server error fetching trend analysis' });
  }
});

// @route   GET /api/analytics/geographic
// @desc    Get geographic distribution
// @access  Private (agents and admins)
router.get('/geographic', authenticateToken, async (req, res) => {
  try {
    const distribution = await analyticsService.getGeographicDistribution();
    res.json({ distribution });
  } catch (error) {
    console.error('Get geographic distribution error:', error);
    res.status(500).json({ message: 'Server error fetching geographic distribution' });
  }
});

// @route   GET /api/analytics/predictions
// @desc    Get ticket trend predictions
// @access  Private (agents and admins)
router.get('/predictions', authenticateToken, async (req, res) => {
  try {
    // Build base filter based on user role
    let baseFilter = {};
    if (req.user.role === 'user') {
      baseFilter.createdBy = req.user._id;
    }

    const predictions = await analyticsService.predictTicketTrends(baseFilter);
    res.json({ predictions });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ message: 'Server error fetching predictions' });
  }
});

module.exports = router;

