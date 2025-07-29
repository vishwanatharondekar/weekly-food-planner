'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, Trash2, Leaf, X } from 'lucide-react';
import { mealsAPI, aiAPI } from '@/lib/api';
import { DAYS_OF_WEEK, MEAL_TYPES, getWeekStartDate, formatDate, debounce } from '@/lib/utils';
import toast from 'react-hot-toast';
import DietaryPreferences from './DietaryPreferences';

interface MealData {
  [day: string]: {
    [mealType: string]: string;
  };
}

interface MealPlannerProps {
  user: any;
}

export default function MealPlanner({ user }: MealPlannerProps) {
  const [currentWeek, setCurrentWeek] = useState(getWeekStartDate(new Date()));
  const [meals, setMeals] = useState<MealData>({});
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ hasHistory: false, canGenerate: false });
  const [showDietaryPreferences, setShowDietaryPreferences] = useState(false);
  const [savingMeals, setSavingMeals] = useState<Set<string>>(new Set()); // Track which meals are being saved

  useEffect(() => {
    loadMeals();
    checkAIStatus();
  }, [currentWeek]);

  const loadMeals = async () => {
    try {
      setLoading(true);
      const weekStart = formatDate(currentWeek);
      const response = await mealsAPI.getWeekMeals(weekStart);
      setMeals(response.meals || {});
    } catch (error) {
      console.error('Error loading meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const checkAIStatus = async () => {
    try {
      const status = await aiAPI.getAIStatus();
      setAiStatus(status);
    } catch (error) {
      console.error('Error checking AI status:', error);
    }
  };

  // Debounced meal update function
  const debouncedUpdateMeal = useCallback(
    debounce(async (day: string, mealType: string, value: string) => {
      const mealKey = `${day}-${mealType}`;
      setSavingMeals(prev => new Set(prev).add(mealKey));
      
      try {
        const weekStart = formatDate(currentWeek);
        await mealsAPI.updateMeal(weekStart, day, mealType, value);
      } catch (error) {
        console.error('Error updating meal:', error);
        toast.error('Failed to update meal');
      } finally {
        setSavingMeals(prev => {
          const newSet = new Set(prev);
          newSet.delete(mealKey);
          return newSet;
        });
      }
    }, 500), // 500ms delay
    [currentWeek]
  );

  const updateMeal = async (day: string, mealType: string, value: string) => {
    // Update local state immediately for responsive UI
    setMeals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: value
      }
    }));

    // Debounce the API call
    debouncedUpdateMeal(day, mealType, value);
  };

  const generateAIMeals = async () => {
    console.log('Generating AI meals');
    try {
      setLoading(true);
      const weekStart = formatDate(currentWeek);
      const suggestions = await aiAPI.generateMeals(weekStart);
      
      // Prepare updated meals with AI suggestions for empty slots
      const updatedMeals = { ...meals };
      let hasUpdates = false;
      
      // Only update empty meals, preserve existing user input
      for (const [day, dayMeals] of Object.entries(suggestions)) {
        for (const [mealType, mealName] of Object.entries(dayMeals as any)) {
          const currentMeal = meals[day]?.[mealType] || '';
          if (!currentMeal.trim()) {
            // Update local state
            updatedMeals[day] = {
              ...updatedMeals[day],
              [mealType]: mealName as string
            };
            hasUpdates = true;
          }
        }
      }
      
      // Save all updated meals at once if there are any changes
      if (hasUpdates) {
        await mealsAPI.createOrUpdateMealPlan(weekStart, updatedMeals);
        setMeals(updatedMeals);
      }
      
      toast.success('AI meal suggestions applied to empty slots!');
      await checkAIStatus();
    } catch (error: any) {
      console.error('Error generating AI meals:', error);
      toast.error(error.message || 'Failed to generate AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const clearMeals = async () => {
    // Add confirmation dialog
    const confirmed = window.confirm('Are you sure you want to clear all meals for this week? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      const weekStart = formatDate(currentWeek);
      await mealsAPI.clearWeekMeals(weekStart);
      setMeals({});
      toast.success('All meals cleared for this week!');
      await checkAIStatus(); // Re-check AI status after clearing
    } catch (error) {
      console.error('Error clearing meals:', error);
      toast.error('Failed to clear meals');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'next' | 'prev') => {
    setCurrentWeek(prev => 
      direction === 'next' ? addWeeks(prev, 1) : subWeeks(prev, 1)
    );
  };

  const getWeekRange = () => {
    const endDate = new Date(currentWeek);
    endDate.setDate(currentWeek.getDate() + 6);
    return `${format(currentWeek, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {aiStatus.canGenerate && (
                  <button
                    disabled
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-pink-600 opacity-50 cursor-not-allowed"
                  >
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </button>
                )}
                <button
                  onClick={() => setShowDietaryPreferences(true)}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <Leaf className="w-4 h-4 mr-2" />
                  Dietary Preferences
                </button>
                <button
                  onClick={() => navigateWeek('prev')}
                  disabled={loading}
                  className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-lg font-medium text-gray-900">
                  {getWeekRange()}
                </span>
                <button
                  onClick={() => navigateWeek('next')}
                  disabled={loading}
                  className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Meal Table */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Day
                    </th>
                    {MEAL_TYPES.map(mealType => (
                      <th key={mealType} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const dayDate = new Date(currentWeek);
                    dayDate.setDate(currentWeek.getDate() + index);
                    
                    return (
                      <tr key={day} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(dayDate, 'MMM d')}
                          </div>
                        </td>
                        {MEAL_TYPES.map(mealType => (
                          <td key={mealType} className="px-6 py-4 whitespace-nowrap">
                            <div className="relative">
                              <input
                                type="text"
                                value={meals[day]?.[mealType] || ''}
                                onChange={(e) => updateMeal(day, mealType, e.target.value)}
                                placeholder={`Enter ${mealType}...`}
                                disabled={loading}
                                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50 ${
                                  savingMeals.has(`${day}-${mealType}`) 
                                    ? 'border-blue-300 bg-blue-50' 
                                    : 'border-gray-300'
                                }`}
                              />
                              {savingMeals.has(`${day}-${mealType}`) && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                              )}
                              {meals[day]?.[mealType] && !savingMeals.has(`${day}-${mealType}`) && (
                                <button
                                  type="button"
                                  onClick={() => updateMeal(day, mealType, '')}
                                  disabled={loading}
                                  className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors disabled:opacity-50"
                                  title="Clear meal"
                                >
                                  <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Status */}
          {!aiStatus.hasHistory && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Start Planning to Unlock AI Features
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Fill in at least 2 weeks of meal data to enable AI-powered suggestions for empty slots.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Dietary Preferences Modal */}
        {showDietaryPreferences && (
          <DietaryPreferences onClose={() => setShowDietaryPreferences(false)} />
        )}
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {aiStatus.canGenerate && (
                <button
                  onClick={generateAIMeals}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Fill Empty Slots
                </button>
              )}
              <button
                onClick={clearMeals}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Meals
              </button>
              <button
                onClick={() => setShowDietaryPreferences(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Dietary Preferences
              </button>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek('prev')}
                disabled={loading}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium text-gray-900 min-w-[120px] text-center">
                {getWeekRange()}
              </span>
              <button
                onClick={() => navigateWeek('next')}
                disabled={loading}
                className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Dietary Preferences Modal */}
          {showDietaryPreferences && (
            <DietaryPreferences onClose={() => setShowDietaryPreferences(false)} />
          )}
        </div>

        {/* Meal Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day
                  </th>
                  {MEAL_TYPES.map(mealType => (
                    <th key={mealType} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayDate = new Date(currentWeek);
                  dayDate.setDate(currentWeek.getDate() + index);
                  
                  return (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(dayDate, 'MMM d')}
                        </div>
                      </td>
                      {MEAL_TYPES.map(mealType => (
                        <td key={mealType} className="px-6 py-4 whitespace-nowrap">
                          <div className="relative">
                            <input
                              type="text"
                              value={meals[day]?.[mealType] || ''}
                              onChange={(e) => updateMeal(day, mealType, e.target.value)}
                              placeholder={`Enter ${mealType}...`}
                              className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                savingMeals.has(`${day}-${mealType}`) 
                                  ? 'border-blue-300 bg-blue-50' 
                                  : 'border-gray-300'
                              }`}
                            />
                            {savingMeals.has(`${day}-${mealType}`) && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {meals[day]?.[mealType] && !savingMeals.has(`${day}-${mealType}`) && (
                              <button
                                type="button"
                                onClick={() => updateMeal(day, mealType, '')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                                title="Clear meal"
                              >
                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </button>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Status */}
        {!aiStatus.hasHistory && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Start Planning to Unlock AI Features
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Fill in at least 2 weeks of meal data to enable AI-powered suggestions for empty slots.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
} 