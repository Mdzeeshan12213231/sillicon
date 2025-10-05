import axios, { AxiosResponse } from 'axios';
import { 
  User, 
  Ticket, 
  Comment, 
  TicketsResponse, 
  CommentsResponse, 
  TicketStats,
  CreateTicketData,
  UpdateTicketData,
  CreateCommentData,
  UpdateCommentData,
  FilterOptions
} from '../types';

// API base URL - uses Vite proxy in development, real backend in production
const API_BASE_URL =
  import.meta.env.MODE === 'production'
    ? 'https://sillicon-q2fr-git-main-mdzeeshan12213231s-projects.vercel.app/api'
    : '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
    const response: AxiosResponse<{ token: string; user: User }> = await api.post('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  register: async (name: string, email: string, password: string, role = 'user'): Promise<{ token: string; user: User }> => {
    const response: AxiosResponse<{ token: string; user: User }> = await api.post('/auth/register', {
      name,
      email,
      password,
      role,
    });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User>): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.put('/auth/profile', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post('/auth/logout');
    return response.data;
  },
};

// Tickets API
export const ticketsAPI = {
  getAllTickets: async (): Promise<{ tickets: Ticket[] }> => {
    const response: AxiosResponse<{ tickets: Ticket[] }> = await api.get('/tickets');
    return response.data;
  },
  
  getRecentTickets: async (): Promise<{ tickets: Ticket[] }> => {
    const response: AxiosResponse<{ tickets: Ticket[] }> = await api.get('/tickets/recent');
    return response.data;
  },
  
  getTicketStats: async (): Promise<TicketStats> => {
    const response: AxiosResponse<TicketStats> = await api.get('/tickets/stats');
    return response.data;
  },
  getTickets: async (filters: FilterOptions = {}): Promise<TicketsResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<TicketsResponse> = await api.get(`/tickets?${params.toString()}`);
    return response.data;
  },

  getTicket: async (id: string): Promise<{ ticket: Ticket; comments: Comment[] }> => {
    const response: AxiosResponse<{ ticket: Ticket; comments: Comment[] }> = await api.get(`/tickets/${id}`);
    return response.data;
  },

  createTicket: async (data: CreateTicketData): Promise<{ ticket: Ticket }> => {
    const response: AxiosResponse<{ ticket: Ticket }> = await api.post('/tickets', data);
    return response.data;
  },

  updateTicket: async (id: string, data: UpdateTicketData): Promise<{ ticket: Ticket }> => {
    const response: AxiosResponse<{ ticket: Ticket }> = await api.patch(`/tickets/${id}`, data);
    return response.data;
  },

  deleteTicket: async (id: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/tickets/${id}`);
    return response.data;
  },

  getStats: async (): Promise<{ overview: TicketStats; recentTickets: Ticket[] }> => {
    const response: AxiosResponse<{ overview: TicketStats; recentTickets: Ticket[] }> = await api.get('/tickets/stats/overview');
    return response.data;
  },

  getSuggestions: async (ticketId: string): Promise<{ suggestions: any[] }> => {
    const response: AxiosResponse<{ suggestions: any[] }> = await api.get(`/tickets/${ticketId}/suggestions`);
    return response.data;
  },
};

// Comments API
export const commentsAPI = {
  getComments: async (ticketId: string, includeInternal = false): Promise<CommentsResponse> => {
    const response: AxiosResponse<CommentsResponse> = await api.get(`/comments/ticket/${ticketId}?includeInternal=${includeInternal}`);
    return response.data;
  },

  createComment: async (data: CreateCommentData): Promise<{ comment: Comment }> => {
    const response: AxiosResponse<{ comment: Comment }> = await api.post('/comments', data);
    return response.data;
  },

  updateComment: async (id: string, data: UpdateCommentData): Promise<{ comment: Comment }> => {
    const response: AxiosResponse<{ comment: Comment }> = await api.put(`/comments/${id}`, data);
    return response.data;
  },

  deleteComment: async (id: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/comments/${id}`);
    return response.data;
  },

  addReaction: async (id: string, emoji: string): Promise<{ reactions: any[] }> => {
    const response: AxiosResponse<{ reactions: any[] }> = await api.post(`/comments/${id}/reaction`, { emoji });
    return response.data;
  },
};

