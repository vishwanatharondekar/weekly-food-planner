'use client';

import React, { useState } from 'react';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { INDIAN_CUISINES, getUniversalCuisines, getDishesForCuisines } from '@/lib/cuisine-data';
import toast from 'react-hot-toast';

interface BreakfastSelectionProps {
  selectedCuisines: string[];
  initialBreakfast?: string[];
  onComplete: (selectedBreakfast: string[]) => void;
  onBack: () => void;
}

export default function BreakfastSelection({ selectedCuisines, initialBreakfast = [], onComplete, onBack }: BreakfastSelectionProps) {
  const [selectedBreakfast, setSelectedBreakfast] = useState<string[]>(initialBreakfast);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update selected breakfast when initialBreakfast prop changes (when navigating back)
  React.useEffect(() => {
    setSelectedBreakfast(initialBreakfast);
  }, [initialBreakfast]);

  // Get all available breakfast dishes from selected cuisines + universal
  const availableBreakfast = React.useMemo(() => {
    const cuisineDishes = getDishesForCuisines(selectedCuisines);
    const universalDishes = getUniversalCuisines();

    // Avoid using Set spread for compatibility; use Array.from instead
    return Array.from(
      new Set([
        ...cuisineDishes.breakfast,
        ...universalDishes.breakfast
      ])
    );
  }, [selectedCuisines]);


  const handleDishToggle = (dish: string) => {
    setSelectedBreakfast(prev => 
      prev.includes(dish)
        ? prev.filter(d => d !== dish)
        : [...prev, dish]
    );
  };


  const handleSubmit = async () => {
    if (selectedBreakfast.length === 0) {
      toast.error('Please select at least one breakfast option');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      onComplete(selectedBreakfast);
      toast.success('Breakfast preferences saved!');
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
              <div className="bg-white bg-opacity-20 rounded-full w-10 h-10 flex items-center justify-center">
                <span className="text-lg font-bold">3</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Select <span className="underline">Breakfast</span> Dishes you like</h2>
                <p className="text-orange-100">Choose your favorite breakfast dishes</p>
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
            {availableBreakfast.map((dish) => (
              <DishCard
                key={dish}
                dish={dish}
                isSelected={selectedBreakfast.includes(dish)}
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
              disabled={selectedBreakfast.length === 0 || isSubmitting}
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
                  <span>Next: Lunch & Dinner</span>
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