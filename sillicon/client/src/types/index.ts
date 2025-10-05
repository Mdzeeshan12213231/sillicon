export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'agent' | 'admin';
  avatar?: string;
  lastLogin?: string;
  preferences?: {
    notifications: {
      email: boolean;
      push: boolean;
    };
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'general' | 'bug_report' | 'feature_request';
  createdBy: User;
  assignedTo?: User;
  assignedAt?: string;
  sla: {
    responseTime: number;
    resolutionTime: number;
    firstResponseAt?: string;
    resolvedAt?: string;
    dueDate: string;
  };
  version: number;
  tags: string[];
  attachments: Attachment[];
  internalNotes: InternalNote[];
  satisfaction?: {
    rating: number;
    feedback: string;
    submittedAt: string;
  };
  createdAt: string;
  updatedAt: string;
  slaStatus?: 'completed' | 'response_breach' | 'resolution_breach' | 'warning' | 'on_time';
  timeRemaining?: number;
}

export interface Comment {
  _id: string;
  ticket: string;
  author: User;
  content: string;
  parentComment?: string;
  type: 'comment' | 'status_change' | 'assignment' | 'internal_note';
  statusChange?: {
    from: string;
    to: string;
    reason: string;
  };
  assignmentChange?: {
    from?: User;
    to?: User;
  };
  isInternal: boolean;
  attachments: Attachment[];
  reactions: Reaction[];
  editedAt?: string;
  editHistory: EditHistory[];
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: User;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  replyCount?: number;
}

export interface Attachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface InternalNote {
  note: string;
  addedBy: User;
  addedAt: string;
}

export interface Reaction {
  emoji: string;
  users: User[];
}

export interface EditHistory {
  content: string;
  editedAt: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  message: string;
  data?: T;
  error?: string;
}

export interface TicketsResponse {
  tickets: Ticket[];
  pagination: PaginationInfo;
}

export interface CommentsResponse {
  comments: Comment[];
  total: number;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  myTickets: number;
  overdue: number;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface FilterOptions {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTicketData {
  title: string;
  description: string;
  category: string;
  priority?: string;
  tags?: string[];
}

export interface UpdateTicketData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignedTo?: string;
  tags?: string[];
  version: number;
}

export interface CreateCommentData {
  ticketId: string;
  content: string;
  parentComment?: string;
  isInternal?: boolean;
}

export interface UpdateCommentData {
  content: string;
}
