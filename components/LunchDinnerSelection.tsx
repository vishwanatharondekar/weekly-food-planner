'use client';

import React, { useState } from 'react';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { INDIAN_CUISINES, getUniversalCuisines, getDishesForCuisines } from '@/lib/cuisine-data';
import toast from 'react-hot-toast';

interface LunchDinnerSelectionProps {
  selectedCuisines: string[];
  selectedBreakfast: string[];
  dietaryPreferences?: { isVegetarian: boolean; nonVegDays: string[] };
  onComplete: (selectedLunchDinner: string[]) => void;
  onBack: () => void;
}

export default function LunchDinnerSelection({ selectedCuisines, selectedBreakfast, dietaryPreferences, onComplete, onBack }: LunchDinnerSelectionProps) {
  const [selectedLunchDinner, setSelectedLunchDinner] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get all available lunch/dinner dishes from selected cuisines + universal
  const availableLunchDinner = React.useMemo(() => {
    const isVegetarian = dietaryPreferences?.isVegetarian || false;
    const cuisineDishes = getDishesForCuisines(selectedCuisines, isVegetarian);
    const universalDishes = getUniversalCuisines(isVegetarian);

    // Fix: Avoid using Set spread for deduplication to prevent TS/ES5 iteration issues
    const allDishes = [
      ...(cuisineDishes.lunch_dinner || []),
      ...(universalDishes.lunch_dinner || []),
    ];
    const uniqueDishes: string[] = [];
    const seen = new Set<string>();
    for (const dish of allDishes) {
      if (!seen.has(dish)) {
        seen.add(dish);
        uniqueDishes.push(dish);
      }
    }
    return uniqueDishes;
  }, [selectedCuisines, dietaryPreferences]);


  const handleDishToggle = (dish: string) => {
    setSelectedLunchDinner(prev => 
      prev.includes(dish)
        ? prev.filter(d => d !== dish)
        : [...prev, dish]
    );
  };


  const handleSubmit = async () => {
    if (selectedLunchDinner.length === 0) {
      toast.error('Please select at least one lunch/dinner option');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete(selectedLunchDinner);
      toast.success('Lunch & Dinner preferences saved! Generating your meal plan...');
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 rounded-full p-2">
                <span className="text-lg font-bold">3</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Select Your Lunch & Dinner Options</h2>
                <p className="text-orange-100">Choose your favorite lunch and dinner dishes</p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">

          {/* Dishes Grid */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {availableLunchDinner.map((dish) => (
              <DishCard
                key={dish}
                dish={dish}
                isSelected={selectedLunchDinner.includes(dish)}
                onToggle={() => handleDishToggle(dish)}
              />
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 sm:p-6 flex-shrink-0">
          <div className="flex justify-end items-center">
            <button
              onClick={handleSubmit}
              disabled={selectedLunchDinner.length === 0 || isSubmitting}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span>Complete Setup</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DishCardProps {
  dish: string;
  isSelected: boolean;
  onToggle: () => void;
}

function DishCard({ dish, isSelected, onToggle }: DishCardProps) {
  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer px-4 py-2 rounded-lg border-2 transition-all duration-200 text-center inline-flex items-center gap-2 ${
        isSelected
          ? 'border-orange-500 bg-orange-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{dish}</span>
      {isSelected && (
        <div className="bg-orange-500 text-white rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}