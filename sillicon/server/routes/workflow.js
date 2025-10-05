const express = require('express');
const { body, validationResult } = require('express-validator');
const workflowService = require('../services/workflowService');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/workflow/rules
// @desc    Get all workflow rules
// @access  Private (agents and admins)
router.get('/rules', authenticateToken, authorize('agent', 'admin'), async (req, res) => {
  try {
    const rules = workflowService.getRules();
    res.json({ rules });
  } catch (error) {
    console.error('Get workflow rules error:', error);
    res.status(500).json({ message: 'Server error fetching workflow rules' });
  }
});

// @route   POST /api/workflow/rules
// @desc    Create new workflow rule
// @access  Private (admins only)
router.post('/rules', authenticateToken, authorize('admin'), [
  body('name').trim().isLength({ min: 3, max: 50 }).withMessage('Name must be 3-50 characters'),
  body('description').trim().isLength({ max: 200 }).withMessage('Description must be max 200 characters'),
  body('trigger').isIn(['ticket_created', 'ticket_updated', 'ticket_assigned', 'ticket_resolved']).withMessage('Invalid trigger'),
  body('conditions').isArray().withMessage('Conditions must be an array'),
  body('actions').isArray().withMessage('Actions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const rule = await workflowService.createCustomRule(req.body);

    res.status(201).json({
      message: 'Workflow rule created successfully',
      rule
    });
  } catch (error) {
    console.error('Create workflow rule error:', error);
    res.status(500).json({ message: 'Server error creating workflow rule' });
  }
});

// @route   DELETE /api/workflow/rules/:name
// @desc    Delete workflow rule
// @access  Private (admins only)
router.delete('/rules/:name', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { name } = req.params;
    workflowService.removeRule(name);

    res.json({ message: 'Workflow rule deleted successfully' });
  } catch (error) {
    console.error('Delete workflow rule error:', error);
    res.status(500).json({ message: 'Server error deleting workflow rule' });
  }
});

// @route   POST /api/workflow/test
// @desc    Test workflow rule
// @access  Private (agents and admins)
router.post('/test', authenticateToken, authorize('agent', 'admin'), [
  body('ruleName').trim().isLength({ min: 1 }).withMessage('Rule name is required'),
  body('ticketData').isObject().withMessage('Ticket data must be an object')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { ruleName, ticketData } = req.body;
    const result = await workflowService.testRule(ruleName, ticketData);

    res.json({ result });
  } catch (error) {
    console.error('Test workflow rule error:', error);
    if (error.message === 'Rule not found') {
      return res.status(404).json({ message: 'Workflow rule not found' });
    }
    res.status(500).json({ message: 'Server error testing workflow rule' });
  }
});

// @route   GET /api/workflow/stats
// @desc    Get workflow statistics
// @access  Private (agents and admins)
router.get('/stats', authenticateToken, authorize('agent', 'admin'), async (req, res) => {
  try {
    const stats = await workflowService.getWorkflowStats();
    res.json({ stats });
  } catch (error) {
    console.error('Get workflow stats error:', error);
    res.status(500).json({ message: 'Server error fetching workflow statistics' });
  }
});

module.exports = router;

