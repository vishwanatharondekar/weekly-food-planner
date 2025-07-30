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
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Dietary Preferences</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Vegetarian Toggle */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Leaf className="w-5 h-5 text-green-500 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Vegetarian Diet</h3>
              <p className="text-sm text-gray-500">Enable if you prefer vegetarian meals</p>
            </div>
          </div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isVegetarian}
              onChange={(e) => setIsVegetarian(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full transition-colors ${
              isVegetarian ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                isVegetarian ? 'translate-x-5' : 'translate-x-0'
              }`}></div>
            </div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              {isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}
            </span>
          </label>
        </div>

        {/* Non-Vegetarian Days Selection */}
        {!isVegetarian && (
          <div className="mb-6">
            <div className="flex items-center mb-4">
              <Beef className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="font-medium text-gray-900">Non-Vegetarian Days</h3>
                <p className="text-sm text-gray-500">Select days when you prefer non-vegetarian meals</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {DAYS_OF_WEEK.map(({ key, label }) => (
                <label key={key} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nonVegDays.includes(key)}
                    onChange={() => handleDayToggle(key)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            
            {nonVegDays.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  <strong>Selected non-vegetarian days:</strong> {nonVegDays.map(day => 
                    DAYS_OF_WEEK.find(d => d.key === day)?.label
                  ).join(', ')}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  AI suggestions will respect these preferences and won't mix vegetarian and non-vegetarian meals.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Vegetarian Info */}
        {isVegetarian && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <Leaf className="w-5 h-5 text-green-500 mr-2" />
              <p className="text-sm text-green-700">
                <strong>Vegetarian mode enabled.</strong> All AI suggestions will be vegetarian-friendly.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
} 