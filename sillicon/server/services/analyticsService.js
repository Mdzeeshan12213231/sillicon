const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Comment = require('../models/Comment');

class AnalyticsService {
  // Get real-time dashboard data
  async getDashboardAnalytics(userId, userRole) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(today.getFullYear(), now.getMonth(), 1);

      // Build base filter based on user role
      let baseFilter = {};
      if (userRole === 'user') {
        baseFilter.createdBy = userId;
      } else if (userRole === 'agent') {
        baseFilter.$or = [
          { assignedTo: userId },
          { assignedTo: null }
        ];
      }

      const [
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        todayTickets,
        weekTickets,
        monthTickets,
        overdueTickets,
        avgResponseTime,
        avgResolutionTime,
        categoryBreakdown,
        priorityBreakdown,
        hourlyDistribution,
        recentActivity
      ] = await Promise.all([
        this.getTicketCount(baseFilter),
        this.getTicketCount({ ...baseFilter, status: 'open' }),
        this.getTicketCount({ ...baseFilter, status: 'in_progress' }),
        this.getTicketCount({ ...baseFilter, status: 'resolved' }),
        this.getTicketCount({ ...baseFilter, status: 'closed' }),
        this.getTicketCount({ ...baseFilter, createdAt: { $gte: today } }),
        this.getTicketCount({ ...baseFilter, createdAt: { $gte: thisWeek } }),
        this.getTicketCount({ ...baseFilter, createdAt: { $gte: thisMonth } }),
        this.getOverdueTicketsCount(baseFilter),
        this.getAverageResponseTime(baseFilter),
        this.getAverageResolutionTime(baseFilter),
        this.getCategoryBreakdown(baseFilter),
        this.getPriorityBreakdown(baseFilter),
        this.getHourlyDistribution(baseFilter),
        this.getRecentActivity(baseFilter)
      ]);

