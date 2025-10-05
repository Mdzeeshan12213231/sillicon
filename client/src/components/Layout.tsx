import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'react-query';
import { notificationsAPI } from '../lib/api';
import {
  HomeIcon,
  TicketIcon,
  PlusIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import Notifications from './Notifications';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();

  const { data: unreadCountData } = useQuery(
    'unread-count',
    notificationsAPI.getUnreadCount,
    {
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );
  const unreadCount = typeof unreadCountData === 'object' && unreadCountData !== null ? unreadCountData.count : unreadCountData;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, current: location.pathname === '/dashboard' },
    { name: 'Tickets', href: '/tickets', icon: TicketIcon, current: location.pathname.startsWith('/tickets') },
    { name: 'New Ticket', href: '/tickets/new', icon: PlusIcon, current: location.pathname === '/tickets/new' },
  ];

  if (user?.role === 'agent' || user?.role === 'admin') {
    navigation.push({ name: 'Users', href: '/users', icon: UsersIcon, current: location.pathname === '/users' });
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="relative flex w-full max-w-xs flex-1 flex-col bg-white"
            >
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  type="button"
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => setSidebarOpen(false)}
                >
                  <XMarkIcon className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                <div className="flex flex-shrink-0 items-center px-4">
                  <h1 className="text-xl font-bold text-gray-900">HelpDesk Mini</h1>
                </div>
                <nav className="mt-5 space-y-1 px-2">
                  {navigation.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className={`${
                        item.current
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                    >
                      <item.icon
                        className={`${
                          item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-4 h-6 w-6 flex-shrink-0`}
                      />
                      {item.name}
                    </a>
                  ))}
                </nav>
              </div>
              <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user?.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700">{user?.name}</p>
                    <p className="text-sm font-medium text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200">
          <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <h1 className="text-xl font-bold text-gray-900">HelpDesk Mini</h1>
            </div>
            <nav className="mt-5 flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`${
                    item.current
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                >
                  <item.icon
                    className={`${
                      item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-3 h-6 w-6 flex-shrink-0`}
                  />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs font-medium text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b border-gray-200 lg:hidden">
          <button
            type="button"
            className="border-r border-gray-200 px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <div className="flex flex-1 justify-between px-4">
            <div className="flex flex-1">
              <h1 className="text-lg font-semibold text-gray-900 self-center">HelpDesk Mini</h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <BellIcon className="h-6 w-6" />
                {typeof unreadCount === 'number' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                    {typeof unreadCount === 'number' ? (unreadCount > 9 ? '9+' : unreadCount) : null}
                  </span>
                )}
              </button>
              <div className="relative ml-3">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children ? children : <Outlet />}
            </div>
          </div>
        </main>
      </div>

      {/* Notifications Panel */}
      <Notifications 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </div>
  );
};

export default Layout;
