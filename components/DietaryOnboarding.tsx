'use client';

import React, { useState } from 'react';
import { Leaf, Beef, ArrowRight, ArrowLeft } from 'lucide-react';
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
  onComplete: (dietaryPreferences: { isVegetarian: boolean; nonVegDays: string[] }) => void;
  onBack: () => void;
}

export default function DietaryOnboarding({ onComplete, onBack }: DietaryOnboardingProps) {
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [nonVegDays, setNonVegDays] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDayToggle = (dayKey: string) => {
    setNonVegDays(prev => 
      prev.includes(dayKey) 
        ? prev.filter(d => d !== dayKey)
        : [...prev, dayKey]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onComplete({
        isVegetarian,
        nonVegDays: isVegetarian ? [] : nonVegDays
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
        <div className="p-6 overflow-y-auto flex-1 min-h-0">

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
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-medium text-gray-700">I am vegetarian</span>
                  <p className="text-sm text-gray-500 mt-1">Plant-based meals only</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVegetarian}
                    onChange={(e) => setIsVegetarian(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative w-16 h-8 rounded-full transition-colors duration-200 ${
                    isVegetarian ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    <div className={`absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      isVegetarian ? 'translate-x-8' : 'translate-x-0'
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
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {DAYS_OF_WEEK.map(({ key, label }) => (
                    <label key={key} className="flex items-center cursor-pointer p-3 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
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
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
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
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 sm:p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <button
              onClick={onBack}
              className="px-6 py-3 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
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