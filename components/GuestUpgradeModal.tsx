'use client';

import React, { useState } from 'react';
import { X, User, Mail, Lock, Zap, ShoppingCart, CheckCircle } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { analytics, AnalyticsEvents } from '@/lib/analytics';
import { clearGuestData } from '@/lib/guest-utils';

interface GuestUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
  limitType: 'ai' | 'shopping_list';
  currentUsage: number;
  usageLimit: number;
  isManualRegistration?: boolean; // True when opened from Create Account button
}

export default function GuestUpgradeModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  limitType,
  currentUsage,
  usageLimit,
  isManualRegistration = false
}: GuestUpgradeModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call the guest upgrade API instead of regular registration
      const response = await authAPI.upgradeGuestAccount(formData);
      
      // Track successful upgrade
      analytics.trackEvent({
        action: AnalyticsEvents.AUTH.REGISTER,
        category: 'authentication',
        custom_parameters: {
          user_id: response.user.id,
          method: 'guest_upgrade',
          trigger: `${limitType}_limit_reached`,
          previous_usage: currentUsage,
        },
      });

      localStorage.setItem('token', response.token);
      
      // Clear any existing guest data from localStorage
      clearGuestData();
      
      onSuccess(response.token, response.user);
      toast.success('Account created successfully! You now have unlimited access.');
      onClose();
    } catch (error: any) {
      // Track upgrade error
      analytics.trackError('guest_upgrade_error', {
        error_message: error.message || 'Unknown error',
        trigger: `${limitType}_limit_reached`,
      });
      
      toast.error(error.message || 'Failed to create account. Please try again.');
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

  const limitTypeDisplay = limitType === 'ai' ? 'AI generations' : 'shopping lists';
  const limitIcon = limitType === 'ai' ? <Zap className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              {limitIcon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Register to Continue</h2>
              <p className="text-sm text-gray-600">Create your free account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Limit Reached Message - Only show when not manual registration */}
        {!isManualRegistration && (
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="text-center">
              <p className="text-gray-600 text-sm">
              You've reached your {limitTypeDisplay} limit.
                Create a free account to get unlimited access to all features
              </p>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-700">Unlimited AI meal generations</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-700">Unlimited shopping list downloads</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-700">Save your meal plans and preferences</span>
            </div>
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-700">Access from any device and many more</span>
            </div>
          </div>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <p className="text-xs text-gray-600 text-center">
            By creating an account, you agree to our{' '}
            <a 
              href="/terms" 
              target="_blank"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Terms and Conditions
            </a>
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating your account...
              </div>
            ) : (
              'Create Free Account'
            )}
          </button>
        </form>

        {/* Login Option for Existing Users */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Already have an account?</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/signin';
              }}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
            >
              Sign in to your existing account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