      return {
        overview: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
          today: todayTickets,
          thisWeek: weekTickets,
          thisMonth: monthTickets,
          overdue: overdueTickets
        },
        performance: {
          avgResponseTime,
          avgResolutionTime,
          slaCompliance: this.calculateSLACompliance(resolvedTickets, totalTickets)
        },
        breakdowns: {
          category: categoryBreakdown,
          priority: priorityBreakdown,
          hourly: hourlyDistribution
        },
        recentActivity
      };
    } catch (error) {
      console.error('Error getting dashboard analytics:', error);
      throw error;
    }
  }

  // Get ticket count with filter
  async getTicketCount(filter) {
    return await Ticket.countDocuments(filter);
  }

  // Get overdue tickets count
  async getOverdueTicketsCount(baseFilter) {
    const now = new Date();
    return await Ticket.countDocuments({
      ...baseFilter,
      status: { $in: ['open', 'in_progress'] },
      'sla.dueDate': { $lt: now }
    });
  }

  // Get average response time
  async getAverageResponseTime(baseFilter) {
    const result = await Ticket.aggregate([
      { $match: { ...baseFilter, 'sla.firstResponseAt': { $exists: true } } },
      {
        $project: {
          responseTime: {
            $divide: [
              { $subtract: ['$sla.firstResponseAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResponseTime: { $avg: '$responseTime' }
        }
      }
    ]);

    return result.length > 0 ? Math.round(result[0].avgResponseTime * 100) / 100 : 0;
  }

  // Get average resolution time
  async getAverageResolutionTime(baseFilter) {
    const result = await Ticket.aggregate([
      { $match: { ...baseFilter, 'sla.resolvedAt': { $exists: true } } },
      {
        $project: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$sla.resolvedAt', '$createdAt'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    return result.length > 0 ? Math.round(result[0].avgResolutionTime * 100) / 100 : 0;
  }

  // Get category breakdown
  async getCategoryBreakdown(baseFilter) {
    const result = await Ticket.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return result.map(item => ({
      category: item._id,
      count: item.count,
      percentage: 0 // Will be calculated on frontend
    }));
  }

  // Get priority breakdown
  async getPriorityBreakdown(baseFilter) {
    const result = await Ticket.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return result.map(item => ({
      priority: item._id,
      count: item.count,
      percentage: 0 // Will be calculated on frontend
    }));
  }

  // Get hourly distribution of tickets
  async getHourlyDistribution(baseFilter) {
    const result = await Ticket.aggregate([
      { $match: baseFilter },
      {
        $project: {
          hour: { $hour: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing hours with 0
    const distribution = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0
    }));

    result.forEach(item => {
      distribution[item._id].count = item.count;
    });

    return distribution;
  }

  // Get recent activity
  async getRecentActivity(baseFilter, limit = 10) {
    const tickets = await Ticket.find(baseFilter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .limit(limit);

    return tickets.map(ticket => ({
      id: ticket._id,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      createdBy: ticket.createdBy.name,
      assignedTo: ticket.assignedTo?.name || 'Unassigned',
      updatedAt: ticket.updatedAt
    }));
  }

  // Calculate SLA compliance
  calculateSLACompliance(resolvedTickets, totalTickets) {
    if (totalTickets === 0) return 100;
    return Math.round((resolvedTickets / totalTickets) * 100);
  }

  // Get agent performance metrics
  async getAgentPerformance(agentId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;
      const filter = { assignedTo: agentId };
      
      if (startDate && endDate) {
        filter.createdAt = { $gte: startDate, $lte: endDate };
      }

      const [
        totalAssigned,
        resolvedTickets,
        avgResolutionTime,
        customerSatisfaction
      ] = await Promise.all([
        this.getTicketCount(filter),
        this.getTicketCount({ ...filter, status: 'resolved' }),
        this.getAverageResolutionTime(filter),
        this.getCustomerSatisfaction(agentId)
      ]);

      return {
        totalAssigned,
        resolvedTickets,
        resolutionRate: totalAssigned > 0 ? Math.round((resolvedTickets / totalAssigned) * 100) : 0,
        avgResolutionTime,
        customerSatisfaction
      };
    } catch (error) {
      console.error('Error getting agent performance:', error);
      throw error;
    }
  }

  // Get customer satisfaction for agent
  async getCustomerSatisfaction(agentId) {
    const result = await Ticket.aggregate([
      { $match: { assignedTo: agentId, 'satisfaction.rating': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$satisfaction.rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    return result.length > 0 ? {
      avgRating: Math.round(result[0].avgRating * 100) / 100,
      totalRatings: result[0].totalRatings
    } : { avgRating: 0, totalRatings: 0 };
  }

  // Get trend analysis
  async getTrendAnalysis(baseFilter, period = 'week') {
    try {
      const now = new Date();
      let startDate, groupFormat;

      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'week':
          startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
          groupFormat = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
          break;
        case 'month':
          startDate = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000);
          groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          break;
        default:
          startDate = new Date(now.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
          groupFormat = { $dateToString: { format: '%Y-W%U', date: '$createdAt' } };
      }

      const result = await Ticket.aggregate([
        {
          $match: {
            ...baseFilter,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: groupFormat,
            totalTickets: { $sum: 1 },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
            },
            avgResolutionTime: {
              $avg: {
                $cond: [
                  { $eq: ['$status', 'resolved'] },
                  {
                    $divide: [
                      { $subtract: ['$sla.resolvedAt', '$createdAt'] },
                      1000 * 60 * 60
                    ]
                  },
                  null
                ]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return result;
    } catch (error) {
      console.error('Error getting trend analysis:', error);
      throw error;
    }
  }

  // Get geographic distribution (if location data is available)
  async getGeographicDistribution(baseFilter) {
    // This would require adding location data to tickets
    // For now, return mock data
    return [
      { country: 'United States', count: 45, percentage: 35 },
      { country: 'United Kingdom', count: 28, percentage: 22 },
      { country: 'Canada', count: 18, percentage: 14 },
      { country: 'Australia', count: 15, percentage: 12 },
      { country: 'Germany', count: 12, percentage: 9 },
      { country: 'Others', count: 10, percentage: 8 }
    ];
  }

  // Predict ticket trends
  async predictTicketTrends(baseFilter) {
    try {
      const historicalData = await this.getTrendAnalysis(baseFilter, 'week');
      
      // Simple linear regression for prediction
      const predictions = this.calculateLinearRegression(historicalData);
      
      return {
        nextWeek: predictions.nextWeek,
        nextMonth: predictions.nextMonth,
        confidence: predictions.confidence,
        factors: predictions.factors
      };
    } catch (error) {
      console.error('Error predicting ticket trends:', error);
      return {
        nextWeek: 0,
        nextMonth: 0,
        confidence: 0,
        factors: []
      };
    }
  }

  // Simple linear regression calculation
  calculateLinearRegression(data) {
    if (data.length < 2) {
      return { nextWeek: 0, nextMonth: 0, confidence: 0, factors: [] };
    }

    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.totalTickets);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const nextWeek = Math.max(0, Math.round(slope * n + intercept));
    const nextMonth = Math.max(0, Math.round(slope * (n + 4) + intercept));

    // Calculate confidence based on data variance
    const variance = y.reduce((sum, yi, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(yi - predicted, 2);
    }, 0) / n;

    const confidence = Math.max(0, Math.min(1, 1 - (variance / (sumY / n))));

    return {
      nextWeek,
      nextMonth,
      confidence,
      factors: ['historical_trend', 'seasonal_patterns']
    };
  }
}

module.exports = new AnalyticsService();

