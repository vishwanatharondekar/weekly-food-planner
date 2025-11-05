'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Leaf, Beef, Plus, Minus, Heart, ChevronDown, ChevronUp, Shield, Ban } from 'lucide-react';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

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
  onUserUpdate?: (updatedUser: any) => void;
}

export default function DietaryPreferences({ user, onClose, onUserUpdate }: DietaryPreferencesProps) {
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [nonVegDays, setNonVegDays] = useState<string[]>([]);
  const [showNonVegDays, setShowNonVegDays] = useState(false);
  const [showCalories, setShowCalories] = useState(false);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<number>(2000);
  const [preferHealthy, setPreferHealthy] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [nutsFree, setNutsFree] = useState(false);
  const [lactoseIntolerant, setLactoseIntolerant] = useState(false);
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
        setNonVegDays(preferences.nonVegDays || []);
        setShowCalories(preferences.showCalories || false);
        setDailyCalorieTarget(preferences.dailyCalorieTarget || 2000);
        setPreferHealthy(preferences.preferHealthy || false);
        setGlutenFree(preferences.glutenFree || false);
        setNutsFree(preferences.nutsFree || false);
        setLactoseIntolerant(preferences.lactoseIntolerant || false);
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

  const updateCalorieTarget = (change: number) => {
    const currentTarget = dailyCalorieTarget || 2000;
    const newTarget = Math.max(500, Math.min(5000, currentTarget + change)); // Min 500, Max 5000
    setDailyCalorieTarget(newTarget);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await authAPI.updateDietaryPreferences({
        nonVegDays,
        isVegetarian,
        showCalories,
        dailyCalorieTarget,
        preferHealthy,
        glutenFree,
        nutsFree,
        lactoseIntolerant,
      });
      
      // Track dietary preferences update
      analytics.trackEvent({
        action: AnalyticsEvents.PREFERENCES.UPDATE_DIETARY,
        category: 'preferences',
        custom_parameters: {
          is_vegetarian: isVegetarian,
          non_veg_days: nonVegDays,
          non_veg_days_count: nonVegDays.length,
          show_calories: showCalories,
          daily_calorie_target: dailyCalorieTarget,
          prefer_healthy: preferHealthy,
          gluten_free: glutenFree,
          nuts_free: nutsFree,
          lactose_intolerant: lactoseIntolerant,
          user_id: user?.id,
        },
      });
      
      toast.success('Dietary preferences saved successfully!');
      
      // Update user data in parent component
      if (onUserUpdate) {
        const updatedUser = {
          ...user,
          dietaryPreferences: {
            isVegetarian,
            nonVegDays,
            showCalories,
            dailyCalorieTarget,
            preferHealthy,
            glutenFree,
            nutsFree,
            lactoseIntolerant
          }
        };
        onUserUpdate(updatedUser);
      }
      
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
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Dietary Preferences</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Vegetarian Toggle */}
        <div className="mb-5">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-green-100 rounded-full mr-3">
              <Leaf className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Vegetarian Diet</h3>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Vegetarian</span>
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
          <div className="mb-5 pb-5 border-b border-gray-200">
            <button
              onClick={() => setShowNonVegDays(!showNonVegDays)}
              className="w-full flex items-center justify-between mb-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-full mr-3">
                  <Beef className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Non-Vegetarian Days</h3>
              </div>
              {showNonVegDays ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>
            
            {showNonVegDays && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-2">
                  {DAYS_OF_WEEK.map(({ key, label }) => (
                    <label key={key} className="flex items-center cursor-pointer p-2 rounded hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={nonVegDays.includes(key)}
                        onChange={() => handleDayToggle(key)}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500 focus:ring-1"
                      />
                      <span className="ml-2 text-xs font-medium text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                
                {nonVegDays.length > 0 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                    Selected: {nonVegDays.map(day => 
                      DAYS_OF_WEEK.find(d => d.key === day)?.label
                    ).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Prefer Healthy & Dietary Restrictions */}
        <div className="mb-5 pb-5 border-b border-gray-200">
          <div className="flex items-center mb-3">
            <div className="p-2 bg-blue-100 rounded-full mr-3">
              <Heart className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">Preferences & Restrictions</h3>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {/* Prefer Healthy */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-700">Prefer healthy meals</span>
                <p className="text-xs text-gray-500 mt-0.5">(prefer high protein items)</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferHealthy}
                  onChange={(e) => setPreferHealthy(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                  preferHealthy ? 'bg-blue-500' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    preferHealthy ? 'translate-x-7' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>

            {/* Dietary Restrictions */}
            <div className="pt-3 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Gluten Free</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={glutenFree}
                    onChange={(e) => setGlutenFree(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    glutenFree ? 'bg-purple-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      glutenFree ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Nuts Free</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nutsFree}
                    onChange={(e) => setNutsFree(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    nutsFree ? 'bg-purple-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      nutsFree ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Lactose Intolerant</span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lactoseIntolerant}
                    onChange={(e) => setLactoseIntolerant(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                    lactoseIntolerant ? 'bg-purple-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      lactoseIntolerant ? 'translate-x-5' : 'translate-x-0'
                    }`}></div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Calorie Tracking */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-full mr-3">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Calorie Tracking</h3>
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Experimental
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Show Calorie Count</span>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCalories}
                  onChange={(e) => setShowCalories(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                  showCalories ? 'bg-orange-500' : 'bg-gray-300'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    showCalories ? 'translate-x-7' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>

            {showCalories && (
              <div className="pt-3 border-t border-gray-200">
                <label className="block text-xs font-medium text-gray-700 mb-2">Daily Calorie Target</label>
                <div className="flex items-center justify-center space-x-3">
                  <button
                    onClick={() => updateCalorieTarget(-50)}
                    className="flex items-center justify-center w-9 h-9 bg-white border-2 border-orange-300 text-orange-600 rounded-full hover:bg-orange-100 transition-all"
                    title="Decrease by 50"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <div className="flex items-center justify-center min-w-[100px] px-3 py-1.5 bg-white border-2 border-orange-300 rounded-lg">
                    <span className="text-xl font-bold text-orange-600">
                      {dailyCalorieTarget || 2000}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">kcal</span>
                  </div>
                  
                  <button
                    onClick={() => updateCalorieTarget(50)}
                    className="flex items-center justify-center w-9 h-9 bg-white border-2 border-orange-300 text-orange-600 rounded-full hover:bg-orange-100 transition-all"
                    title="Increase by 50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Range: 500 - 5000 kcal
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
} 