const express = require('express');
const { body, param, validationResult } = require('express-validator');
const ChatThread = require('../models/ChatThread');
const { authenticateToken } = require('../middleware/auth');
const supportBotService = require('../services/supportBotService');

const router = express.Router();

// @route   GET /api/chat/threads
// @desc    Get chat threads for user
// @access  Private
router.get('/threads', authenticateToken, async (req, res) => {
  try {
    const threads = await ChatThread.findForUser(req.user._id, req.user.role);
    res.json({ threads });
  } catch (error) {
    console.error('Get chat threads error:', error);
    res.status(500).json({ message: 'Server error fetching chat threads' });
  }
});

// @route   GET /api/chat/threads/:threadId
// @desc    Get specific chat thread
// @access  Private
router.get('/threads/:threadId', authenticateToken, [
  param('threadId').isMongoId().withMessage('Invalid thread ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { threadId } = req.params;
    const thread = await ChatThread.findById(threadId)
      .populate('ticket', 'title status priority')
      .populate('participants.user', 'name email avatar')
      .populate('messages.sender', 'name email avatar');

    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    // Check if user is participant
    const isParticipant = thread.participants.some(p => 
      p.user._id.toString() === req.user._id.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied to this chat thread' });
    }

    res.json({ thread });
  } catch (error) {
    console.error('Get chat thread error:', error);
    res.status(500).json({ message: 'Server error fetching chat thread' });
  }
});

// @route   POST /api/chat/threads
// @desc    Create new chat thread
// @access  Private
router.post('/threads', authenticateToken, [
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

    // Check if thread already exists for this ticket
    const existingThread = await ChatThread.findOne({ ticket: ticketId, isActive: true });
    if (existingThread) {
      return res.status(409).json({ 
        message: 'Chat thread already exists for this ticket',
        threadId: existingThread._id
      });
    }

    // Create new thread
    const thread = new ChatThread({
      ticket: ticketId,
      participants: [{
        user: req.user._id,
        role: req.user.role === 'user' ? 'customer' : req.user.role,
        joinedAt: new Date(),
        isActive: true
      }]
    });

    await thread.save();
    await thread.populate('ticket', 'title status priority');
    await thread.populate('participants.user', 'name email avatar');

    res.status(201).json({
      message: 'Chat thread created successfully',
      thread
    });
  } catch (error) {
    console.error('Create chat thread error:', error);
    res.status(500).json({ message: 'Server error creating chat thread' });
  }
});

// @route   POST /api/chat/threads/:threadId/messages
// @desc    Send message to chat thread
// @access  Private
router.post('/threads/:threadId/messages', authenticateToken, [
  param('threadId').isMongoId().withMessage('Invalid thread ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be 1-2000 characters'),
  body('messageType').optional().isIn(['text', 'image', 'file', 'system']).withMessage('Invalid message type'),
  body('isInternal').optional().isBoolean().withMessage('isInternal must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { threadId } = req.params;
    const { content, messageType = 'text', attachments = [], isInternal = false } = req.body;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    // Check if user is participant
    const isParticipant = thread.participants.some(p => 
      p.user.toString() === req.user._id.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied to this chat thread' });
    }

    // Add message
    await thread.addMessage(req.user._id, content, messageType, attachments, isInternal);

    // Emit real-time event
    req.io.to(`chat-${threadId}`).emit('new-message', {
      threadId,
      message: {
        sender: req.user._id,
        content,
        messageType,
        attachments,
        isInternal,
        timestamp: new Date()
      }
    });

    res.status(201).json({
      message: 'Message sent successfully',
      threadId
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// @route   POST /api/chat/threads/:threadId/participants
// @desc    Add participant to chat thread
// @access  Private
router.post('/threads/:threadId/participants', authenticateToken, [
  param('threadId').isMongoId().withMessage('Invalid thread ID'),
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('role').isIn(['customer', 'agent', 'admin']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { threadId } = req.params;
    const { userId, role } = req.body;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    // Check if user has permission to add participants
    const isAdminOrAgent = req.user.role === 'admin' || req.user.role === 'agent';
    if (!isAdminOrAgent) {
      return res.status(403).json({ message: 'Permission denied to add participants' });
    }

    await thread.addParticipant(userId, role);

    res.json({ message: 'Participant added successfully' });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({ message: 'Server error adding participant' });
  }
});

// @route   POST /api/chat/threads/:threadId/mark-read
// @desc    Mark messages as read
// @access  Private
router.post('/threads/:threadId/mark-read', authenticateToken, [
  param('threadId').isMongoId().withMessage('Invalid thread ID'),
  body('messageId').optional().isMongoId().withMessage('Invalid message ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { threadId } = req.params;
    const { messageId } = req.body;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    await thread.markAsRead(req.user._id, messageId);

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({ message: 'Server error marking messages as read' });
  }
});

// @route   POST /api/chat/bot
// @desc    Send message to support bot
// @access  Private
router.post('/bot', authenticateToken, [
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  body('ticketId').optional().isMongoId().withMessage('Invalid ticket ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { message, ticketId } = req.body;
    const response = await supportBotService.processMessage(message, req.user._id, ticketId);

    res.json({ response });
  } catch (error) {
    console.error('Bot message error:', error);
    res.status(500).json({ message: 'Server error processing bot message' });
  }
});

module.exports = router;

