'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Check, Search } from 'lucide-react';
import { INDIAN_CUISINES, UNIVERSAL_CUISINES, getDishesForCuisines } from '@/lib/cuisine-data';
import toast from 'react-hot-toast';

interface UserPreferences {
  dishPreferences: {
    breakfast: string[];
    lunch_dinner: string[];
  };
}

interface PreferencesEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (preferences: UserPreferences) => void;
  user: any;
  isLoading?: boolean;
}


export default function PreferencesEditModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false
}: PreferencesEditModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    dishPreferences: {
      breakfast: [],
      lunch_dinner: []
    }
  });
  const [activeTab, setActiveTab] = useState<'breakfast' | 'lunch_dinner'>('breakfast');
  const [searchTerm, setSearchTerm] = useState('');

  // Get all available dishes from user's cuisines + universal
  const availableDishes = React.useMemo(() => {
    const userCuisines = user?.cuisinePreferences || [];
    const cuisineDishes = getDishesForCuisines(userCuisines);
    const universalDishes = UNIVERSAL_CUISINES.dishes;

    // Get breakfast dishes
    const breakfastDishes = Array.from(
      new Set([
        ...cuisineDishes.breakfast,
        ...universalDishes.breakfast
      ])
    );

    // Get lunch/dinner dishes
    const lunchDinnerDishes = Array.from(
      new Set([
        ...cuisineDishes.lunch_dinner,
        ...universalDishes.lunch_dinner_veg,
        ...universalDishes.lunch_dinner_non_veg
      ])
    );

    return {
      breakfast: breakfastDishes,
      lunch_dinner: lunchDinnerDishes
    };
  }, [user?.cuisinePreferences]);

  // Get initial dish order with previously selected items first
  const initialDishOrder = React.useMemo(() => {
    const dishes = availableDishes[activeTab];
    const initialSelected = user?.dishPreferences?.[activeTab] || [];
    
    // Sort so that initially selected dishes appear first
    return dishes.sort((a, b) => {
      const aInitiallySelected = initialSelected.includes(a);
      const bInitiallySelected = initialSelected.includes(b);
      
      if (aInitiallySelected && !bInitiallySelected) return -1;
      if (!aInitiallySelected && bInitiallySelected) return 1;
      return 0; // Keep original order for items with same initial selection status
    });
  }, [availableDishes, activeTab, user?.dishPreferences]);

  // Filter dishes based on search term (no real-time sorting)
  const filteredDishes = React.useMemo(() => {
    if (!searchTerm) return initialDishOrder;
    return initialDishOrder.filter(dish => 
      dish.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [initialDishOrder, searchTerm]);

  useEffect(() => {
    if (isOpen && user) {
      setPreferences({
        dishPreferences: user.dishPreferences || { breakfast: [], lunch_dinner: [] }
      });
    }
  }, [isOpen, user]);

  const handleDishToggle = (dish: string) => {
    setPreferences(prev => ({
      ...prev,
      dishPreferences: {
        ...prev.dishPreferences,
        [activeTab]: prev.dishPreferences[activeTab].includes(dish)
          ? prev.dishPreferences[activeTab].filter(d => d !== dish)
          : [...prev.dishPreferences[activeTab], dish]
      }
    }));
  };

  const handleSelectAll = () => {
    setPreferences(prev => ({
      ...prev,
      dishPreferences: {
        ...prev.dishPreferences,
        [activeTab]: [...availableDishes[activeTab]]
      }
    }));
  };

  const handleClearAll = () => {
    setPreferences(prev => ({
      ...prev,
      dishPreferences: {
        ...prev.dishPreferences,
        [activeTab]: []
      }
    }));
  };

  const handleConfirm = () => {
    if (preferences.dishPreferences.breakfast.length === 0) {
      toast.error('Please select at least one breakfast option');
      return;
    }
    if (preferences.dishPreferences.lunch_dinner.length === 0) {
      toast.error('Please select at least one lunch/dinner option');
      return;
    }
    onConfirm(preferences);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-xl font-bold">Edit Your Preferences</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-purple-100 mt-2">
            Review and update your preferences before generating AI meal suggestions
          </p>
        </div>


        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'breakfast', label: 'Breakfast', count: preferences.dishPreferences.breakfast.length },
              { id: 'lunch_dinner', label: 'Lunch & Dinner', count: preferences.dishPreferences.lunch_dinner.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'breakfast' ? 'breakfast' : 'lunch & dinner'} options...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab === 'breakfast' ? 'Breakfast' : 'Lunch & Dinner'} Options
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {filteredDishes.map((dish) => (
              <DishCard
                key={dish}
                dish={dish}
                isSelected={preferences.dishPreferences[activeTab].includes(dish)}
                onToggle={() => handleDishToggle(dish)}
              />
            ))}
          </div>

          {filteredDishes.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              No dishes found matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Update & Generate AI</span>
              </>
            )}
          </button>
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
          ? 'border-purple-500 bg-purple-50 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <span className="text-sm font-medium text-gray-800 whitespace-nowrap">{dish}</span>
      {isSelected && (
        <div className="bg-purple-500 text-white rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}