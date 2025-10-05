const KnowledgeBase = require('../models/KnowledgeBase');
const Ticket = require('../models/Ticket');

class KnowledgeBaseService {
  // Search for relevant articles based on ticket content
  async suggestArticles(ticketTitle, ticketDescription, ticketCategory) {
    try {
      // Create search query from ticket content
      const searchQuery = `${ticketTitle} ${ticketDescription}`.toLowerCase();
      
      // Search in knowledge base
      const articles = await KnowledgeBase.search(searchQuery, ticketCategory);
      
      // Score and rank articles
      const scoredArticles = articles.map(article => {
        let score = 0;
        
        // Title match
        if (ticketTitle.toLowerCase().includes(article.title.toLowerCase()) ||
            article.title.toLowerCase().includes(ticketTitle.toLowerCase())) {
          score += 10;
        }
        
        // Category match
        if (article.category === ticketCategory) {
          score += 5;
        }
        
        // Tag matches
        const ticketWords = searchQuery.split(' ');
        const tagMatches = article.tags.filter(tag => 
          ticketWords.some(word => tag.toLowerCase().includes(word.toLowerCase()))
        ).length;
        score += tagMatches * 2;
        
        // Keyword matches
        const keywordMatches = article.keywords.filter(keyword => 
          ticketWords.some(word => keyword.includes(word.toLowerCase()))
        ).length;
        score += keywordMatches * 1.5;
        
        // Popularity boost
        score += Math.log(article.views + 1) * 0.5;
        
        // Helpfulness boost
        const helpfulness = article.helpful + article.notHelpful > 0 
          ? article.helpful / (article.helpful + article.notHelpful)
          : 0.5;
        score += helpfulness * 2;
        
        return {
          ...article.toObject(),
          relevanceScore: score
        };
      });
      
      // Sort by relevance score and return top 5
      return scoredArticles
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 5);
        
    } catch (error) {
      console.error('Error suggesting articles:', error);
      return [];
    }
  }

  // Get article by ID and increment view count
  async getArticle(articleId) {
    try {
      const article = await KnowledgeBase.findById(articleId)
        .populate('author', 'name email')
        .populate('lastUpdatedBy', 'name email')
        .populate('relatedArticles', 'title slug excerpt');

      if (article) {
        await article.incrementViews();
      }

      return article;
    } catch (error) {
      console.error('Error getting article:', error);
      throw error;
    }
  }

  // Create new article
  async createArticle(articleData, authorId) {
    try {
      const article = new KnowledgeBase({
        ...articleData,
        author: authorId,
        lastUpdatedBy: authorId
      });

      await article.save();
      await article.populate('author', 'name email');

      return article;
    } catch (error) {
      console.error('Error creating article:', error);
      throw error;
    }
  }

  // Update article
  async updateArticle(articleId, updateData, userId) {
    try {
      const article = await KnowledgeBase.findById(articleId);
      if (!article) {
        throw new Error('Article not found');
      }

      // Update article data
      Object.assign(article, updateData);
      article.lastUpdatedBy = userId;
      article.version += 1;

      await article.save();
      await article.populate('author', 'name email');
      await article.populate('lastUpdatedBy', 'name email');

      return article;
    } catch (error) {
      console.error('Error updating article:', error);
      throw error;
    }
  }

  // Delete article (soft delete by archiving)
  async deleteArticle(articleId) {
    try {
      const article = await KnowledgeBase.findByIdAndUpdate(
        articleId,
        { status: 'archived' },
        { new: true }
      );

      return article;
    } catch (error) {
      console.error('Error deleting article:', error);
      throw error;
    }
  }

  // Search articles
  async searchArticles(query, filters = {}) {
    try {
      const {
        category = null,
        status = 'published',
        page = 1,
        limit = 10,
        sortBy = 'relevance'
      } = filters;

      const searchQuery = {
        status,
        $text: { $search: query }
      };

      if (category) {
        searchQuery.category = category;
      }

      const skip = (page - 1) * limit;
      let sort = {};

      switch (sortBy) {
        case 'relevance':
          sort = { score: { $meta: 'textScore' } };
          break;
        case 'views':
          sort = { views: -1 };
          break;
        case 'helpful':
          sort = { helpful: -1 };
          break;
        case 'recent':
          sort = { updatedAt: -1 };
          break;
        default:
          sort = { score: { $meta: 'textScore' } };
      }

      const articles = await KnowledgeBase.find(searchQuery, { score: { $meta: 'textScore' } })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('author', 'name email');

      const total = await KnowledgeBase.countDocuments(searchQuery);

      return {
        articles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      console.error('Error searching articles:', error);
      throw error;
    }
  }

  // Get popular articles
  async getPopularArticles(limit = 10) {
    try {
      return await KnowledgeBase.find({ status: 'published' })
        .sort({ views: -1, helpful: -1 })
        .limit(limit)
        .populate('author', 'name email')
        .select('title slug excerpt views helpful category');
    } catch (error) {
      console.error('Error getting popular articles:', error);
      throw error;
    }
  }

  // Get articles by category
  async getArticlesByCategory(category, limit = 10) {
    try {
      return await KnowledgeBase.find({ 
        category, 
        status: 'published' 
      })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('author', 'name email')
        .select('title slug excerpt views helpful');
    } catch (error) {
      console.error('Error getting articles by category:', error);
      throw error;
    }
  }

  // Rate article
  async rateArticle(articleId, isHelpful) {
    try {
      const article = await KnowledgeBase.findById(articleId);
      if (!article) {
        throw new Error('Article not found');
      }

      await article.rate(isHelpful);
      return article;
    } catch (error) {
      console.error('Error rating article:', error);
      throw error;
    }
  }

  // Get article statistics
  async getArticleStats() {
    try {
      const stats = await KnowledgeBase.aggregate([
        {
          $group: {
            _id: null,
            totalArticles: { $sum: 1 },
            publishedArticles: {
              $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
            },
            draftArticles: {
              $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
            },
            totalViews: { $sum: '$views' },
            totalHelpful: { $sum: '$helpful' },
            totalNotHelpful: { $sum: '$notHelpful' }
          }
        }
      ]);

      const categoryStats = await KnowledgeBase.aggregate([
        { $match: { status: 'published' } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            views: { $sum: '$views' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        ...stats[0],
        categoryBreakdown: categoryStats
      };
    } catch (error) {
      console.error('Error getting article stats:', error);
      throw error;
    }
  }

  // Auto-generate suggestions for new tickets
  async generateTicketSuggestions(ticket) {
    try {
      const suggestions = await this.suggestArticles(
        ticket.title,
        ticket.description,
        ticket.category
      );

      // Format suggestions for the frontend
      return suggestions.map(article => ({
        id: article._id,
        title: article.title,
        excerpt: article.excerpt,
        category: article.category,
        relevanceScore: article.relevanceScore,
        views: article.views,
        helpful: article.helpful,
        url: `/knowledge-base/${article.slug}`
      }));
    } catch (error) {
      console.error('Error generating ticket suggestions:', error);
      return [];
    }
  }
}

module.exports = new KnowledgeBaseService();