// Users API
export const usersAPI = {
  getUsers: async (filters: FilterOptions = {}): Promise<{ users: User[]; pagination: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<{ users: User[]; pagination: any }> = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  getAgents: async (): Promise<{ agents: User[] }> => {
    const response: AxiosResponse<{ agents: User[] }> = await api.get('/users/agents');
    return response.data;
  },

  getUser: async (id: string): Promise<{ user: User; ticketStats: any }> => {
    const response: AxiosResponse<{ user: User; ticketStats: any }> = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: Partial<User>): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/users/${id}`);
    return response.data;
  },

  getUserTickets: async (id: string, filters: FilterOptions = {}): Promise<TicketsResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<TicketsResponse> = await api.get(`/users/${id}/tickets?${params.toString()}`);
    return response.data;
  },
};

// Notifications API
export const notificationsAPI = {
  getNotifications: async (filters: FilterOptions = {}): Promise<{ notifications: any[]; pagination: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<{ notifications: any[]; pagination: any }> = await api.get(`/notifications?${params.toString()}`);
    return response.data;
  },

  getUnreadCount: async (): Promise<{ count: number }> => {
    const response: AxiosResponse<{ count: number }> = await api.get('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string): Promise<{ message: string; notification: any }> => {
    const response: AxiosResponse<{ message: string; notification: any }> = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.patch('/notifications/mark-all-read');
    return response.data;
  },

  deleteNotification: async (id: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

// Knowledge Base API
export const knowledgeBaseAPI = {
  searchArticles: async (query: string, filters: FilterOptions = {}): Promise<{ articles: any[]; pagination: any }> => {
    const params = new URLSearchParams();
    params.append('q', query);
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<{ articles: any[]; pagination: any }> = await api.get(`/knowledge-base/search?${params.toString()}`);
    return response.data;
  },

  getSuggestions: async (ticketId: string): Promise<{ suggestions: any[] }> => {
    const response: AxiosResponse<{ suggestions: any[] }> = await api.get(`/knowledge-base/suggestions/${ticketId}`);
    return response.data;
  },

  getPopularArticles: async (limit = 10): Promise<{ articles: any[] }> => {
    const response: AxiosResponse<{ articles: any[] }> = await api.get(`/knowledge-base/popular?limit=${limit}`);
    return response.data;
  },

  getArticlesByCategory: async (category: string, limit = 10): Promise<{ articles: any[] }> => {
    const response: AxiosResponse<{ articles: any[] }> = await api.get(`/knowledge-base/category/${category}?limit=${limit}`);
    return response.data;
  },

  getArticle: async (id: string): Promise<{ article: any }> => {
    const response: AxiosResponse<{ article: any }> = await api.get(`/knowledge-base/${id}`);
    return response.data;
  },

  createArticle: async (data: any): Promise<{ article: any }> => {
    const response: AxiosResponse<{ article: any }> = await api.post('/knowledge-base', data);
    return response.data;
  },

  updateArticle: async (id: string, data: any): Promise<{ article: any }> => {
    const response: AxiosResponse<{ article: any }> = await api.put(`/knowledge-base/${id}`, data);
    return response.data;
  },

  deleteArticle: async (id: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/knowledge-base/${id}`);
    return response.data;
  },

  rateArticle: async (id: string, isHelpful: boolean): Promise<{ article: any }> => {
    const response: AxiosResponse<{ article: any }> = await api.post(`/knowledge-base/${id}/rate`, { isHelpful });
    return response.data;
  },
};

