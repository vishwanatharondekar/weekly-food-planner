'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ChefHat, Sparkles, HelpCircle } from 'lucide-react';
import { INDIAN_CUISINES, type Cuisine } from '@/lib/cuisine-data';
import toast from 'react-hot-toast';

interface CuisineOnboardingProps {
  onComplete: (selectedCuisines: string[]) => void;
}

export default function CuisineOnboarding({ onComplete }: CuisineOnboardingProps) {
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
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

  const handleSubmit = async () => {
    if (selectedCuisines.length === 0) {
      toast.error('Please select at least one cuisine preference');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete(selectedCuisines);
      toast.success('Cuisine preferences saved! Generating your personalized meal plan...');
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Welcome to Your Food Journey!</h2>
                <p className="text-orange-100">Tell us about your cuisine preferences</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              What cuisines do you enjoy?
            </h3>
            <p className="text-gray-600">
              Select your favorite cuisines to get personalized meal recommendations
            </p>
          </div>

          {/* Cuisine Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {INDIAN_CUISINES.map((cuisine) => (
              <CuisineCard
                key={cuisine.name}
                cuisine={cuisine}
                isSelected={selectedCuisines.includes(cuisine.name)}
                onToggle={() => handleCuisineToggle(cuisine.name)}
              />
            ))}
          </div>

          {/* Selected Count */}
          {selectedCuisines.length > 0 && (
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                {selectedCuisines.length} cuisine{selectedCuisines.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex justify-end items-center">
            <button
              onClick={handleSubmit}
              disabled={selectedCuisines.length === 0 || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Generate My Meal Plan</span>
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
        className={`cursor-pointer relative p-4 rounded-xl border-2 transition-all duration-200 text-left w-full ${
          isSelected
            ? 'border-orange-500 bg-orange-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800 text-sm">{cuisine.name}</h4>
          <div className="flex items-center space-x-2">
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
        </div>
        <div className="mt-2 text-xs text-gray-400">
          <div className="truncate">
            {cuisine.dishes.breakfast[0]} • {cuisine.dishes.lunch_dinner[0]} • {cuisine.dishes.snacks[0]}
          </div>
        </div>
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