const mongoose = require('mongoose');

const knowledgeBaseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['technical', 'billing', 'general', 'faq', 'troubleshooting', 'how-to']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  keywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  views: {
    type: Number,
    default: 0
  },
  helpful: {
    type: Number,
    default: 0
  },
  notHelpful: {
    type: Number,
    default: 0
  },
  // SEO and search optimization
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  excerpt: {
    type: String,
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  // Related articles
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase'
  }],
  // Version control
  version: {
    type: Number,
    default: 1
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Attachments
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
knowledgeBaseSchema.index({ title: 'text', content: 'text', tags: 'text', keywords: 'text' });
knowledgeBaseSchema.index({ category: 1, status: 1 });
knowledgeBaseSchema.index({ author: 1 });
knowledgeBaseSchema.index({ slug: 1 });
knowledgeBaseSchema.index({ tags: 1 });
knowledgeBaseSchema.index({ views: -1 });
knowledgeBaseSchema.index({ helpful: -1 });

// Pre-save middleware to generate slug
knowledgeBaseSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  }
  next();
});

// Method to increment views
knowledgeBaseSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to rate article
knowledgeBaseSchema.methods.rate = function(isHelpful) {
  if (isHelpful) {
    this.helpful += 1;
  } else {
    this.notHelpful += 1;
  }
  return this.save();
};

// Static method to search articles
knowledgeBaseSchema.statics.search = function(query, category = null) {
  const searchQuery = {
    status: 'published',
    $text: { $search: query }
  };
  
  if (category) {
    searchQuery.category = category;
  }
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, views: -1 })
    .populate('author', 'name email')
    .limit(10);
};

module.exports = mongoose.model('KnowledgeBase', knowledgeBaseSchema);
