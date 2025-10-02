'use client';

import React from 'react';
import { isGuestUser, getRemainingGuestUsage, getGuestUsageLimits } from '@/lib/guest-utils';
import { Zap, ShoppingCart, User, ArrowRight } from 'lucide-react';

interface GuestUsageIndicatorProps {
  user: any;
  onCreateAccount?: () => void;
}

export default function GuestUsageIndicator({ user, onCreateAccount }: GuestUsageIndicatorProps) {
  if (!isGuestUser(user?.id)) {
    return null;
  }

  const limits = getGuestUsageLimits();
  const remainingAI = getRemainingGuestUsage('ai');
  const remainingShopping = getRemainingGuestUsage('shopping_list');

  const getUsageColor = (remaining: number, limit: number) => {
    const percentage = remaining / limit;
    if (percentage > 0.6) return 'text-green-600 bg-green-50';
    if (percentage > 0.3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getUsageBorderColor = (remaining: number, limit: number) => {
    const percentage = remaining / limit;
    if (percentage > 0.6) return 'border-green-200';
    if (percentage > 0.3) return 'border-yellow-200';
    return 'border-red-200';
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Guest Mode</h3>
            <p className="text-sm text-gray-600">You're using the app as a guest user</p>
          </div>
        </div>
        
        {onCreateAccount && (
          <button
            onClick={onCreateAccount}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <span>Create Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Generation Usage */}
        <div className={`p-3 rounded-lg border ${getUsageBorderColor(remainingAI, limits.aiGeneration)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">AI Meal Generation</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-bold px-2 py-1 rounded ${getUsageColor(remainingAI, limits.aiGeneration)}`}>
              {remainingAI}/{limits.aiGeneration}
            </span>
            <span className="text-xs text-gray-500">remaining</span>
          </div>
        </div>

        {/* Shopping List Usage */}
        <div className={`p-3 rounded-lg border ${getUsageBorderColor(remainingShopping, limits.shoppingList)}`}>
          <div className="flex items-center space-x-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Shopping Lists</span>
          </div>
          <div className="flex items-center justify-between">
            <span className={`text-lg font-bold px-2 py-1 rounded ${getUsageColor(remainingShopping, limits.shoppingList)}`}>
              {remainingShopping}/{limits.shoppingList}
            </span>
            <span className="text-xs text-gray-500">remaining</span>
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-500 text-center">
        Create a free account to get unlimited AI generations and shopping lists
      </div>
    </div>
  );
}
