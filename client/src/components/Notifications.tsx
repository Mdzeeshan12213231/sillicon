import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { notificationsAPI } from '../lib/api';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import LoadingSpinner from './LoadingSpinner';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticket?: {
    _id: string;
    title: string;
    status: string;
  };
}

interface NotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { data: notificationsData, isLoading } = useQuery(
    ['notifications', activeTab],
    () => notificationsAPI.getNotifications({ 
  // unreadOnly removed, not in FilterOptions
      limit: 20 
    }),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  const { data: unreadCountData } = useQuery(
    'unread-count',
    notificationsAPI.getUnreadCount,
    {
      refetchInterval: 30000,
    }
  );
  const unreadCount = typeof unreadCountData === 'object' && unreadCountData !== null ? unreadCountData.count : unreadCountData;

  const markAsReadMutation = useMutation(notificationsAPI.markAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('notifications');
      queryClient.invalidateQueries('unread-count');
    },
  });

  const markAllAsReadMutation = useMutation(notificationsAPI.markAllAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries('notifications');
      queryClient.invalidateQueries('unread-count');
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket_created':
        return '🎫';
      case 'ticket_updated':
        return '📝';
      case 'ticket_assigned':
        return '👤';
      case 'ticket_escalated':
        return '⚠️';
      case 'comment_added':
        return '💬';
      case 'sla_breach':
        return '🚨';
      case 'sla_warning':
        return '⏰';
      case 'ticket_resolved':
        return '✅';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'sla_breach':
      case 'ticket_escalated':
        return 'text-red-600 bg-red-50';
      case 'sla_warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'ticket_assigned':
        return 'text-blue-600 bg-blue-50';
      case 'ticket_resolved':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {typeof unreadCount === 'number' && unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white">
                  {typeof unreadCount === 'number' ? unreadCount : null}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'unread'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Unread
              </button>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
            <button
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isLoading || !notificationsData?.notifications?.length}
              className="text-sm text-blue-600 hover:text-blue-500 disabled:opacity-50"
            >
              {markAllAsReadMutation.isLoading ? 'Marking...' : 'Mark all as read'}
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="px-6 py-4">
                {notificationsData && notificationsData.notifications && notificationsData.notifications.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {notificationsData.notifications.map((notification: Notification) => (
                      <div
                        key={notification._id}
                        className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getNotificationColor(notification.type)}`}>
                              <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>{notification.title}</p>
                              {!notification.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(notification._id)}
                                  className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                            {notification.ticket && (
                              <p className="mt-1 text-xs text-gray-500">Ticket: {notification.ticket.title}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-400">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <BellIcon className="h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {activeTab === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
