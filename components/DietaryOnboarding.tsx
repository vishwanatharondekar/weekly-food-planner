'use client';

import React, { useState } from 'react';
import { Leaf, Beef, ArrowRight, ArrowLeft, Settings, Plus, Minus, Heart, ChevronDown, ChevronUp, Shield, Ban } from 'lucide-react';
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

interface DietaryOnboardingProps {
  onComplete: (dietaryPreferences: { 
    isVegetarian: boolean; 
    nonVegDays: string[];
    showCalories: boolean;
    dailyCalorieTarget: number;
    preferHealthy: boolean;
    glutenFree: boolean;
    nutsFree: boolean;
    lactoseIntolerant: boolean;
  }) => void;
  onBack: () => void;
}

export default function DietaryOnboarding({ onComplete, onBack }: DietaryOnboardingProps) {
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [nonVegDays, setNonVegDays] = useState<string[]>([]);
  const [showNonVegDays, setShowNonVegDays] = useState(false);
  const [showCalories, setShowCalories] = useState(false);
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState<number>(2000);
  const [preferHealthy, setPreferHealthy] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [nutsFree, setNutsFree] = useState(false);
  const [lactoseIntolerant, setLactoseIntolerant] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete({
        isVegetarian,
        nonVegDays: isVegetarian ? [] : nonVegDays,
        showCalories,
        dailyCalorieTarget,
        preferHealthy,
        glutenFree,
        nutsFree,
        lactoseIntolerant
      });
      
      toast.success('Dietary preferences saved! Moving to next step...');
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 flex items-center justify-center bg-white bg-opacity-20 rounded-full">
                <span className="text-lg font-bold">2</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Set Your Dietary Preferences</h2>
                <p className="text-green-100">Tell us about your dietary choices</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 min-h-0">

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
                <span className="text-sm font-medium text-gray-700">I am vegetarian</span>
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={onBack}
              className="px-4 py-2.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 text-sm"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span>Next: Select Dishes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}