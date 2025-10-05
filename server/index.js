const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const knowledgeBaseRoutes = require('./routes/knowledgeBase');
const aiRoutes = require('./routes/ai');
const workflowRoutes = require('./routes/workflow');
const analyticsRoutes = require('./routes/analytics');
const chatRoutes = require('./routes/chat');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000 // limit each IP to 1000 requests per windowMs (development)
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/helpdesk_mini';
const uriParts = dbUri.split('/');
const hasDbSegment = uriParts.length > 3 && uriParts[3] && !uriParts[3].includes('?');
if (!hasDbSegment) {
  console.warn('Warning: MongoDB URI does not specify a database name.');
}
console.log('Connecting to MongoDB...');
let connectionTimeout;
const connectPromise = mongoose.connect(dbUri, { serverSelectionTimeoutMS: 10000 });
connectionTimeout = setTimeout(() => {
  console.warn('MongoDB connection is taking longer than 10 seconds...');
}, 10000);
connectPromise
  .then(async () => {
    clearTimeout(connectionTimeout);
    console.log(`Connected to MongoDB: ${mongoose.connection.name}`);
    // Await model index creation
    const models = [
      require('./models/User'),
      require('./models/Ticket'),
      require('./models/Comment'),
      require('./models/Notification'),
      require('./models/KnowledgeBase'),
      require('./models/ChatThread'),
    ];
    try {
      await Promise.all(models.map(model => model.createIndexes ? model.createIndexes() : Promise.resolve()));
      console.log('All models registered and indexes ensured.');
    } catch (err) {
      console.error('Error ensuring model indexes:', err);
    }
    // Initialize SLA service after DB connection
    require('./services/slaService');
  })
  .catch(err => {
    clearTimeout(connectionTimeout);
    console.error('MongoDB connection error:', err);
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected!');
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-ticket', (ticketId) => {
    socket.join(`ticket-${ticketId}`);
    console.log(`User ${socket.id} joined ticket ${ticketId}`);
  });
  
  socket.on('leave-ticket', (ticketId) => {
    socket.leave(`ticket-${ticketId}`);
    console.log(`User ${socket.id} left ticket ${ticketId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint for Render and general health check
app.get('/', (req, res) => {
  res.send('API is running');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
