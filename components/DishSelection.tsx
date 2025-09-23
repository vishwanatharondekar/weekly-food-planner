'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, ChefHat, ArrowLeft, ArrowRight, Search } from 'lucide-react';
import { INDIAN_CUISINES, getUniversalCuisines, getDishesForCuisines, type CuisineDishes } from '@/lib/cuisine-data';
import toast from 'react-hot-toast';

interface DishSelectionProps {
  selectedCuisines: string[];
  onComplete: (selectedDishes: { breakfast: string[]; lunch_dinner: string[] }) => void;
  onBack: () => void;
}

export default function DishSelection({ selectedCuisines, onComplete, onBack }: DishSelectionProps) {
  const [selectedDishes, setSelectedDishes] = useState<{ breakfast: string[]; lunch_dinner: string[] }>({
    breakfast: [],
    lunch_dinner: []
  });
  const [activeTab, setActiveTab] = useState<'breakfast' | 'lunch_dinner'>('breakfast');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get all available dishes from selected cuisines + universal
  const availableDishes = React.useMemo(() => {
    const cuisineDishes = getDishesForCuisines(selectedCuisines);
    const universalDishes = getUniversalCuisines();

    // Avoid using spread on Set for compatibility with older JS targets
    const uniqueBreakfast = Array.from(
      new Set([...cuisineDishes.breakfast, ...universalDishes.breakfast])
    );
    const uniqueLunchDinner = Array.from(
      new Set([
        ...cuisineDishes.lunch_dinner,
        ...universalDishes.lunch_dinner
      ])
    );
    return {
      breakfast: uniqueBreakfast,
      lunch_dinner: uniqueLunchDinner
    };
  }, [selectedCuisines]);

  // Filter dishes based on search term
  const filteredDishes = React.useMemo(() => {
    if (!searchTerm) return availableDishes[activeTab];
    return availableDishes[activeTab].filter(dish => 
      dish.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableDishes, activeTab, searchTerm]);

  const handleDishToggle = (dish: string) => {
    setSelectedDishes(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].includes(dish)
        ? prev[activeTab].filter(d => d !== dish)
        : [...prev[activeTab], dish]
    }));
  };

  const handleSelectAll = () => {
    setSelectedDishes(prev => ({
      ...prev,
      [activeTab]: [...availableDishes[activeTab]]
    }));
  };

  const handleClearAll = () => {
    setSelectedDishes(prev => ({
      ...prev,
      [activeTab]: []
    }));
  };

  const handleSubmit = async () => {
    const totalSelected = selectedDishes.breakfast.length + selectedDishes.lunch_dinner.length;
    
    if (totalSelected === 0) {
      toast.error('Please select at least one dish');
      return;
    }

    if (selectedDishes.breakfast.length === 0) {
      toast.error('Please select at least one breakfast option');
      return;
    }

    if (selectedDishes.lunch_dinner.length === 0) {
      toast.error('Please select at least one lunch/dinner option');
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      onComplete(selectedDishes);
      toast.success('Dish preferences saved! Generating your personalized meal plan...');
    } catch (error) {
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTabCount = (tab: 'breakfast' | 'lunch_dinner') => {
    return selectedDishes[tab].length;
  };

  const getTotalCount = () => {
    return selectedDishes.breakfast.length + selectedDishes.lunch_dinner.length;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ChefHat className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">Select Your Favorite Dishes</h2>
                <p className="text-orange-100">Choose dishes from your selected cuisines</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'breakfast', label: 'Breakfast', count: getTabCount('breakfast') },
              { key: 'lunch_dinner', label: 'Lunch & Dinner', count: getTabCount('lunch_dinner') }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>

          {/* Search and Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab} dishes...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
            {filteredDishes.map((dish) => (
              <DishCard
                key={dish}
                dish={dish}
                isSelected={selectedDishes[activeTab].includes(dish)}
                onToggle={() => handleDishToggle(dish)}
              />
            ))}
          </div>

          {/* No results */}
          {filteredDishes.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No dishes found matching your search.</p>
            </div>
          )}

          {/* Selected Count */}
          {getTotalCount() > 0 && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {getTotalCount()} dish{getTotalCount() !== 1 ? 'es' : ''} selected
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>Breakfast: {selectedDishes.breakfast.length} | Lunch/Dinner: {selectedDishes.lunch_dinner.length}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={getTotalCount() === 0 || selectedDishes.breakfast.length === 0 || selectedDishes.lunch_dinner.length === 0 || isSubmitting}
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
      className={`cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 text-center ${
        isSelected
          ? 'border-orange-500 bg-orange-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800 truncate flex-1">{dish}</span>
        {isSelected && (
          <div className="ml-2 bg-orange-500 text-white rounded-full p-1">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}