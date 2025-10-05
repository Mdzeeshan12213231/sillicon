const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Ticket = require('../models/Ticket');
const { authenticateToken, canAccessTicket } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

// @route   POST /api/comments
// @desc    Create a new comment
// @access  Private
router.post('/', authenticateToken, [
  body('ticketId').isMongoId().withMessage('Valid ticket ID is required'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
  body('parentComment').optional().isMongoId().withMessage('Invalid parent comment ID'),
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

    const { ticketId, content, parentComment, isInternal = false } = req.body;

    // Check if user can access the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check access permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    if (req.user.role === 'agent' && ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    // Only agents and admins can create internal comments
    if (isInternal && !['agent', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only agents and admins can create internal comments' });
    }

    // Create comment
    const comment = new Comment({
      ticket: ticketId,
      author: req.user._id,
      content,
      parentComment: parentComment || null,
      isInternal
    });

    await comment.save();
    await comment.populate('author', 'name email avatar role');

    // Update ticket's last activity
    ticket.updatedAt = new Date();
    await ticket.save();

    // Send notifications
    await notificationService.notifyCommentAdded(ticket, comment, req.user._id);

    // Emit real-time event
    req.io.to(`ticket-${ticketId}`).emit('comment-added', {
      comment,
      message: `New comment added to ticket: ${ticket.title}`
    });

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error creating comment' });
  }
});

// @route   GET /api/comments/ticket/:ticketId
// @desc    Get all comments for a ticket
// @access  Private
router.get('/ticket/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { includeInternal = false } = req.query;

    // Check if user can access the ticket
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check access permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    if (req.user.role === 'agent' && ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    // Build filter
    const filter = { 
      ticket: ticketId, 
      isDeleted: false 
    };

    // Only show internal comments to agents and admins
    if (!includeInternal || !['agent', 'admin'].includes(req.user.role)) {
      filter.isInternal = false;
    }

    // Get comments with replies
    const comments = await Comment.find(filter)
      .populate('author', 'name email avatar role')
      .populate('assignmentChange.from', 'name email')
      .populate('assignmentChange.to', 'name email')
      .populate('reactions.users', 'name email')
      .sort({ createdAt: 1 });

    // Organize comments into threads
    const commentMap = new Map();
    const rootComments = [];

    comments.forEach(comment => {
      commentMap.set(comment._id.toString(), { ...comment.toObject(), replies: [] });
    });

    comments.forEach(comment => {
      if (comment.parentComment) {
        const parent = commentMap.get(comment.parentComment.toString());
        if (parent) {
          parent.replies.push(commentMap.get(comment._id.toString()));
        }
      } else {
        rootComments.push(commentMap.get(comment._id.toString()));
      }
    });

    res.json({
      comments: rootComments,
      total: comments.length
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error fetching comments' });
  }
});

// @route   PUT /api/comments/:id
// @desc    Update a comment
// @access  Private
router.put('/:id', authenticateToken, [
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters')
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
    const { content } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can modify this comment
    if (!comment.canBeModifiedBy(req.user._id.toString(), req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to modify this comment' });
    }

    // Update comment
    comment.content = content;
    await comment.save();
    await comment.populate('author', 'name email avatar role');

    // Emit real-time event
    req.io.to(`ticket-${comment.ticket}`).emit('comment-updated', {
      comment,
      message: 'Comment updated'
    });

    res.json({
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error updating comment' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment (soft delete)
// @access  Private
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can modify this comment
    if (!comment.canBeModifiedBy(req.user._id.toString(), req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to delete this comment' });
    }

    // Soft delete
    await comment.softDelete(req.user._id);

    // Emit real-time event
    req.io.to(`ticket-${comment.ticket}`).emit('comment-deleted', {
      commentId: id,
      message: 'Comment deleted'
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error deleting comment' });
  }
});

// @route   POST /api/comments/:id/reaction
// @desc    Add or remove reaction to comment
// @access  Private
router.post('/:id/reaction', authenticateToken, [
  body('emoji').trim().isLength({ min: 1, max: 10 }).withMessage('Emoji is required')
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
    const { emoji } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Check if user can access this comment
    const ticket = await Ticket.findById(comment.ticket);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check access permissions
    if (req.user.role === 'user' && ticket.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    if (req.user.role === 'agent' && ticket.assignedTo && ticket.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied to this ticket' });
    }

    // Find existing reaction
    let reaction = comment.reactions.find(r => r.emoji === emoji);
    
    if (reaction) {
      // Toggle user in reaction
      const userIndex = reaction.users.findIndex(userId => userId.toString() === req.user._id.toString());
      if (userIndex > -1) {
        reaction.users.splice(userIndex, 1);
        if (reaction.users.length === 0) {
          // Remove reaction if no users left
          comment.reactions = comment.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(req.user._id);
      }
    } else {
      // Create new reaction
      comment.reactions.push({
        emoji,
        users: [req.user._id]
      });
    }

    await comment.save();

    // Emit real-time event
    req.io.to(`ticket-${comment.ticket}`).emit('comment-reaction', {
      commentId: id,
      reactions: comment.reactions,
      message: 'Reaction updated'
    });

    res.json({
      message: 'Reaction updated successfully',
      reactions: comment.reactions
    });
  } catch (error) {
    console.error('Update reaction error:', error);
    res.status(500).json({ message: 'Server error updating reaction' });
  }
});

module.exports = router;
