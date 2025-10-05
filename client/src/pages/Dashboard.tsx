import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { ticketsAPI, analyticsAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import KanbanBoard from '../components/KanbanBoard';
import SupportBot from '../components/SupportBot';
import {
  TicketIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  PlusIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const Dashboard: React.FC = () => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { logout } = useAuth();
  const { user } = useAuth();
  const [showKanban, setShowKanban] = useState(false);
  const [showBot, setShowBot] = useState(false);

  // Use mock data for now to make the dashboard functional
  const { data: stats, isLoading: statsLoading } = useQuery(
    'ticket-stats',
    ticketsAPI.getTicketStats,
    {
      refetchInterval: 30000,
      onError: (error) => {
        console.error('Failed to fetch ticket stats:', error);
      }
    }
  );

  const { data: recentTickets, isLoading: ticketsLoading } = useQuery(
    'recent-tickets',
    ticketsAPI.getRecentTickets,
    {
      refetchInterval: 30000,
      onError: (error) => {
        console.error('Failed to fetch recent tickets:', error);
      }
    }
  );

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery(
    'analytics-dashboard',
    analyticsAPI.getDashboardStats,
    {
      refetchInterval: 60000,
      onError: (error) => {
        console.error('Failed to fetch analytics data:', error);
      }
    }
  );

  const { data: allTickets, isLoading: allTicketsLoading } = useQuery(
    'all-tickets-dashboard',
    ticketsAPI.getAllTickets,
    {
      refetchInterval: 30000,
      onError: (error) => {
        console.error('Failed to fetch all tickets:', error);
      }
    }
  );

  if (statsLoading || ticketsLoading || analyticsLoading || allTicketsLoading) {
    return <LoadingSpinner className="py-12" />;
  }

  const analytics = analyticsData?.analytics;
  const tickets = (allTickets?.tickets || []).map(ticket => ({
    ...ticket,
    assignedTo: ticket.assignedTo && ticket.assignedTo.id && ticket.assignedTo.name
      ? { _id: String(ticket.assignedTo.id), name: String(ticket.assignedTo.name) }
      : undefined,
    createdBy: ticket.createdBy && ticket.createdBy.id && ticket.createdBy.name
      ? { _id: String(ticket.createdBy.id), name: String(ticket.createdBy.name) }
      : { _id: '', name: '' }, // fallback to empty strings if missing
  }));

  type StatCardProps = {
    title: string;
    value: number | string;
    change?: number;
    icon: React.ElementType;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
    onClick?: () => void;
  };
  const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, color = 'blue', onClick }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500'
    };

    return (
      <div 
        className={`relative overflow-hidden rounded-lg bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6 cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:bg-gray-50' : ''}`}
        onClick={onClick}
      >
        <dt>
          <div className={`absolute rounded-md p-3 ${colorClasses[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <p className="ml-16 truncate text-sm font-medium text-gray-500">{title}</p>
        </dt>
        <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className="flex items-center ml-2">
              {change >= 0 ? (
                <ArrowUpIcon className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-red-500" />
              )}
              <span className={`text-sm ml-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </dd>
      </div>
    );
  };

  type CategoryChartProps = {
    data: { category: string; count: number }[];
  };
  const CategoryChart: React.FC<CategoryChartProps> = ({ data }) => {
    if (!data || data.length === 0) return null;
    const total = data.reduce((sum: number, item: { count: number }) => sum + item.count, 0);

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tickets by Category</h3>
        <div className="space-y-3">
          {data.slice(0, 5).map((item, index) => {
            const percentage = total > 0 ? (item.count / total) * 100 : 0;
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
            
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]} mr-3`}></div>
                  <span className="text-sm font-medium text-gray-700 capitalize">{item.category}</span>
                </div>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div 
                      className={`h-2 rounded-full ${colors[index % colors.length]}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{item.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
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

  return (
    <div className="space-y-6">
      {/* Profile Section at Top Right */}
      <div className="flex justify-end items-center pt-4 pr-6">
        <div className="relative">
          <button
            type="button"
            className="flex items-center space-x-2 bg-white rounded-full px-3 py-1 shadow hover:bg-gray-100 focus:outline-none"
            onClick={() => setProfileMenuOpen((open) => !open)}
          >
            <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-sm font-medium text-white">{user?.name?.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
            <span className="ml-1 text-xs text-gray-500">▼</span>
          </button>
          {profileMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-[9999] border border-gray-200">
              <Link
                to="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setProfileMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => { setProfileMenuOpen(false); logout(); window.location.href = '/login'; }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Welcome back, {user?.name}!
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your tickets today.
          </p>
        </div>
        <div className="mt-4 flex space-x-3 md:ml-4 md:mt-0">
          <button
            onClick={() => setShowKanban(!showKanban)}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <ChartBarIcon className="h-4 w-4 mr-2" />
            {showKanban ? 'Hide' : 'Show'} Board
          </button>
          <button
            onClick={() => setShowBot(true)}
            className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            AI Assistant
          </button>
          <Link
            to="/tickets/new"
            className="inline-flex items-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Ticket
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tickets"
          value={stats?.total || 0}
          change={analytics?.overview?.thisWeek || 0}
          icon={TicketIcon}
          color="blue"
        />
        <StatCard
          title="Open Tickets"
          value={stats?.open || 0}
          change={-5.2}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
        <StatCard
          title="Resolved Tickets"
          value={stats?.resolved || 0}
          change={12.5}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="In Progress"
          value={stats?.inProgress || 0}
          change={-8.3}
          icon={ClockIcon}
          color="purple"
        />
      </div>

      {/* Kanban Board */}
      {showKanban && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Ticket Board</h2>
            <p className="text-sm text-gray-600">Drag and drop tickets between columns to update their status</p>
          </div>
          <div className="p-6">
            <KanbanBoard 
              tickets={tickets} 
              onTicketUpdate={(ticketId, updates) => {
                console.log('Ticket updated:', ticketId, updates);
              }}
            />
          </div>
        </div>
      )}

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryChart data={analytics.breakdowns?.category} />
          
          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">SLA Compliance</span>
                <span className="text-lg font-semibold text-green-600">
                  {analytics.performance?.slaCompliance || 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg Resolution Time</span>
                <span className="text-lg font-semibold text-blue-600">
                  {analytics.performance?.avgResolutionTime || 0}h
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overdue Tickets</span>
                <span className="text-lg font-semibold text-red-600">
                  {analytics.overview?.overdue || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Tickets</h3>
          {recentTickets?.tickets && recentTickets.tickets.length > 0 ? (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentTickets.tickets.map((ticket) => (
                  <li key={ticket._id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <TicketIcon className="h-4 w-4 text-primary-600" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-gray-900">
                            <Link
                              to={`/tickets/${ticket._id}`}
                              className="hover:text-primary-600"
                            >
                              {ticket.title}
                            </Link>
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {ticket.status.replace('_', ' ')}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                              {ticket.priority}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                          <span>Created by {ticket.createdBy.name}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
                          {ticket.assignedTo && (
                            <>
                              <span>•</span>
                              <span>Assigned to {ticket.assignedTo.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-center py-6">
              <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new ticket.</p>
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
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/tickets"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <TicketIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">View All Tickets</p>
                <p className="text-sm text-gray-500">Browse and manage tickets</p>
              </div>
            </Link>

            <Link
              to="/tickets/new"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
            >
              <div className="flex-shrink-0">
                <PlusIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">Create Ticket</p>
                <p className="text-sm text-gray-500">Submit a new support request</p>
              </div>
            </Link>

            {(user?.role === 'agent' || user?.role === 'admin') && (
              <Link
                to="/users"
                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
              >
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">Manage Users</p>
                  <p className="text-sm text-gray-500">View and manage user accounts</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Support Bot */}
      <SupportBot 
        isOpen={showBot} 
        onClose={() => setShowBot(false)} 
      />
    </div>
  );
};

export default Dashboard;
