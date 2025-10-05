import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ticketsAPI, usersAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import {
  TicketIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const Tickets: React.FC = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    category: '',
    assignedTo: '',
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: ticketsData, isLoading, refetch } = useQuery(
    ['tickets', filters],
    () => ticketsAPI.getTickets(filters),
    {
      keepPreviousData: true,
    }
  );

  const { data: agentsData } = useQuery(
    'agents',
    usersAPI.getAgents,
    {
      enabled: user?.role === 'agent' || user?.role === 'admin',
    }
  );

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'technical', label: 'Technical' },
    { value: 'billing', label: 'Billing' },
    { value: 'general', label: 'General' },
    { value: 'bug_report', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
  ];

  const agentOptions = [
    { value: '', label: 'All Agents' },
    ...(agentsData?.agents?.map(agent => ({
      value: agent.id,
      label: agent.name,
    })) || []),
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
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

  if (isLoading) {
    return <LoadingSpinner className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Tickets
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all support tickets
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Link to="/tickets/new">
            <Button>
              <PlusIcon className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Search"
              placeholder="Search tickets..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <Select
              label="Status"
              options={statusOptions}
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            />
            <Select
              label="Priority"
              options={priorityOptions}
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
            />
            <Select
              label="Category"
              options={categoryOptions}
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            />
            {(user?.role === 'agent' || user?.role === 'admin') && (
              <Select
                label="Assigned To"
                options={agentOptions}
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {/* Tickets Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {ticketsData?.tickets && ticketsData.tickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SLA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ticketsData.tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <TicketIcon className="h-4 w-4 text-primary-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            <Link
                              to={`/tickets/${ticket._id}`}
                              className="hover:text-primary-600"
                            >
                              {ticket.title}
                            </Link>
                          </div>
                          <div className="text-sm text-gray-500">
                            #{ticket._id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.createdBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`${getSLAStatusColor(ticket.slaStatus)}`}>
                        {ticket.timeRemaining !== undefined && ticket.timeRemaining > 0
                          ? `${ticket.timeRemaining}h left`
                          : ticket.slaStatus === 'completed'
                          ? 'Completed'
                          : 'Overdue'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/tickets/${ticket._id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        {(user?.role === 'agent' || user?.role === 'admin') && (
                          <button className="text-gray-600 hover:text-gray-900">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.status || filters.priority || filters.category
                ? 'Try adjusting your filters.'
                : 'Get started by creating a new ticket.'}
            </p>
            <div className="mt-6">
              <Link
                to="/tickets/new"
                className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Ticket
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {ticketsData?.pagination && ticketsData.pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="secondary"
                disabled={!ticketsData.pagination.hasPrev}
                onClick={() => handlePageChange(filters.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={!ticketsData.pagination.hasNext}
                onClick={() => handlePageChange(filters.page + 1)}
              >
                Next
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {(filters.page - 1) * filters.limit + 1}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(filters.page * filters.limit, ticketsData.pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{ticketsData.pagination.totalItems}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!ticketsData.pagination.hasPrev}
                    onClick={() => handlePageChange(filters.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!ticketsData.pagination.hasNext}
                    onClick={() => handlePageChange(filters.page + 1)}
                  >
                    Next
                  </Button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tickets;
