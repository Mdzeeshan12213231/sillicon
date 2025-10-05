import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { ticketsAPI, commentsAPI, usersAPI } from '../lib/api';
import KnowledgeBaseSuggestions from '../components/KnowledgeBaseSuggestions';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import Textarea from '../components/Textarea';
import Select from '../components/Select';
import {
  ArrowLeftIcon,
  PencilIcon,
  TagIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const TicketDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  // Removed unused navigate
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showInternalComments, setShowInternalComments] = useState(false);

  const { data: ticketData, isLoading: ticketLoading } = useQuery(
    ['ticket', id],
    () => ticketsAPI.getTicket(id!),
    {
      enabled: !!id,
    }
  );

  const { data: agentsData } = useQuery(
    'agents',
    usersAPI.getAgents,
    {
      enabled: (user?.role === 'agent' || user?.role === 'admin') && !!ticketData,
    }
  );

  const updateTicketMutation = useMutation(
    (data: any) => ticketsAPI.updateTicket(id!, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ticket', id]);
        toast.success('Ticket updated successfully');
        setIsEditing(false);
      },
      onError: (error: any) => {
        const data = error.response?.data;
        if (data?.errors && Array.isArray(data.errors)) {
          data.errors.forEach((err: any) => {
            toast.error(`${err.param}: ${err.msg}`);
          });
        } else {
          toast.error(data?.message || 'Failed to update ticket');
        }
      },
    }
  );

  const addCommentMutation = useMutation(
    (data: any) => commentsAPI.createComment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['ticket', id]);
        setNewComment('');
        toast.success('Comment added successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to add comment');
      },
    }
  );

  const handleUpdateTicket = (formData: any) => {
    updateTicketMutation.mutate({
      ...formData,
      version: ticketData?.ticket.version,
    });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    addCommentMutation.mutate({
      ticketId: id,
      content: newComment.trim(),
      isInternal: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSLAStatusColor = (slaStatus?: string) => {
    switch (slaStatus) {
      case 'response_breach':
      case 'resolution_breach':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'on_time':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (ticketLoading) {
    return <LoadingSpinner className="py-12" />;
  }

  if (!ticketData?.ticket) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Ticket not found</h3>
        <p className="mt-1 text-sm text-gray-500">The ticket you're looking for doesn't exist.</p>
        <div className="mt-6">
          <Link
            to="/tickets"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const { ticket, comments } = ticketData;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link to="/tickets" className="text-gray-400 hover:text-gray-500">
                  <ArrowLeftIcon className="h-5 w-5" />
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <Link to="/tickets" className="text-sm font-medium text-gray-500 hover:text-gray-700">
                    Tickets
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <span className="text-gray-400">/</span>
                  <span className="ml-4 text-sm font-medium text-gray-500">#{ticket._id.slice(-8)}</span>
                </div>
              </li>
            </ol>
          </nav>
          <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {ticket.title}
          </h2>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          {(user?.role === 'agent' || user?.role === 'admin') && (
            <Button
              variant="secondary"
              onClick={() => setIsEditing(!isEditing)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit Ticket'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Ticket Details</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              {isEditing ? (
                <TicketEditForm
                  ticket={ticket}
                  agents={agentsData?.agents || []}
                  onSubmit={handleUpdateTicket}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                  
                  {ticket.tags && ticket.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {ticket.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Knowledge Base Suggestions */}
          <KnowledgeBaseSuggestions ticketId={id!} />

          {/* Comments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Comments</h3>
                {(user?.role === 'agent' || user?.role === 'admin') && (
                  <button
                    onClick={() => setShowInternalComments(!showInternalComments)}
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    {showInternalComments ? 'Hide' : 'Show'} Internal Comments
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Add Comment Form */}
              <div className="border border-gray-200 rounded-lg p-4">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addCommentMutation.isLoading}
                    loading={addCommentMutation.isLoading}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments?.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    showInternal={showInternalComments}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Ticket Info */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Ticket Info</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(ticket.status)}`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Priority</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {ticket.category.replace('_', ' ')}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created By</dt>
                <dd className="mt-1 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-primary-600">
                      {ticket.createdBy.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ticket.createdBy.name}</p>
                    <p className="text-sm text-gray-500">{ticket.createdBy.email}</p>
                  </div>
                </dd>
              </div>

              {ticket.assignedTo && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Assigned To</dt>
                  <dd className="mt-1 flex items-center">
                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-green-600">
                        {ticket.assignedTo.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ticket.assignedTo.name}</p>
                      <p className="text-sm text-gray-500">{ticket.assignedTo.email}</p>
                    </div>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-gray-500">SLA Status</dt>
                <dd className={`mt-1 text-sm ${getSLAStatusColor(ticket.slaStatus)}`}>
                  {ticket.timeRemaining !== undefined && ticket.timeRemaining > 0
                    ? `${ticket.timeRemaining}h remaining`
                    : ticket.slaStatus === 'completed'
                    ? 'Completed'
                    : 'Overdue'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(ticket.updatedAt), 'MMM d, yyyy h:mm a')}
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Ticket Edit Form Component
const TicketEditForm: React.FC<{
  ticket: any;
  agents: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}> = ({ ticket, agents, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    assignedTo: ticket.assignedTo?._id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure assignedTo is empty string if unassigned
    const submitData = {
      ...formData,
      assignedTo: formData.assignedTo || '',
    };
    onSubmit(submitData);
  };

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const agentOptions = [
    { value: '', label: 'Unassigned' },
    ...agents.map(agent => ({
      value: agent._id,
      label: agent.name,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        rows={4}
        required
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Status"
          options={statusOptions}
          value={formData.status}
          onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
        />

        <Select
          label="Priority"
          options={priorityOptions}
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
        />
      </div>

      <Select
  label="Assigned To"
  options={agentOptions}
  value={formData.assignedTo || ''}
  onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value || '' }))}
      />

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
};

// Comment Item Component
const CommentItem: React.FC<{
  comment: any;
  showInternal: boolean;
}> = ({ comment, showInternal }) => {
  if (comment.isInternal && !showInternal) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-4 ${comment.isInternal ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">
              {comment.author.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900">{comment.author.name}</p>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
            {comment.isInternal && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Internal
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
        </div>
      </div>
    </div>
  );
};

export default TicketDetail;
