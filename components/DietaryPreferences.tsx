'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Leaf, Beef } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

interface DietaryPreferencesProps {
  user: any;
  onClose: () => void;
}

export default function DietaryPreferences({ user, onClose }: DietaryPreferencesProps) {
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [nonVegDays, setNonVegDays] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadDietaryPreferences();
  }, []);

  const loadDietaryPreferences = async () => {
    try {
      const preferences = await authAPI.getDietaryPreferences();
      if (preferences) {
        setIsVegetarian(preferences.isVegetarian);
        setNonVegDays(preferences.nonVegDays);
      }
    } catch (error) {
      console.error('Error loading dietary preferences:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleDayToggle = (dayKey: string) => {
    setNonVegDays(prev => 
      prev.includes(dayKey) 
        ? prev.filter(d => d !== dayKey)
        : [...prev, dayKey]
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await authAPI.updateDietaryPreferences({
        nonVegDays,
        isVegetarian,
      });
      toast.success('Dietary preferences saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving dietary preferences:', error);
      toast.error('Failed to save dietary preferences');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Dietary Preferences</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Vegetarian Toggle */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <div className="p-3 bg-green-100 rounded-full mr-4">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Vegetarian Diet</h3>
              <p className="text-sm text-gray-600">Choose your dietary preference</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Vegetarian</span>
                <p className="text-xs text-gray-500 mt-1">Plant-based meals only</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isVegetarian}
                  onChange={(e) => setIsVegetarian(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                  isVegetarian ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    isVegetarian ? 'translate-x-7' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Non-Vegetarian Days Selection */}
        {!isVegetarian && (
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-red-100 rounded-full mr-4">
                <Beef className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Non-Vegetarian Days</h3>
                <p className="text-sm text-gray-600">Select days for meat/fish meals</p>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <label key={key} className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={nonVegDays.includes(key)}
                      onChange={() => handleDayToggle(key)}
                      className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-2"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              
              {nonVegDays.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700 font-medium">
                    Selected: {nonVegDays.map(day => 
                      DAYS_OF_WEEK.find(d => d.key === day)?.label
                    ).join(', ')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    AI will suggest meat/fish meals only on selected days.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vegetarian Info */}
        {isVegetarian && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <Leaf className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Vegetarian mode enabled
                </p>
                <p className="text-xs text-green-700 mt-1">
                  All AI suggestions will be plant-based and vegetarian-friendly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
} 