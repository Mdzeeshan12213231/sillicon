const express = require('express');
const { query, param, validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('unreadOnly').optional().isBoolean().withMessage('unreadOnly must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const result = await notificationService.getNotifications(req.user._id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });

    res.json(result);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);
    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error fetching unread count' });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.patch('/:id/read', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid notification ID')
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
    const notification = await notificationService.markAsRead(id, req.user._id);

    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    if (error.message === 'Notification not found') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

// @route   PATCH /api/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user._id);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({ message: 'Server error marking all notifications as read' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', authenticateToken, [
  param('id').isMongoId().withMessage('Invalid notification ID')
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
    
    const Notification = require('../models/Notification');
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

module.exports = router;
