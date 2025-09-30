'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Check, X } from 'lucide-react';
import { ALL_MEAL_TYPES, getMealDisplayName, DEFAULT_MEAL_SETTINGS, type MealSettings } from '@/lib/utils';
import toast from 'react-hot-toast';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

interface MealSettingsProps {
  user: any;
  onSettingsChange: (settings: MealSettings) => void;
  onClose: () => void;
}

export default function MealSettingsComponent({ user, onSettingsChange, onClose }: MealSettingsProps) {
  const [settings, setSettings] = useState<MealSettings>(DEFAULT_MEAL_SETTINGS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/meal-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const loadedSettings = data.mealSettings || DEFAULT_MEAL_SETTINGS;
        // Ensure meal types are in the correct chronological order
        const orderedSettings = {
          ...loadedSettings,
          enabledMealTypes: ALL_MEAL_TYPES.filter(type => loadedSettings.enabledMealTypes.includes(type))
        };
        setSettings(orderedSettings);
      }
    } catch (error) {
      console.error('Error loading meal settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to save settings');
        return;
      }

      const response = await fetch('/api/auth/meal-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ mealSettings: settings }),
      });

      if (response.ok) {
        // Track meal settings update
        analytics.trackEvent({
          action: AnalyticsEvents.PREFERENCES.UPDATE_MEAL_SETTINGS,
          category: 'preferences',
          custom_parameters: {
            enabled_meal_types: settings.enabledMealTypes,
            meal_types_count: settings.enabledMealTypes.length,
            user_id: user?.id,
          },
        });
        
        toast.success('Meal settings saved!');
        onSettingsChange(settings);
        onClose();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving meal settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleMealType = (mealType: string) => {
    setSettings(prev => {
      let newEnabledTypes: string[];
      
      if (prev.enabledMealTypes.includes(mealType)) {
        // Remove the meal type
        newEnabledTypes = prev.enabledMealTypes.filter(type => type !== mealType);
      } else {
        // Add the meal type in the correct chronological order
        const updatedTypes = [...prev.enabledMealTypes, mealType];
        // Sort according to the ALL_MEAL_TYPES order to maintain chronological sequence
        newEnabledTypes = ALL_MEAL_TYPES.filter(type => updatedTypes.includes(type));
      }
      
      // Ensure at least one meal type is enabled
      if (newEnabledTypes.length === 0) {
        toast.error('At least one meal type must be enabled');
        return prev;
      }

      return {
        ...prev,
        enabledMealTypes: newEnabledTypes
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Meal Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm text-gray-600">
            Choose which meals you want to include in your weekly planner:
          </p>
          
          {ALL_MEAL_TYPES.map(mealType => (
            <div key={mealType} className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {getMealDisplayName(mealType)}
              </label>
              <button
                onClick={() => toggleMealType(mealType)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                  settings.enabledMealTypes.includes(mealType)
                    ? 'bg-blue-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enabledMealTypes.includes(mealType)
                      ? 'translate-x-5'
                      : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={saveSettings}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
} 