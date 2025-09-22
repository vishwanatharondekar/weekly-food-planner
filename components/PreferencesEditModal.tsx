'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, Check, Search } from 'lucide-react';
import { INDIAN_CUISINES, UNIVERSAL_CUISINES, getDishesForCuisines } from '@/lib/cuisine-data';
import toast from 'react-hot-toast';

interface UserPreferences {
  ingredients: string[];
  customIngredients: string[];
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

const INGREDIENT_GROUPS = {
  vegetables: {
    color: 'green',
    items: [
      'Onion', 'Tomato', 'Potato', 'Carrot', 'Capsicum', 'Cabbage', 'Cauliflower', 'Broccoli', 'Spinach', 'Lettuce',
      'Cucumber', 'Radish', 'Beetroot', 'Brinjal', 'Okra', 'Green Beans', 'Peas', 'Corn', 'Mushroom'
    ]
  },
  grains: {
    color: 'yellow',
    items: [
      'Rice', 'Wheat Flour', 'Basmati Rice', 'Quinoa', 'Oats', 'Barley', 'Dal (Lentils)', 'Chana Dal',
      'Moong Dal', 'Toor Dal', 'Rajma', 'Chickpeas', 'Black Gram', 'Green Gram', 'Red Lentils'
    ]
  },
  dairy: {
    color: 'blue',
    items: [
      'Milk', 'Yogurt', 'Paneer', 'Cheese', 'Butter', 'Ghee', 'Cream',  'Coconut Milk'
    ]
  },
  meat: {
    color: 'red',
    items: [
      'Chicken', 'Mutton', 'Fish', 'Prawns', 'Eggs'
    ]
  }
};

// Flatten all ingredients for easy access
const COMMON_INGREDIENTS = Object.values(INGREDIENT_GROUPS).flatMap(group => group.items);

// Function to get the color for an ingredient
const getIngredientColor = (ingredient: string): string => {
  for (const [groupName, group] of Object.entries(INGREDIENT_GROUPS)) {
    if (group.items.includes(ingredient)) {
      return group.color;
    }
  }
  return 'gray'; // Default color for custom ingredients
};

export default function PreferencesEditModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  isLoading = false
}: PreferencesEditModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    ingredients: [],
    customIngredients: [],
    dishPreferences: {
      breakfast: [],
      lunch_dinner: []
    }
  });
  const [activeTab, setActiveTab] = useState<'ingredients' | 'breakfast' | 'lunch_dinner'>('ingredients');
  const [searchTerm, setSearchTerm] = useState('');
  const [customIngredientsInput, setCustomIngredientsInput] = useState('');

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
    // Handle ingredients tab separately
    if (activeTab === 'ingredients') {
      return COMMON_INGREDIENTS;
    }
    
    const dishes = availableDishes[activeTab];
    if (!dishes || !Array.isArray(dishes)) {
      return [];
    }
    
    const initialSelected = user?.dishPreferences?.[activeTab] || [];
    
    // Create a new array and sort so that initially selected dishes appear first
    return [...dishes].sort((a, b) => {
      const aInitiallySelected = initialSelected.includes(a);
      const bInitiallySelected = initialSelected.includes(b);
      
      if (aInitiallySelected && !bInitiallySelected) return -1;
      if (!aInitiallySelected && bInitiallySelected) return 1;
      return 0; // Keep original order for items with same initial selection status
    });
  }, [availableDishes, activeTab, user?.dishPreferences]);

  // Filter ingredients based on search term
  const filteredIngredients = React.useMemo(() => {
    if (!searchTerm) return COMMON_INGREDIENTS;
    return COMMON_INGREDIENTS.filter(ingredient => 
      ingredient.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Filter dishes based on search term (no real-time sorting)
  const filteredDishes = React.useMemo(() => {
    if (!searchTerm) return initialDishOrder;
    return initialDishOrder.filter(dish => 
      dish.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [initialDishOrder, searchTerm]);

  // Get the appropriate data source based on active tab
  const currentData = React.useMemo(() => {
    if (activeTab === 'ingredients') {
      return filteredIngredients;
    }
    return filteredDishes;
  }, [activeTab, filteredIngredients, filteredDishes]);

  useEffect(() => {
    if (isOpen && user) {
      setPreferences({
        ingredients: user.ingredients || [],
        customIngredients: user.customIngredients || [],
        dishPreferences: user.dishPreferences || { breakfast: [], lunch_dinner: [] }
      });
    }
  }, [isOpen, user]);

  const handleIngredientToggle = (ingredient: string) => {
    setPreferences(prev => ({
      ...prev,
      ingredients: prev.ingredients.includes(ingredient)
        ? prev.ingredients.filter(i => i !== ingredient)
        : [...prev.ingredients, ingredient]
    }));
  };

  const handleCustomIngredientsChange = (value: string) => {
    setCustomIngredientsInput(value);
    // Parse comma-separated ingredients
    const customIngredients = value
      .split(',')
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0);
    
    setPreferences(prev => ({
      ...prev,
      customIngredients
    }));
  };

  const getAllIngredients = () => {
    return [...preferences.ingredients, ...preferences.customIngredients];
  };

  const handleDishToggle = (dish: string) => {
    if (activeTab === 'breakfast' || activeTab === 'lunch_dinner') {
      setPreferences(prev => ({
        ...prev,
        dishPreferences: {
          ...prev.dishPreferences,
          [activeTab]: prev.dishPreferences[activeTab].includes(dish)
            ? prev.dishPreferences[activeTab].filter(d => d !== dish)
            : [...prev.dishPreferences[activeTab], dish]
        }
      }));
    }
  };

  const handleClearAll = () => {
    if (activeTab === 'ingredients') {
      setPreferences(prev => ({
        ...prev,
        ingredients: []
      }));
    } else if (activeTab === 'breakfast' || activeTab === 'lunch_dinner') {
      setPreferences(prev => ({
        ...prev,
        dishPreferences: {
          ...prev.dishPreferences,
          [activeTab]: []
        }
      }));
    }
  };

  const handleSelectAll = () => {
    if (activeTab === 'ingredients') {
      setPreferences(prev => ({
        ...prev,
        ingredients: [...COMMON_INGREDIENTS]
      }));
    } else if (activeTab === 'breakfast' || activeTab === 'lunch_dinner') {
      setPreferences(prev => ({
        ...prev,
        dishPreferences: {
          ...prev.dishPreferences,
          [activeTab]: [...availableDishes[activeTab]]
        }
      }));
    }
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
    
    // Combine selected ingredients with custom ingredients
    const allIngredients = getAllIngredients();
    onConfirm({
      ...preferences,
      ingredients: allIngredients
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="rounded-t-2xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6" />
              <h2 className="text-xl font-bold">Customize Your AI Meal Plan</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-purple-100 mt-2">
            Tell us what you have and what you like to eat for personalized meal suggestions
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'ingredients', label: 'Ingredients', count: preferences.ingredients.length },
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

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Custom Ingredients Input - Only for ingredients tab, moved to top */}
          {activeTab === 'ingredients' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add ingredients you have at home (comma-separated)
              </label>
              <textarea
                placeholder="Karela, Basmati Rice, Paneer, etc..."
                value={customIngredientsInput}
                onChange={(e) => handleCustomIngredientsChange(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-black"
              />
              {preferences.customIngredients.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-2">Your custom ingredients:</p>
                  <div className="flex flex-wrap gap-2">
                    {preferences.customIngredients.map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-md"
                      >
                        {ingredient}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Bar - Only for dishes, not ingredients */}
          {activeTab !== 'ingredients' && (
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
          )}

          {/* OR text for ingredients */}
          {activeTab === 'ingredients' && (
            <div className="text-center mb-4">
              <div className="text-lg font-bold text-gray-600">OR</div>
              <div className="text-sm text-gray-500 font-medium">select from the list below</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-4">
            {activeTab !== 'ingredients' ? (
              <h3 className="text-lg font-semibold text-gray-900">
                {activeTab === 'breakfast' ? 'Breakfast' : 'Lunch & Dinner'}
              </h3>
            ) : (
              <div></div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={handleClearAll}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {currentData.map((item) => (
              <DishCard
                key={item}
                dish={item}
                isSelected={
                  activeTab === 'ingredients' 
                    ? preferences.ingredients.includes(item)
                    : preferences.dishPreferences[activeTab].includes(item)
                }
                onToggle={() => 
                  activeTab === 'ingredients' 
                    ? handleIngredientToggle(item)
                    : handleDishToggle(item)
                }
                color={activeTab === 'ingredients' ? getIngredientColor(item) : 'purple'}
              />
            ))}
          </div>

          {currentData.length === 0 && searchTerm && (
            <div className="text-center py-8 text-gray-500">
              No {activeTab === 'ingredients' ? 'ingredients' : 'dishes'} found matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="rounded-b-2xl bg-gray-50 px-6 py-4 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200">
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
  color?: string;
}

function DishCard({ dish, isSelected, onToggle, color = 'purple' }: DishCardProps) {
  const getColorClasses = (color: string, isSelected: boolean) => {
    const colorMap = {
      green: isSelected 
        ? 'border-green-500 bg-green-50 text-green-800' 
        : 'border-green-200 hover:border-green-300 text-green-700',
      yellow: isSelected 
        ? 'border-yellow-500 bg-yellow-50 text-yellow-800' 
        : 'border-yellow-200 hover:border-yellow-300 text-yellow-700',
      blue: isSelected 
        ? 'border-blue-500 bg-blue-50 text-blue-800' 
        : 'border-blue-200 hover:border-blue-300 text-blue-700',
      red: isSelected 
        ? 'border-red-500 bg-red-50 text-red-800' 
        : 'border-red-200 hover:border-red-300 text-red-700',
      gray: isSelected 
        ? 'border-gray-500 bg-gray-50 text-gray-800' 
        : 'border-gray-200 hover:border-gray-300 text-gray-700',
      purple: isSelected 
        ? 'border-purple-500 bg-purple-50 text-purple-800' 
        : 'border-purple-200 hover:border-purple-300 text-purple-700'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.purple;
  };

  const getCheckIconColor = (color: string) => {
    const colorMap = {
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      blue: 'bg-blue-500',
      red: 'bg-red-500',
      gray: 'bg-gray-500',
      purple: 'bg-purple-500'
    };
    return colorMap[color as keyof typeof colorMap] || 'bg-purple-500';
  };

  return (
    <div
      onClick={onToggle}
      className={`cursor-pointer px-4 py-2 rounded-lg border-2 transition-all duration-200 text-center inline-flex items-center gap-2 ${getColorClasses(color, isSelected)}`}
    >
      <span className="text-sm font-medium whitespace-nowrap">{dish}</span>
      {isSelected && (
        <div className={`${getCheckIconColor(color)} text-white rounded-full p-1`}>
          <Check className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}