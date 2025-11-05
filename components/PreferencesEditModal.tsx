'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles } from 'lucide-react';

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
  const [customIngredientsInput, setCustomIngredientsInput] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      setPreferences({
        ingredients: [],
        customIngredients: [],
        dishPreferences: { breakfast: [], lunch_dinner: [] }
      });
      setCustomIngredientsInput('');
    }
  }, [isOpen, user]);

  const handleCustomIngredientsChange = (value: string) => {
    setCustomIngredientsInput(value);
  };

  const getAllIngredients = () => {
    // Parse current custom ingredients input
    const currentCustomIngredients = customIngredientsInput
      .split(',')
      .map(ingredient => ingredient.trim())
      .filter(ingredient => ingredient.length > 0);
    
    return currentCustomIngredients;
  };

  const handleConfirm = () => {
    // Get all ingredients from the comma-separated input
    const allIngredients = getAllIngredients();
    onConfirm({
      ...preferences,
      ingredients: allIngredients
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[70vh] flex flex-col">
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
            Tell us what ingredients you have for personalized meal suggestions
          </p>
        </div>

        {/* Tab Navigation - Removed, only showing ingredients now */}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Ingredients Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add ingredients you have at home (comma-separated)
            </label>
            <textarea
              placeholder="Karela, Basmati Rice, Paneer, Chicken, etc..."
              value={customIngredientsInput}
              onChange={(e) => handleCustomIngredientsChange(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-black"
            />
            <p className="text-xs text-gray-500 mt-2">
              Separate multiple ingredients with commas (e.g., "Onion, Tomato, Rice, Paneer")
            </p>
            {customIngredientsInput.trim().length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Your ingredients:</p>
                <div className="flex flex-wrap gap-2">
                  {customIngredientsInput
                    .split(',')
                    .map(ingredient => ingredient.trim())
                    .filter(ingredient => ingredient.length > 0)
                    .map((ingredient, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-md"
                      >
                        {ingredient}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
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
                <span>Generate AI Meal Plan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}