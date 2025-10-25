'use client';

import React, { useState, useEffect } from 'react';
import { X, FileDown, ShoppingCart } from 'lucide-react';
import { generateShoppingListPDF } from '@/lib/pdf-generator';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: string[];
  weights: { [ingredient: string]: { amount: number, unit: string } };
  categorized: { [category: string]: { name: string, amount: number, unit: string }[] };
  mealPlan: {
    weekStartDate: string;
    meals: { [day: string]: { [mealType: string]: string } };
    userInfo: any;
    mealSettings: any;
    videoURLs: { [day: string]: { [mealType: string]: string } };
    targetLanguage: string;
  };
}

export default function ShoppingListModal({ 
  isOpen, 
  onClose, 
  ingredients, 
  weights,
  categorized,
  mealPlan 
}: ShoppingListModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Initialize with Vegetables category selected by default
      const vegetablesCategory = 'Vegetables';
      const vegetablesIndices = new Set<number>();
      const initialSelectedCategories = new Set<string>();
      
      if (categorized[vegetablesCategory]) {
        // Find indices of vegetables in the main ingredients array
        categorized[vegetablesCategory].forEach(item => {
          const index = ingredients.indexOf(item.name);
          if (index !== -1) {
            vegetablesIndices.add(index);
          }
        });
        initialSelectedCategories.add(vegetablesCategory);
      }
      
      setSelectedIngredients(vegetablesIndices);
      setSelectedCategories(initialSelectedCategories);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, ingredients, categorized]);

  const handleIngredientToggle = (index: number) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
    
    // Update category selection state based on ingredient selection
    const ingredient = ingredients[index];
    Object.entries(categorized).forEach(([category, items]) => {
      const isIngredientInCategory = items.some(item => item.name === ingredient);
      if (isIngredientInCategory) {
        const categoryIndices = items.map(item => ingredients.indexOf(item.name)).filter(i => i !== -1);
        const allCategoryIngredientsSelected = categoryIndices.every(i => selectedIngredients.has(i));
        
        setSelectedCategories(prev => {
          const newSet = new Set(prev);
          if (allCategoryIngredientsSelected) {
            newSet.add(category);
          } else {
            newSet.delete(category);
          }
          return newSet;
        });
      }
    });
  };


  const handleCategorySelectAll = (category: string) => {
    if (!categorized[category]) return;
    
    const categoryIndices = new Set<number>();
    categorized[category].forEach(item => {
      const index = ingredients.indexOf(item.name);
      if (index !== -1) {
        categoryIndices.add(index);
      }
    });
    
    // Check if all ingredients in this category are already selected
    const allSelected = Array.from(categoryIndices).every(index => selectedIngredients.has(index));
    
    if (allSelected) {
      // Deselect all ingredients in this category
      setSelectedIngredients(prev => {
        const newSet = new Set(prev);
        categoryIndices.forEach(index => newSet.delete(index));
        return newSet;
      });
      
      setSelectedCategories(prev => {
        const newSet = new Set(prev);
        newSet.delete(category);
        return newSet;
      });
    } else {
      // Select all ingredients in this category
      setSelectedIngredients(prev => {
        const newSet = new Set(prev);
        categoryIndices.forEach(index => newSet.add(index));
        return newSet;
      });
      
      setSelectedCategories(prev => {
        const newSet = new Set(prev);
        newSet.add(category);
        return newSet;
      });
    }
  };


  const getSelectedIngredients = () => {
    return ingredients.filter((_, index) => selectedIngredients.has(index));
  };

  const handleDownloadPDF = async () => {
    try {
      setIsSubmitting(true);
      const selectedIngredientsList = getSelectedIngredients();
      
      if (selectedIngredientsList.length === 0) {
        toast.error('Please select at least one ingredient');
        return;
      }

      // Create a modified meal plan with only selected ingredients
      const modifiedMealPlan = {
        ...mealPlan,
        selectedIngredients: selectedIngredientsList
      };

      await generateShoppingListPDF(modifiedMealPlan);
      toast.success('Shopping list downloaded successfully!');
      onClose();
    } catch (error) {
      console.error('Error generating shopping list PDF:', error);
      toast.error('Failed to generate shopping list PDF');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShopOnAmazon = () => {
    try {
      const selectedIngredientsList = getSelectedIngredients();
      
      if (selectedIngredientsList.length === 0) {
        toast.error('Please select at least one ingredient');
        return;
      }

      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Create a hidden form for Amazon submission
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = 'https://www.amazon.in/afx/ingredients/landing?tag=khanakyabanau-21&associateTag=khanakyabanau-21';
      form.target = isMobile ? '_self' : '_blank';
      form.style.display = 'none';

      // Add required fields
      const brandIdField = document.createElement('input');
      brandIdField.type = 'hidden';
      brandIdField.name = 'almBrandId';
      brandIdField.value = 'ctnow';
      form.appendChild(brandIdField);

      const associateTagField = document.createElement('input');
      associateTagField.type = 'hidden';
      associateTagField.name = 'tag';
      associateTagField.value = 'khanakyabanau-21';
      form.appendChild(associateTagField);

      // Generate ingredients JSON in the format expected by Amazon using only selected ingredients
      const ingredientsData = {
        ingredients: selectedIngredientsList.map((ingredient, index) => {
          const weight = weights[ingredient];
          let unit = 'COUNT';
          let amount = 1;
          const unitReceived = weight?.unit?.toLowerCase() || 'count';
          
            if (weight) {
              // Map common units to Amazon's expected units
              switch (unitReceived) {
                case 'g':
                case 'gram':
                case 'grams':
                  // Convert grams to kilograms if 1000g or more
                  if (weight.amount >= 1000) {
                    unit = 'KILOGRAMS';
                    amount = Math.round((weight.amount / 1000) * 100) / 100; // Round to 2 decimal places
                  } else {
                    unit = 'GRAMS';
                    amount = weight.amount;
                  }
                  break;
              case 'kg':
              case 'kilogram':
              case 'kilograms':
                unit = 'KG';
                amount = weight.amount;
                break;
              case 'ml':
              case 'milliliter':
              case 'milliliters':
                unit = 'ML';
                amount = weight.amount;
                break;
              case 'l':
              case 'liter':
              case 'liters':
                unit = 'L';
                amount = weight.amount;
                break;
              case 'cup':
              case 'cups':
                unit = 'CUP';
                amount = weight.amount;
                break;
              case 'tbsp':
              case 'tablespoon':
              case 'tablespoons':
                unit = 'TBSP';
                amount = weight.amount;
                break;
              case 'tsp':
              case 'teaspoon':
              case 'teaspoons':
                unit = 'TSP';
                amount = weight.amount;
                break;
              case 'piece':
              case 'pieces':
              case 'pcs':
                unit = 'COUNT';
                amount = weight.amount; 
                break;
              default:
                unit = 'COUNT';
                amount = 1; // Hardcode to 1 for pieces
                break;
            }
          }
          
          return {
            name: ingredient.trim(),
            componentIndex: index,
            quantityList: [{
              unit: unit,
              amount: amount
            }],
            exclusiveOverride: false
          };
        }),
        exclusiveOverride: false,
        saved: false,
        recipeComposition: {
          saved: false
        }
      };


      const ingredientsField = document.createElement('input');
      ingredientsField.type = 'hidden';
      ingredientsField.name = 'ingredients';
      ingredientsField.value = JSON.stringify(ingredientsData);
      form.appendChild(ingredientsField);

      // Submit the form
      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      toast.success('Opening Amazon shopping list...');
    } catch (error) {
      console.error('Error submitting to Amazon:', error);
      toast.error('Failed to open Amazon shopping list');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-2 sm:mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Shopping List</h2>
            <button
              onClick={handleDownloadPDF}
              disabled={isSubmitting || selectedIngredients.size === 0}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isSubmitting ? 'Generating...' : 'Download as PDF'}
            >
              <FileDown className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600 hidden sm:inline">
                {isSubmitting ? 'Generating...' : 'Download PDF'}
              </span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto min-h-0">
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Ingredients for {formatDate(new Date(mealPlan.weekStartDate))} week:
              </h3>
            </div>
            
            {ingredients.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(categorized).length > 0 ? (
                  // Render categorized ingredients
                  Object.entries(categorized).map(([category, items]) => {
                    // Define category colors
                    const getCategoryStyles = (category: string) => {
                      switch (category) {
                        case 'Vegetables':
                          return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' };
                        case 'Fruits':
                          return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' };
                        case 'Dairy & Eggs':
                          return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' };
                        case 'Meat & Seafood':
                          return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' };
                        case 'Grains & Pulses':
                          return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' };
                        case 'Spices & Herbs':
                          return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' };
                        case 'Pantry Items':
                          return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' };
                        default:
                          return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' };
                      }
                    };

                    const categoryStyles = getCategoryStyles(category);
                    
                    return (
                      <div key={category} className="space-y-2">
                        <div className={`${categoryStyles.bg} ${categoryStyles.border} border rounded-lg p-3`}>
                          <div className="flex items-center justify-between">
                            <h4 className={`text-base font-bold ${categoryStyles.text} flex items-center`}>
                              <span className="w-2 h-2 rounded-full bg-current mr-2"></span>
                              {category}
                              <span className="ml-2 text-xs font-normal opacity-75">
                                ({items.length} item{items.length !== 1 ? 's' : ''})
                              </span>
                            </h4>
                            <div className="flex items-center">
                              <button
                                onClick={() => handleCategorySelectAll(category)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${
                                  selectedCategories.has(category)
                                    ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                                    : 'text-blue-600 hover:bg-blue-50'
                                }`}
                              >
                                {selectedCategories.has(category) ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                        {items.map((item, itemIndex) => {
                          const ingredientIndex = ingredients.indexOf(item.name);
                          return (
                            <div
                              key={`${category}-${itemIndex}`}
                              className={`flex items-center p-2 sm:p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                                selectedIngredients.has(ingredientIndex)
                                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => handleIngredientToggle(ingredientIndex)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIngredients.has(ingredientIndex)}
                                onChange={() => handleIngredientToggle(ingredientIndex)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3 flex-shrink-0"
                              />
                              <div className="flex-1">
                                <span className={`font-medium text-sm sm:text-base ${
                                  selectedIngredients.has(ingredientIndex) ? 'text-blue-900' : 'text-gray-800'
                                }`}>
                                  {item.name.split(' ').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                  ).join(' ')}
                                  <span className={`text-xs font-normal ml-1 ${
                                    selectedIngredients.has(ingredientIndex) ? 'text-blue-600' : 'text-gray-500'
                                  }`}>
                                    {(() => {
                                      // Convert grams to kilograms for display if 1000g or more
                                      if (item.unit.toLowerCase() === 'g' && item.amount >= 1000) {
                                        const kgAmount = Math.round((item.amount / 1000) * 100) / 100;
                                        return `(${kgAmount} kg)`;
                                      }
                                      return `(${item.amount} ${item.unit})`;
                                    })()}
                                  </span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Fallback to simple list if no categorized data
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                    {ingredients.map((ingredient, index) => (
                      <div
                        key={index}
                        className={`flex items-center p-2 sm:p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                          selectedIngredients.has(index)
                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => handleIngredientToggle(index)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIngredients.has(index)}
                          onChange={() => handleIngredientToggle(index)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3 flex-shrink-0"
                        />
                        <div className="flex-1">
                          <span className={`font-medium text-sm sm:text-base ${
                            selectedIngredients.has(index) ? 'text-blue-900' : 'text-gray-800'
                          }`}>
                            {ingredient.split(' ').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            ).join(' ')}
                            {weights[ingredient] && (
                              <span className={`text-xs font-normal ml-1 ${
                                selectedIngredients.has(index) ? 'text-blue-600' : 'text-gray-500'
                              }`}>
                                {(() => {
                                  // Convert grams to kilograms for display if 1000g or more
                                  if (weights[ingredient].unit.toLowerCase() === 'g' && weights[ingredient].amount >= 1000) {
                                    const kgAmount = Math.round((weights[ingredient].amount / 1000) * 100) / 100;
                                    return `(${kgAmount} kg)`;
                                  }
                                  return `(${weights[ingredient].amount} ${weights[ingredient].unit})`;
                                })()}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No ingredients found for this week's meals.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-t border-gray-200 bg-gray-50 gap-3 sm:gap-0 flex-shrink-0 rounded-b-2xl">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            {selectedIngredients.size} of {ingredients.length} ingredient{ingredients.length !== 1 ? 's' : ''} selected
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="hidden sm:block px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors order-2 sm:order-1"
            >
              Cancel
            </button>
            
            <button
              onClick={handleShopOnAmazon}
              disabled={selectedIngredients.size === 0}
              className="flex items-center justify-center px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="text-sm sm:text-base">Shop on Amazon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
