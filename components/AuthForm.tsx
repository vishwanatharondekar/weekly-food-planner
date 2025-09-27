'use client';

import React, { useState } from 'react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

interface AuthFormProps {
  mode: 'login' | 'register';
  onSuccess: (token: string, user: any) => void;
  onToggleMode: () => void;
}

export default function AuthForm({ mode, onSuccess, onToggleMode }: AuthFormProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (mode === 'register') {
        response = await authAPI.register(formData);
        
        // Track registration event
        analytics.trackEvent({
          action: AnalyticsEvents.AUTH.REGISTER,
          category: 'authentication',
          custom_parameters: {
            user_id: response.user.id,
            method: 'email',
          },
        });
      } else {
        response = await authAPI.login(formData);
        
        // Track login event
        analytics.trackEvent({
          action: AnalyticsEvents.AUTH.LOGIN,
          category: 'authentication',
          custom_parameters: {
            user_id: response.user.id,
            method: 'email',
          },
        });
      }

      localStorage.setItem('token', response.token);
      onSuccess(response.token, response.user);
      toast.success(mode === 'login' ? 'Login successful!' : 'Registration successful!');
    } catch (error: any) {
      // Track authentication error
      analytics.trackError(`auth_${mode}_error`, {
        error_message: error.message || 'Unknown error',
        method: 'email',
      });
      
      toast.error(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation Header */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                <img 
                  src="/images/logos/logo-pack-fe229c/icon-transparent.png" 
                  alt="खाना क्या बनाऊं Logo" 
                  className="w-10 h-10 object-contain"
                />
              </div>
              <span className="text-xl font-bold text-slate-800">खाना क्या बनाऊं</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Auth Form Content */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-slate-600">
            {mode === 'login' 
              ? 'Sign in to continue planning your meals'
              : 'Create your account to start meal planning'
            }
          </p>
        </div>
        <form className="bg-white rounded-2xl shadow-xl p-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required={mode === 'register'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-slate-900 placeholder-slate-400"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-slate-600 hover:text-blue-600 transition-colors duration-200 font-medium"
            >
              {mode === 'login' 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

        </form>
        </div>
      </div>
    </div>
  );
} 