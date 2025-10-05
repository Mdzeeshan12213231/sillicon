import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { EyeIcon, EyeSlashIcon, TicketIcon } from '@heroicons/react/24/outline';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const roleOptions = [
    { value: 'user', label: 'User' },
    { value: 'agent', label: 'Agent' },
    { value: 'admin', label: 'Admin' },
  ];

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data.name, data.email, data.password, data.role);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center mr-3">
                <TicketIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-white">HelpDesk Mini</h1>
            </div>
            <h2 className="text-3xl font-bold text-white">
              Create your account
            </h2>
            <p className="mt-2 text-lg text-blue-100">
              Join thousands of teams already using our platform
            </p>
          </div>
          {/* Registration Form */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    Full name
                  </label>
                  <input
                    {...register('name', {
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
                    type="text"
                    autoComplete="name"
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-200">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Work email
                  </label>
                  <input
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                    type="email"
                    autoComplete="email"
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-200">{errors.email.message}</p>
                  )}
                  <p className="mt-2 text-xs text-blue-200">
                    Using a work email helps find teammates and boost collaboration.
                  </p>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-white mb-2">
                    Role
                  </label>
                  <select
                    {...register('role', {
                      required: 'Role is required',
                    })}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
                  >
                    <option value="" className="bg-gray-800 text-white">Select your role</option>
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value} className="bg-gray-800 text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-200">{errors.role.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-blue-200" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-blue-200" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-200">{errors.password.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value) =>
                          value === password || 'Passwords do not match',
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Confirm your password"
                      className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-blue-200" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-blue-200" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-200">{errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 text-lg"
                  loading={loading}
                  disabled={loading}
                >
                  Create account
                </Button>
              </div>

              <div className="text-center">
                <p className="text-white">
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-white hover:text-blue-200 underline"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Trust indicators */}
          <div className="mt-8">
            <p className="text-center text-sm text-blue-200 mb-4">
              Trusted by teams at
            </p>
            <div className="flex justify-center items-center space-x-6 opacity-60">
              <div className="text-white font-semibold">Company A</div>
              <div className="text-white font-semibold">Company B</div>
              <div className="text-white font-semibold">Company C</div>
              <div className="text-white font-semibold">Company D</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
