const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid token - user not found' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(500).json({ message: 'Token verification failed' });
  }
};

// Check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required roles: ${roles.join(', ')}` 
      });
    }

    next();
  };
};

// Check if user can access ticket
const canAccessTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const Ticket = require('../models/Ticket');
    
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const user = req.user;
    
    // Admin can access all tickets
    if (user.role === 'admin') {
      req.ticket = ticket;
      return next();
    }
    
    // Agent can access assigned tickets or unassigned tickets
    if (user.role === 'agent') {
      if (!ticket.assignedTo || ticket.assignedTo.toString() === user._id.toString()) {
        req.ticket = ticket;
        return next();
      }
    }
    
    // User can only access their own tickets
    if (user.role === 'user' && ticket.createdBy.toString() === user._id.toString()) {
      req.ticket = ticket;
      return next();
    }

    return res.status(403).json({ message: 'Access denied to this ticket' });
  } catch (error) {
    return res.status(500).json({ message: 'Error checking ticket access' });
  }
};

// Optional authentication (for public routes that might need user context)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  authorize,
  canAccessTicket,
  optionalAuth
};
