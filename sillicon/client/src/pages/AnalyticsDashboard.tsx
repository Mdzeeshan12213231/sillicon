import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { analyticsAPI } from '../lib/api';
import {
  ChartBarIcon,
  ClockIcon,
  TicketIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

const AnalyticsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('week');

  const { data: analyticsData, isLoading } = useQuery(
    ['analytics', 'dashboard'],
    () => analyticsAPI.getDashboard(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: trendsData } = useQuery(
    ['analytics', 'trends', timeRange],
    () => analyticsAPI.getTrends({ period: timeRange }),
    {
      refetchInterval: 60000, // Refetch every minute
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const analytics = analyticsData?.analytics;
  const trends = trendsData?.trends || [];

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500'
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center">
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className="flex items-center mt-1">
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
          </div>
        </div>
      </div>
    );
  };

  const CategoryChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + item.count, 0);

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tickets by Category</h3>
        <div className="space-y-3">
          {data.map((item, index) => {
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

  const HourlyChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    const maxCount = Math.max(...data.map(item => item.count));

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tickets by Hour</h3>
        <div className="flex items-end space-x-1 h-32">
          {data.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-blue-500 rounded-t w-full"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500 mt-1">{item.hour}:00</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const TrendChart = ({ data }) => {
    if (!data || data.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Trends</h3>
        <div className="h-64 flex items-end space-x-2">
          {data.map((item, index) => {
            const maxTickets = Math.max(...data.map(d => d.totalTickets));
            const height = maxTickets > 0 ? (item.totalTickets / maxTickets) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div 
                  className="bg-blue-500 rounded-t w-full mb-2"
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs text-gray-500">{item._id}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Last 7 Days</option>
            <option value="week">Last 4 Weeks</option>
            <option value="month">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tickets"
          value={analytics?.overview?.total || 0}
          change={5.2}
          icon={TicketIcon}
          color="blue"
        />
        <StatCard
          title="Open Tickets"
          value={analytics?.overview?.open || 0}
          change={-2.1}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
        <StatCard
          title="Resolved Today"
          value={analytics?.overview?.today || 0}
          change={12.5}
          icon={CheckCircleIcon}
          color="green"
        />
        <StatCard
          title="Avg Response Time"
          value={`${analytics?.performance?.avgResponseTime || 0}h`}
          change={-8.3}
          icon={ClockIcon}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryChart data={analytics?.breakdowns?.category} />
        <HourlyChart data={analytics?.breakdowns?.hourly} />
      </div>

      {/* Trends Chart */}
      <TrendChart data={trends} />

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          {analytics?.recentActivity?.length > 0 ? (
            <div className="space-y-4">
              {analytics.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">
                        {activity.createdBy} • {activity.status} • {activity.priority}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(activity.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;

