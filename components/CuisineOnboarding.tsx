'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, HelpCircle, ArrowRight } from 'lucide-react';
import { INDIAN_CUISINES, type Cuisine } from '@/lib/cuisine-data';
import BreakfastSelection from './BreakfastSelection';
import LunchDinnerSelection from './LunchDinnerSelection';
import DietaryOnboarding from './DietaryOnboarding';
import toast from 'react-hot-toast';

interface CuisineOnboardingProps {
  onComplete: (selectedCuisines: string[], selectedDishes: { breakfast: string[]; lunch_dinner: string[] }, dietaryPreferences?: { isVegetarian: boolean; nonVegDays: string[] }) => void;
}

export default function CuisineOnboarding({ onComplete }: CuisineOnboardingProps) {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedBreakfast, setSelectedBreakfast] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<{ isVegetarian: boolean; nonVegDays: string[] } | null>(null);
  const [currentStep, setCurrentStep] = useState<'cuisine' | 'dietary' | 'breakfast' | 'lunch_dinner'>('cuisine');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCuisineToggle = (cuisineName: string) => {
    setSelectedCuisines(prev => {
      if (prev.includes(cuisineName)) {
        return prev.filter(name => name !== cuisineName);
      } else {
        return [...prev, cuisineName];
      }
    });
  };

  const handleCuisineSubmit = async () => {
    if (selectedCuisines.length === 0) {
      toast.error('Please select at least one cuisine preference');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setCurrentStep('dietary');
      toast.success('Cuisine preferences saved! Now set your dietary preferences...');
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDietaryComplete = (preferences: { isVegetarian: boolean; nonVegDays: string[] }) => {
    setDietaryPreferences(preferences);
    setCurrentStep('breakfast');
  };

  const handleBreakfastComplete = (breakfast: string[]) => {
    setSelectedBreakfast(breakfast);
    setCurrentStep('lunch_dinner');
  };

  const handleLunchDinnerComplete = async (lunchDinner: string[]) => {
    try {
      // Save dish preferences to backend
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required. Please login again.');
        return;
      }

      const response = await fetch('/api/auth/dish-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dishPreferences: {
            breakfast: selectedBreakfast,
            lunch_dinner: lunchDinner
          },
          onboardingCompleted: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save preferences');
      }

      // Call the completion handler with the data
      onComplete(selectedCuisines, { breakfast: selectedBreakfast, lunch_dinner: lunchDinner }, dietaryPreferences || undefined);
    } catch (error) {
      console.error('Error saving dish preferences:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences');
    }
  };

  const handleBackToCuisines = () => {
    setCurrentStep('cuisine');
  };

  const handleBackToDietary = () => {
    setCurrentStep('dietary');
  };

  const handleBackToBreakfast = () => {
    setCurrentStep('breakfast');
  };

  // Show dietary preferences if user has completed cuisine selection
  if (currentStep === 'dietary') {
    return (
      <DietaryOnboarding
        onComplete={handleDietaryComplete}
        onBack={handleBackToCuisines}
      />
    );
  }

  // Show breakfast selection if user has completed dietary preferences
  if (currentStep === 'breakfast') {
    return (
      <BreakfastSelection
        selectedCuisines={selectedCuisines}
        initialBreakfast={selectedBreakfast}
        onComplete={handleBreakfastComplete}
        onBack={handleBackToDietary}
      />
    );
  }

  // Show lunch/dinner selection if user has completed breakfast selection
  if (currentStep === 'lunch_dinner') {
    return (
      <LunchDinnerSelection
        selectedCuisines={selectedCuisines}
        selectedBreakfast={selectedBreakfast}
        dietaryPreferences={dietaryPreferences || undefined}
        onComplete={handleLunchDinnerComplete}
        onBack={handleBackToBreakfast}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full p-2">
                <span className="text-lg font-bold">1</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Select Your Cuisines</h2>
                <p className="text-orange-100">Choose your favorite cuisine types</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              What cuisines do you enjoy?
            </h3>
            <p className="text-gray-600">
              Select your favorite cuisines to get personalized meal recommendations
            </p>
          </div>

          {/* Cuisine Grid */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {INDIAN_CUISINES.map((cuisine) => (
              <CuisineCard
                key={cuisine.name}
                cuisine={cuisine}
                isSelected={selectedCuisines.includes(cuisine.name)}
                onToggle={() => handleCuisineToggle(cuisine.name)}
              />
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 sm:p-6 flex-shrink-0">
          <div className="flex justify-end items-center">
            <button
              onClick={handleCuisineSubmit}
              disabled={selectedCuisines.length === 0 || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                <ArrowRight className="h-4 w-4" />
                <span>Next: Dietary Preferences</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CuisineCardProps {
  cuisine: Cuisine;
  isSelected: boolean;
  onToggle: () => void;
}

function CuisineCard({ cuisine, isSelected, onToggle }: CuisineCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Get sample dishes for tooltip
  const sampleDishes = [
    ...cuisine.dishes.breakfast.slice(0, 3),
    ...cuisine.dishes.lunch_dinner.slice(0, 3),
    ...cuisine.dishes.snacks.slice(0, 3)
  ].slice(0, 8); // Show max 8 dishes

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  return (
    <div className="relative" ref={tooltipRef}>
      <div
        onClick={onToggle}
        className={`cursor-pointer relative px-4 py-3 rounded-xl border-2 transition-all duration-200 text-center inline-flex items-center gap-2 ${
          isSelected
            ? 'border-orange-500 bg-orange-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        <h4 className="font-semibold text-gray-800 text-sm whitespace-nowrap">{cuisine.name}</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
        {isSelected && (
          <div className="bg-orange-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-20 top-full left-0 right-0 mt-2 p-3 bg-white border border-gray-200 rounded-lg shadow-xl max-w-xs">
          <div className="text-xs text-gray-600">
            <p className="font-semibold mb-2 text-gray-800">Sample dishes:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sampleDishes.map((dish, index) => (
                <div key={index} className="text-gray-600">
                  • {dish}
                </div>
              ))}
              {cuisine.dishes.breakfast.length + cuisine.dishes.lunch_dinner.length + cuisine.dishes.snacks.length > 8 && (
                <div className="text-gray-500 italic">
                  ...and more
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}