// AI API
export const aiAPI = {
  classifyTicket: async (data: { title: string; description: string }): Promise<{ classification: any }> => {
    const response: AxiosResponse<{ classification: any }> = await api.post('/ai/classify-ticket', data);
    return response.data;
  },

  analyzeSentiment: async (data: { title: string; description: string }): Promise<{ sentiment: any }> => {
    const response: AxiosResponse<{ sentiment: any }> = await api.post('/ai/analyze-sentiment', data);
    return response.data;
  },

  generateResponses: async (data: { ticketId: string }): Promise<{ responses: any[] }> => {
    const response: AxiosResponse<{ responses: any[] }> = await api.post('/ai/generate-responses', data);
    return response.data;
  },

  detectDuplicates: async (data: { title: string; description: string }): Promise<{ duplicates: any[] }> => {
    const response: AxiosResponse<{ duplicates: any[] }> = await api.post('/ai/detect-duplicates', data);
    return response.data;
  },

  translate: async (data: { text: string; targetLanguage: string }): Promise<{ translatedText: string }> => {
    const response: AxiosResponse<{ translatedText: string }> = await api.post('/ai/translate', data);
    return response.data;
  },

  generateSummary: async (data: { ticketId: string }): Promise<{ summary: any }> => {
    const response: AxiosResponse<{ summary: any }> = await api.post('/ai/generate-summary', data);
    return response.data;
  },
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: async (): Promise<{ analytics: any }> => {
    const response: AxiosResponse<{ analytics: any }> = await api.get('/analytics/dashboard');
    return response.data;
  },

  getAgentPerformance: async (agentId: string, filters: FilterOptions = {}): Promise<{ performance: any }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<{ performance: any }> = await api.get(`/analytics/agent-performance/${agentId}?${params.toString()}`);
    return response.data;
  },

  getTrends: async (filters: FilterOptions = {}): Promise<{ trends: any[] }> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const response: AxiosResponse<{ trends: any[] }> = await api.get(`/analytics/trends?${params.toString()}`);
    return response.data;
  },

  getGeographic: async (): Promise<{ distribution: any[] }> => {
    const response: AxiosResponse<{ distribution: any[] }> = await api.get('/analytics/geographic');
    return response.data;
  },

  getPredictions: async (): Promise<{ predictions: any }> => {
    const response: AxiosResponse<{ predictions: any }> = await api.get('/analytics/predictions');
    return response.data;
  },
};

// Chat API
export const chatAPI = {
  getThreads: async (): Promise<{ threads: any[] }> => {
    const response: AxiosResponse<{ threads: any[] }> = await api.get('/chat/threads');
    return response.data;
  },

  getThread: async (threadId: string): Promise<{ thread: any }> => {
    const response: AxiosResponse<{ thread: any }> = await api.get(`/chat/threads/${threadId}`);
    return response.data;
  },

  createThread: async (data: { ticketId: string }): Promise<{ thread: any }> => {
    const response: AxiosResponse<{ thread: any }> = await api.post('/chat/threads', data);
    return response.data;
  },

  sendMessage: async (data: { threadId: string; content: string; messageType?: string; isInternal?: boolean }): Promise<{ message: any }> => {
    const response: AxiosResponse<{ message: any }> = await api.post(`/chat/threads/${data.threadId}/messages`, data);
    return response.data;
  },

  addParticipant: async (data: { threadId: string; userId: string; role: string }): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post(`/chat/threads/${data.threadId}/participants`, data);
    return response.data;
  },

  markAsRead: async (data: { threadId: string; messageId?: string }): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.post(`/chat/threads/${data.threadId}/mark-read`, data);
    return response.data;
  },

  sendBotMessage: async (data: { message: string; ticketId?: string }): Promise<{ response: any }> => {
    const response: AxiosResponse<{ response: any }> = await api.post('/chat/bot', data);
    return response.data;
  },
};

// Workflow API
export const workflowAPI = {
  getRules: async (): Promise<{ rules: any[] }> => {
    const response: AxiosResponse<{ rules: any[] }> = await api.get('/workflow/rules');
    return response.data;
  },

  createRule: async (data: any): Promise<{ rule: any }> => {
    const response: AxiosResponse<{ rule: any }> = await api.post('/workflow/rules', data);
    return response.data;
  },

  deleteRule: async (ruleName: string): Promise<{ message: string }> => {
    const response: AxiosResponse<{ message: string }> = await api.delete(`/workflow/rules/${ruleName}`);
    return response.data;
  },

  testRule: async (data: { ruleName: string; ticketData: any }): Promise<{ result: any }> => {
    const response: AxiosResponse<{ result: any }> = await api.post('/workflow/test', data);
    return response.data;
  },

  getStats: async (): Promise<{ stats: any }> => {
    const response: AxiosResponse<{ stats: any }> = await api.get('/workflow/stats');
    return response.data;
  },
};

export default api;
