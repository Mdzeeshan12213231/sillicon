import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from 'react-query';
import { authAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { UserIcon, EnvelopeIcon, ShieldCheckIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ProfileFormData {
  name: string;
  email: string;
  preferences: {
    theme: string;
    notifications: {
      email: boolean;
      push: boolean;
    };
  };
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      preferences: {
        theme: user?.preferences?.theme || 'auto',
        notifications: {
          email: user?.preferences?.notifications?.email ?? true,
          push: user?.preferences?.notifications?.push ?? true,
        },
      },
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch,
  } = useForm<PasswordFormData>();

  const updateProfileMutation = useMutation(authAPI.updateProfile, {
    onSuccess: (data) => {
      queryClient.setQueryData('user', data);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation(authAPI.changePassword, {
    onSuccess: () => {
      toast.success('Password changed successfully');
      resetPassword();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password');
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
      preferences: {
        theme: user?.preferences?.theme || 'auto',
        notifications: {
          email: user?.preferences?.notifications?.email ?? true,
          push: user?.preferences?.notifications?.push ?? true,
        },
      },
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    resetProfile();
  };

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ];

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
        return <UserIcon className="h-4 w-4" />;
      case 'user':
        return <UserIcon className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Profile Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Profile Overview</h3>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-xl font-medium text-primary-600">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-medium text-gray-900">{user.name}</h4>
                  <p className="text-sm text-gray-500 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    {user.email}
                  </p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1 capitalize">{user.role}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                {!isEditing && (
                  <Button variant="secondary" onClick={handleEdit}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
            <div className="px-6 py-4">
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <Input
                    {...registerProfile('name', {
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                      maxLength: {
                        value: 50,
                        message: 'Name must be less than 50 characters',
                      },
                    })}
                    label="Full Name"
                    disabled={!isEditing}
                    error={profileErrors.name?.message}
                  />

                  <Input
                    {...registerProfile('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    label="Email Address"
                    type="email"
                    disabled={!isEditing}
                    error={profileErrors.email?.message}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-4">Preferences</h4>
                  <div className="space-y-4">
                    <Select
                      {...registerProfile('preferences.theme')}
                      label="Theme"
                      options={themeOptions}
                      disabled={!isEditing}
                    />

                    <div>
                      <label className="text-sm font-medium text-gray-700">Notifications</label>
                      <div className="mt-2 space-y-2">
                        <label className="flex items-center">
                          <input
                            {...registerProfile('preferences.notifications.email')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            {...registerProfile('preferences.notifications.push')}
                            type="checkbox"
                            disabled={!isEditing}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">Push notifications</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={updateProfileMutation.isLoading}
                      disabled={updateProfileMutation.isLoading}
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Change Password */}
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
            </div>
            <div className="px-6 py-4">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <Input
                  {...registerPassword('currentPassword', {
                    required: 'Current password is required',
                  })}
                  label="Current Password"
                  type="password"
                  error={passwordErrors.currentPassword?.message}
                />

                <Input
                  {...registerPassword('newPassword', {
                    required: 'New password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  label="New Password"
                  type="password"
                  error={passwordErrors.newPassword?.message}
                />

                <Input
                  {...registerPassword('confirmPassword', {
                    required: 'Please confirm your new password',
                    validate: (value) =>
                      value === watch('newPassword') || 'Passwords do not match',
                  })}
                  label="Confirm New Password"
                  type="password"
                  error={passwordErrors.confirmPassword?.message}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    loading={changePasswordMutation.isLoading}
                    disabled={changePasswordMutation.isLoading}
                  >
                    Change Password
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mt-6 bg-white shadow rounded-lg border border-red-200">
            <div className="px-6 py-4 border-b border-red-200">
              <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-red-900">Sign Out</h4>
                  <p className="text-sm text-red-700">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
