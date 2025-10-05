import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { EyeIcon, EyeSlashIcon, TicketIcon, UserGroupIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password);
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

      <div className="relative min-h-screen flex">
        {/* Left side - Login Form */}
        <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            {/* Logo and Header */}
            <div className="mb-8">
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center mr-3">
                  <TicketIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-white">HelpDesk Mini</h1>
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Smarter ticketing software for high-velocity teams
              </h2>
              <p className="mt-4 text-xl text-blue-100">
                Deliver an exceptional ticketing experience on one AI-powered platform
              </p>
            </div>

            {/* Login Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                      autoComplete="current-password"
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

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-white/30 rounded bg-white/20"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                      Remember me
                    </label>
                  </div>

                  <div className="text-sm">
                    <a href="#" className="font-medium text-white hover:text-blue-200">
                      Forgot password?
                    </a>
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 text-lg"
                    loading={loading}
                    disabled={loading}
                  >
                    Sign in
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-white">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="font-medium text-white hover:text-blue-200 underline"
                    >
                      Sign up here
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

        {/* Right side - Demo Interface */}
        <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center p-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-2xl p-8 relative">
              {/* Demo Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">HelpDesk Portal</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-500">Live</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for help"
                    className="w-full px-4 py-3 pl-10 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Service Categories Grid */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: UserGroupIcon, title: 'Technical', desc: 'IT Support' },
                  { icon: ClockIcon, title: 'General', desc: 'General Help' },
                  { icon: CheckCircleIcon, title: 'Billing', desc: 'Payment Issues' },
                  { icon: TicketIcon, title: 'Bug Report', desc: 'Report Issues' },
                ].map((service, index) => (
                  <div key={index} className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 cursor-pointer transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <service.icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{service.title}</h4>
                        <p className="text-xs text-gray-500">{service.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Demo Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <div className="text-gray-500">Active Tickets</div>
                  <div className="font-semibold text-gray-900">24</div>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <div className="text-gray-500">Resolved Today</div>
                  <div className="font-semibold text-green-600">12</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
