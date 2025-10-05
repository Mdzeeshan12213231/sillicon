import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { usersAPI } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import {
  UserGroupIcon,
  FunnelIcon,
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const Users: React.FC = () => {
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    page: 1,
    limit: 20,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: usersData, isLoading } = useQuery(
    ['users', filters],
    () => usersAPI.getUsers(filters),
    {
      keepPreviousData: true,
    }
  );

  const roleOptions = [
    { value: '', label: 'All Roles' },
    { value: 'user', label: 'User' },
    { value: 'agent', label: 'Agent' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'agent':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4" />;
      case 'agent':
        return <UserGroupIcon className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
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
            Users
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage user accounts and permissions
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Search"
              placeholder="Search users..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
            <Select
              label="Role"
              options={roleOptions}
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {usersData?.users && usersData.users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
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
                {usersData.users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary-600">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <EnvelopeIcon className="h-4 w-4 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1 capitalize">{user.role}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  'bg-gray-100 text-gray-800'
                      }`}>
                  'User'
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin
                        ? formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {/* createdAt removed, User type does not have this property */}
                        {/* createdAt not in User type, so just show a placeholder or remove */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-primary-600 hover:text-primary-900">
                          View
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filters.search || filters.role
                ? 'Try adjusting your filters.'
                : 'No users have been created yet.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {usersData?.pagination && usersData.pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button
                variant="secondary"
                disabled={!usersData.pagination.hasPrev}
                onClick={() => handlePageChange(filters.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={!usersData.pagination.hasNext}
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
                    {Math.min(filters.page * filters.limit, usersData.pagination.totalItems)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{usersData.pagination.totalItems}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!usersData.pagination.hasPrev}
                    onClick={() => handlePageChange(filters.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={!usersData.pagination.hasNext}
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

export default Users;
