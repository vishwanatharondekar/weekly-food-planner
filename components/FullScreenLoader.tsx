'use client';

import React from 'react';
import { X, Loader2 } from 'lucide-react';

interface FullScreenLoaderProps {
  isVisible: boolean;
  onCancel?: () => void;
  message: string;
  subMessage?: string;
}

export default function FullScreenLoader({ 
  isVisible, 
  onCancel, 
  message, 
  subMessage 
}: FullScreenLoaderProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      
      {/* Main loader content */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full mx-4">
        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          aria-label="Cancel"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Loading content */}
        <div className="text-center">
          {/* Animated spinner */}
          <div className="mb-6">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto" />
          </div>
          
          {/* Main message */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {message}
          </h3>
          
          {/* Sub message */}
          {subMessage && (
            <p className="text-gray-600 text-sm">
              {subMessage}
            </p>
          )}
          
          {/* Progress dots animation */}
          <div className="flex justify-center space-x-1 mt-6">
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}