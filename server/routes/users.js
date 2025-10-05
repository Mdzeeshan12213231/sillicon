const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const Ticket = require('../models/Ticket');
const { authenticateToken, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (agents and admins only)
// @access  Private (agents and admins)
router.get('/', authenticateToken, authorize('agent', 'admin'), [
  query('role').optional().isIn(['user', 'agent', 'admin']).withMessage('Invalid role'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
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
      role,
      search,
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const users = await User.find(filter)
      .select('-password')
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.json({
      users,
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
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// @route   GET /api/users/agents
// @desc    Get all agents for assignment dropdowns
// @access  Private (agents and admins)
router.get('/agents', authenticateToken, authorize('agent', 'admin'), async (req, res) => {
  try {
    const agents = await User.find({ 
      role: 'agent', 
      isActive: true 
    })
      .select('name email avatar')
      .sort({ name: 1 });

    res.json({ agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Server error fetching agents' });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Users can only view their own profile, agents and admins can view any
    if (req.user.role === 'user' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's ticket statistics
    const ticketStats = await Ticket.aggregate([
      { $match: { createdBy: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0
    };

    ticketStats.forEach(stat => {
      stats.total += stat.count;
      stats[stat._id] = stat.count;
    });

    res.json({
      user,
      ticketStats: stats
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private (admin only)
router.put('/:id', authenticateToken, authorize('admin'), [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['user', 'agent', 'admin']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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
    const updateData = req.body;

    // Remove password from update data
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Deactivate user (admin only)
// @access  Private (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating themselves
    if (req.user._id.toString() === id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deactivated successfully',
      user
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Server error deactivating user' });
  }
});

// @route   GET /api/users/:id/tickets
// @desc    Get user's tickets
// @access  Private
router.get('/:id/tickets', authenticateToken, [
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed', 'cancelled']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
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
    const { status, page = 1, limit = 10 } = req.query;

    // Check access permissions
    if (req.user.role === 'user' && req.user._id.toString() !== id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Build filter
    const filter = { createdBy: id };
    if (status) filter.status = status;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const tickets = await Ticket.find(filter)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
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
    console.error('Get user tickets error:', error);
    res.status(500).json({ message: 'Server error fetching user tickets' });
  }
});

module.exports = router;
