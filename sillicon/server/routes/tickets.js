const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Ticket = require('../models/Ticket');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { authenticateToken, authorize, canAccessTicket } = require('../middleware/auth');
const notificationService = require('../services/notificationService');
const knowledgeBaseService = require('../services/knowledgeBaseService');

const router = express.Router();

// @route   POST /api/tickets
// @desc    Create a new ticket
// @access  Private (all authenticated users)
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('category').isIn(['technical', 'billing', 'general', 'bug_report', 'feature_request']).withMessage('Invalid category'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().trim().isLength({ max: 20 }).withMessage('Each tag must be max 20 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description, category, priority = 'medium', tags = [] } = req.body;

    // Create ticket
    const ticket = new Ticket({
      title,
      description,
      category,
      priority,
      tags,
      createdBy: req.user._id
    });

    await ticket.save();
    await ticket.populate('createdBy', 'name email avatar');

    // Send notifications
    await notificationService.notifyTicketCreated(ticket);

    // Emit real-time event
    req.io.emit('ticket-created', {
      ticket: ticket,
      message: `New ticket created: ${ticket.title}`
    });

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error creating ticket' });
  }
});

// @route   GET /api/tickets
// @desc    Get all tickets with filtering, searching, and pagination
// @access  Private
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('category').optional().isIn(['technical', 'billing', 'general', 'bug_report', 'feature_request']).withMessage('Invalid category'),
  query('assignedTo').optional().isMongoId().withMessage('Invalid assignedTo ID'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Role-based filtering
    if (req.user.role === 'user') {
      filter.createdBy = req.user._id;
    } else if (req.user.role === 'agent') {
      filter.$or = [
        { assignedTo: req.user._id },
        { assignedTo: null }
      ];
    }
    // Admin can see all tickets

    // Apply filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;

    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Ticket.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      tickets,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext,
        hasPrev
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ message: 'Server error fetching tickets' });
  }
});

// @route   GET /api/tickets/:id
// @desc    Get single ticket by ID
// @access  Private (with access control)
router.get('/:id', authenticateToken, canAccessTicket, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('internalNotes.addedBy', 'name email avatar');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Get comments for this ticket
    const comments = await Comment.find({ 
      ticket: ticket._id, 
      isDeleted: false 
    })
      .populate('author', 'name email avatar role')
      .populate('assignmentChange.from', 'name email')
      .populate('assignmentChange.to', 'name email')
      .sort({ createdAt: 1 });

    res.json({
      ticket,
      comments
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    res.status(500).json({ message: 'Server error fetching ticket' });
  }
});

// @route   PATCH /api/tickets/:id
// @desc    Update ticket with optimistic locking
// @access  Private (with access control)
router.patch('/:id', authenticateToken, canAccessTicket, [
  body('title').optional().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5-200 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 5000 }).withMessage('Description must be 10-5000 characters'),
  body('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('assignedTo').optional().isMongoId().withMessage('Invalid assignedTo ID'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('version').isInt({ min: 0 }).withMessage('Version is required for optimistic locking')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { version, ...updateData } = req.body;
    const ticketId = req.params.id;

    // Check if user can modify this ticket
    if (!req.ticket.canBeModified(req.user.role, req.user._id.toString())) {
      return res.status(403).json({ message: 'You do not have permission to modify this ticket' });
    }

    // Optimistic locking check
    if (req.ticket.version !== version) {
      return res.status(409).json({ 
        message: 'Ticket has been modified by another user. Please refresh and try again.',
        currentVersion: req.ticket.version
      });
    }

    // Handle status changes
    if (updateData.status && updateData.status !== req.ticket.status) {
      updateData['sla.firstResponseAt'] = req.ticket.sla.firstResponseAt || new Date();
      
      if (updateData.status === 'resolved' || updateData.status === 'closed') {
        updateData['sla.resolvedAt'] = new Date();
      }
    }

    // Handle assignment changes
    if (updateData.assignedTo !== undefined) {
      if (updateData.assignedTo && updateData.assignedTo !== req.ticket.assignedTo?.toString()) {
        updateData.assignedAt = new Date();
      } else if (!updateData.assignedTo) {
        updateData.assignedAt = null;
      }
    }

    // Update ticket
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar');

    // Emit real-time event
    req.io.to(`ticket-${ticketId}`).emit('ticket-updated', {
      ticket: updatedTicket,
      message: `Ticket updated: ${updatedTicket.title}`
    });

    res.json({
      message: 'Ticket updated successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error updating ticket' });
  }
});

// @route   DELETE /api/tickets/:id
// @desc    Delete ticket (soft delete for admins)
// @access  Private (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Soft delete by changing status
    ticket.status = 'cancelled';
    await ticket.save();

    // Emit real-time event
    req.io.emit('ticket-deleted', {
      ticketId: ticket._id,
      message: `Ticket cancelled: ${ticket.title}`
    });

    res.json({ message: 'Ticket cancelled successfully' });
  } catch (error) {
    console.error('Delete ticket error:', error);
    res.status(500).json({ message: 'Server error deleting ticket' });
  }
});

// @route   GET /api/tickets/:id/suggestions
// @desc    Get knowledge base suggestions for a ticket
// @access  Private
router.get('/:id/suggestions', authenticateToken, canAccessTicket, async (req, res) => {
  try {
    const suggestions = await knowledgeBaseService.generateTicketSuggestions(req.ticket);
    res.json({ suggestions });
  } catch (error) {
    console.error('Get ticket suggestions error:', error);
    res.status(500).json({ message: 'Server error getting suggestions' });
  }
});

// @route   GET /api/tickets/stats/overview
// @desc    Get ticket statistics
// @access  Private
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // Build base filter
    let baseFilter = {};
    if (userRole === 'user') {
      baseFilter.createdBy = userId;
    } else if (userRole === 'agent') {
      baseFilter.$or = [
        { assignedTo: userId },
        { assignedTo: null }
      ];
    }

    // Get various statistics
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      myTickets,
      overdueTickets,
      recentTickets
    ] = await Promise.all([
      Ticket.countDocuments(baseFilter),
      Ticket.countDocuments({ ...baseFilter, status: 'open' }),
      Ticket.countDocuments({ ...baseFilter, status: 'in_progress' }),
      Ticket.countDocuments({ ...baseFilter, status: 'resolved' }),
      Ticket.countDocuments({ ...baseFilter, status: 'closed' }),
      userRole === 'agent' ? Ticket.countDocuments({ assignedTo: userId }) : 0,
      Ticket.countDocuments({ 
        ...baseFilter, 
        status: { $in: ['open', 'in_progress'] },
        'sla.dueDate': { $lt: new Date() }
      }),
      Ticket.find(baseFilter)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo', 'name email avatar')
        .sort({ createdAt: -1 })
        .limit(5)
    ]);

    res.json({
      overview: {
        total: totalTickets,
        open: openTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        closed: closedTickets,
        myTickets: myTickets,
        overdue: overdueTickets
      },
      recentTickets
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching statistics' });
  }
});

module.exports = router;
