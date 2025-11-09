'use client';

import React, { useState, useEffect } from 'react';
import { X, FileDown, ShoppingCart, ChevronDown, ChevronRight } from 'lucide-react';
import { generateShoppingListPDF } from '@/lib/pdf-generator';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { analytics } from '@/lib/analytics';

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
    imageURLs?: { [day: string]: { [mealType: string]: string } };
    targetLanguage: string;
  };
  dayWise?: { [day: string]: { [mealType: string]: { name: string, ingredients: { name: string, amount: number, unit: string }[] } } };
}

export default function ShoppingListModal({ 
  isOpen, 
  onClose, 
  ingredients, 
  weights,
  categorized,
  mealPlan,
  dayWise
}: ShoppingListModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'category' | 'day'>('category');
  const [selectedDayIngredients, setSelectedDayIngredients] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      // Log the dayWise structure for debugging
      if (dayWise) {
        Object.entries(dayWise).forEach(([day, dayMeals]) => {
          Object.entries(dayMeals).forEach(([mealType, mealData]) => {
            if (!mealData || !Array.isArray(mealData.ingredients)) {
              console.warn(`  WARNING: Invalid ingredients structure for ${day}/${mealType}`);
            }
          });
        });
      }
      
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
  }, [isOpen, ingredients, categorized, dayWise]);

  const handleIngredientToggle = (index: number) => {
    setSelectedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      
      // Update category selection state based on ingredient selection using the NEW state
      const ingredient = ingredients[index];
      Object.entries(categorized).forEach(([category, items]) => {
        const isIngredientInCategory = items.some(item => item.name === ingredient);
        if (isIngredientInCategory) {
          const categoryIndices = items.map(item => ingredients.indexOf(item.name)).filter(i => i !== -1);
          const allCategoryIngredientsSelected = categoryIndices.every(i => newSet.has(i));
          
          setSelectedCategories(prevCategories => {
            const newCategorySet = new Set(prevCategories);
            if (allCategoryIngredientsSelected) {
              newCategorySet.add(category);
            } else {
              newCategorySet.delete(category);
            }
            return newCategorySet;
          });
        }
      });
      
      return newSet;
    });
  };

  const handleDayIngredientToggle = (ingredientKey: string) => {
    setSelectedDayIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientKey)) {
        newSet.delete(ingredientKey);
      } else {
        newSet.add(ingredientKey);
      }
      return newSet;
    });
  };

  const getSelectedIngredientsFromDayWise = () => {
    if (activeTab === 'category') {
      return ingredients.filter((_, index) => selectedIngredients.has(index));
    } else if (activeTab === 'day' && dayWise) {
      const selected: string[] = [];
      Array.from(selectedDayIngredients).forEach(key => {
        const parts = key.split('||');
        if (parts.length === 3) {
          const day = parts[0];
          const mealType = parts[1];
          const ingredientName = parts[2];
          selected.push(ingredientName);
        }
      });
      return Array.from(new Set(selected));
    }
    return [];
  };

  const getDayWiseWeightsForIngredient = (ingredientName: string): { amount: number, unit: string } | undefined => {
    if (!dayWise) return undefined;

    // Sum up weights for the same ingredient across all selected meals
    let totalInGrams = 0;
    let hasAnyData = false;
    let detectedUnit = 'g'; // Default to grams
    let isWeightUnit = true; // Track if we're dealing with weight units

    Array.from(selectedDayIngredients).forEach(key => {
      const parts = key.split('||');
      if (parts.length === 3) {
        const day = parts[0];
        const mealType = parts[1];
        const ingredient = parts[2];
        
        if (ingredient === ingredientName && dayWise[day]?.[mealType]?.ingredients) {
          const ingredientData = dayWise[day][mealType].ingredients.find(
            ing => ing.name === ingredient
          );
          
          if (ingredientData) {
            hasAnyData = true;
            const unit = ingredientData.unit.toLowerCase();
            
            // Convert to grams for weight units, sum directly for volume/count units
            if (unit === 'g' || unit === 'gram' || unit === 'grams') {
              totalInGrams += ingredientData.amount;
              detectedUnit = 'g';
            } else if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') {
              totalInGrams += ingredientData.amount * 1000;
              detectedUnit = 'kg';
            } else {
              // For non-weight units (ml, l, cups, pieces, etc.), sum as is
              if (isWeightUnit) {
                // First time encountering non-weight unit, switch mode
                isWeightUnit = false;
                totalInGrams = ingredientData.amount;
              } else {
                totalInGrams += ingredientData.amount;
              }
              detectedUnit = unit;
            }
          }
        }
      }
    });

    if (!hasAnyData) return undefined;

    // If we have weight units, convert to appropriate display unit
    if (isWeightUnit && (detectedUnit === 'g' || detectedUnit === 'kg')) {
      if (totalInGrams >= 1000) {
        const finalAmount = Math.round((totalInGrams / 1000) * 100) / 100;
        return { amount: finalAmount, unit: 'kg' };
      }
      return { amount: totalInGrams, unit: 'g' };
    }

    // For non-weight units, return as is
    return { amount: totalInGrams, unit: detectedUnit };
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

  const handleDaySelectAll = (day: string) => {
    if (!dayWise || !dayWise[day]) return;

    const dayIngredients = new Set<string>();
    Object.entries(dayWise[day]).forEach(([mealType, mealData]) => {
      if (mealData?.ingredients && Array.isArray(mealData.ingredients)) {
        mealData.ingredients.forEach((ingredient: any) => {
          if (ingredient?.name) {
            dayIngredients.add(`${day}||${mealType}||${ingredient.name}`);
          }
        });
      }
    });

    // Check if all ingredients for this day are already selected
    const allSelected = Array.from(dayIngredients).every(key => selectedDayIngredients.has(key));

    if (allSelected) {
      // Deselect all ingredients for this day
      setSelectedDayIngredients(prev => {
        const newSet = new Set(prev);
        dayIngredients.forEach(key => newSet.delete(key));
        return newSet;
      });
    } else {
      // Select all ingredients for this day
      setSelectedDayIngredients(prev => {
        const newSet = new Set(prev);
        dayIngredients.forEach(key => newSet.add(key));
        return newSet;
      });
    }
  };

  const handleMealSelectAll = (day: string, mealType: string) => {
    if (!dayWise || !dayWise[day]?.[mealType]) return;

    const mealIngredients = new Set<string>();
    const mealData = dayWise[day][mealType];
    
    if (mealData?.ingredients && Array.isArray(mealData.ingredients)) {
      mealData.ingredients.forEach((ingredient: any) => {
        if (ingredient?.name) {
          mealIngredients.add(`${day}||${mealType}||${ingredient.name}`);
        }
      });
    }

    // Check if all ingredients for this meal are already selected
    const allSelected = Array.from(mealIngredients).every(key => selectedDayIngredients.has(key));

    if (allSelected) {
      // Deselect all ingredients for this meal
      setSelectedDayIngredients(prev => {
        const newSet = new Set(prev);
        mealIngredients.forEach(key => newSet.delete(key));
        return newSet;
      });
    } else {
      // Select all ingredients for this meal
      setSelectedDayIngredients(prev => {
        const newSet = new Set(prev);
        mealIngredients.forEach(key => newSet.add(key));
        return newSet;
      });
    }
  };

  const handleDayToggle = (day: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };


  const getSelectedIngredients = () => {
    if (activeTab === 'day' && dayWise) {
      return getSelectedIngredientsFromDayWise();
    }
    return ingredients.filter((_, index) => selectedIngredients.has(index));
  };

  const handleDownloadPDF = async () => {
    try {
      setIsSubmitting(true);
      const selectedIngredientsList = getSelectedIngredients();

      // Convert dayWise to grouped format for PDF
      const grouped: any[] = [];
      if (dayWise) {
        Object.entries(dayWise).forEach(([day, dayMeals]) => {
          Object.entries(dayMeals).forEach(([mealType, mealData]) => {
            if (mealData?.name && mealData?.ingredients && Array.isArray(mealData.ingredients)) {
              let mealIngredients = mealData.ingredients.map((ing: any) => ing.name);
              
              // Filter ingredients based on selection if needed
              if (selectedIngredientsList.length > 0) {
                mealIngredients = mealIngredients.filter(ing => selectedIngredientsList.includes(ing));
              }
              
              // Only add meal if it has ingredients
              if (mealIngredients.length > 0) {
                grouped.push({ [mealData.name]: mealIngredients });
              }
            }
          });
        });
      }

      // Filter ingredients based on selection if needed
      let filteredIngredients = selectedIngredientsList.length > 0 ? selectedIngredientsList : ingredients;
      let filteredWeights: { [ingredient: string]: { amount: number, unit: string } } = {};
      let filteredCategorized: { [category: string]: { name: string, amount: number, unit: string }[] } = {};
      
      if (selectedIngredientsList.length > 0) {
        // Filter weights and categorized based on selected ingredients
        selectedIngredientsList.forEach(ingredient => {
          if (weights[ingredient]) {
            filteredWeights[ingredient] = weights[ingredient];
          }
        });
        
        Object.entries(categorized).forEach(([category, items]) => {
          const filteredItems = items.filter(item => selectedIngredientsList.includes(item.name));
          if (filteredItems.length > 0) {
            filteredCategorized[category] = filteredItems;
          }
        });
      } else {
        // Use all ingredients if nothing is selected
        filteredIngredients = ingredients;
        filteredWeights = weights;
        filteredCategorized = categorized;
      }

      // Create a modified meal plan with extracted ingredients data
      const modifiedMealPlan = {
        ...mealPlan,
        selectedIngredients: filteredIngredients,
        extractedIngredients: {
          consolidated: filteredIngredients,
          weights: filteredWeights,
          categorized: filteredCategorized,
          grouped: grouped
        }
      };

      await generateShoppingListPDF(modifiedMealPlan);
      toast.success('Shopping list downloaded successfully!');
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
      
      // Get Amazon region from meal settings, default to 'india'
      const amazonRegion = mealPlan.mealSettings?.amazonRegion || 'india';
      
      // Create a hidden form for Amazon submission
      const form = document.createElement('form');
      form.method = 'POST';

      
      // Set the appropriate Amazon URL based on region
      const associateTag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || 'khanakyabanau-21';
      if (amazonRegion === 'us') {
        form.action = `https://www.amazon.com/afx/ingredients/landing?tag=${associateTag}&associateTag=${associateTag}`;
      } else {
        form.action = `https://www.amazon.in/afx/ingredients/landing?tag=${associateTag}&associateTag=${associateTag}`;
      }
      
      form.target = isMobile ? '_self' : '_blank';
      form.style.display = 'none';

      // Add required fields
      const brandIdField = document.createElement('input');
      brandIdField.type = 'hidden';
      brandIdField.name = 'almBrandId';
      brandIdField.value = amazonRegion === 'us' ? 'QW1hem9uIEZyZXNo' : 'ctnow';
      form.appendChild(brandIdField);

      const associateTagField = document.createElement('input');
      associateTagField.type = 'hidden';
      associateTagField.name = 'associateTag';
      associateTagField.value = associateTag;
      form.appendChild(associateTagField);

      // Generate ingredients JSON in the format expected by Amazon using only selected ingredients
      const ingredientsData = {
        ingredients: selectedIngredientsList.map((ingredient, index) => {
          // Get weight from day-wise data if on day tab, otherwise from consolidated weights
          const weight = activeTab === 'day' && dayWise 
            ? getDayWiseWeightsForIngredient(ingredient)
            : weights[ingredient];
          
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

      // Track analytics event
      analytics.trackEvent({
        action: 'shop_on_amazon_click',
        category: 'shopping',
        label: `amazon_${amazonRegion}`,
        custom_parameters: {
          ingredient_count: selectedIngredientsList.length,
          amazon_region: amazonRegion,
          active_tab: activeTab,
          week_start: mealPlan.weekStartDate,
          user_id: mealPlan.userInfo?.id || mealPlan.userInfo?.uid || null,
        },
      });

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
              disabled={isSubmitting}
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

            {/* Tabs */}
            {dayWise && (
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  onClick={() => setActiveTab('category')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'category'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  By Category
                </button>
                <button
                  onClick={() => setActiveTab('day')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'day'
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  By Day
                </button>
              </div>
            )}
            
            {ingredients.length > 0 ? (
              <div className="space-y-4">
                {/* Category View */}
                {activeTab === 'category' && (
                  Object.entries(categorized).length > 0 ? (
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
                              onClick={(e) => {
                                // Don't trigger if clicking directly on the checkbox
                                if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                  handleIngredientToggle(ingredientIndex);
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedIngredients.has(ingredientIndex)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleIngredientToggle(ingredientIndex);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3 flex-shrink-0 cursor-pointer"
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
                                      if (item.unit?.toLowerCase() === 'g' && item.amount >= 1000) {
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
                        onClick={(e) => {
                          // Don't trigger if clicking directly on the checkbox
                          if ((e.target as HTMLElement).tagName !== 'INPUT') {
                            handleIngredientToggle(index);
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIngredients.has(index)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleIngredientToggle(index);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3 flex-shrink-0 cursor-pointer"
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
                  )
                )}

                {/* Day View */}
                {activeTab === 'day' && dayWise && Object.entries(dayWise).length > 0 && (
                  <div className="space-y-2">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                      const dayMeals = dayWise[day];
                      if (!dayMeals || Object.keys(dayMeals).length === 0) return null;

                      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
                      const dayDate = new Date(mealPlan.weekStartDate);
                      const dayOffset = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(day);
                      dayDate.setDate(dayDate.getDate() + dayOffset);

                      // Count selected ingredients for this day
                      const dayIngredients = new Set<string>();
                      Object.entries(dayMeals).forEach(([mealType, mealData]) => {
                        if (mealData?.ingredients && Array.isArray(mealData.ingredients)) {
                          mealData.ingredients.forEach((ingredient: any) => {
                            if (ingredient?.name) {
                              dayIngredients.add(`${day}||${mealType}||${ingredient.name}`);
                            }
                          });
                        }
                      });
                      const allDaySelected = Array.from(dayIngredients).every(key => selectedDayIngredients.has(key));
                      const hasDaySelection = Array.from(dayIngredients).some(key => selectedDayIngredients.has(key));

                      const isExpanded = expandedDays.has(day);

                      return (
                        <div key={day} className={`space-y-3 ${isExpanded ? 'mb-4' : ''}`}>
                          <div className="bg-gray-50 border-l-4 border-blue-500 rounded px-3 py-2.5 flex items-center justify-between">
                            <button
                              onClick={() => handleDayToggle(day)}
                              className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 hover:text-gray-900 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-600" />
                              )}
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {dayName}
                                </h4>
                                <span className="text-xs text-gray-500 font-normal">
                                  {dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDaySelectAll(day);
                              }}
                              className={`text-xs px-2 py-1 rounded transition-colors ${
                                allDaySelected
                                  ? 'bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300'
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              {allDaySelected ? 'Deselect All' : 'Select All'}
                            </button>
                          </div>
                          
                          {isExpanded && Object.entries(dayMeals).map(([mealType, mealData]) => {
                            // Safety check for mealData structure
                            if (!mealData || typeof mealData !== 'object') {
                              console.warn(`Invalid mealData for ${day}/${mealType}:`, mealData);
                              return null;
                            }

                            if (!Array.isArray(mealData.ingredients) || mealData.ingredients.length === 0) {
                              console.warn(`No ingredients for ${day}/${mealType}:`, mealData);
                              return null;
                            }

                            // Count selected ingredients for this meal
                            const mealIngredients = new Set<string>();
                            if (mealData?.ingredients && Array.isArray(mealData.ingredients)) {
                              mealData.ingredients.forEach((ingredient: any) => {
                                if (ingredient?.name) {
                                  mealIngredients.add(`${day}||${mealType}||${ingredient.name}`);
                                }
                              });
                            }
                            const allMealSelected = Array.from(mealIngredients).every(key => selectedDayIngredients.has(key));

                            const imageUrl = mealPlan.imageURLs?.[day]?.[mealType];
                            const baseUrl = process.env.NEXT_PUBLIC_MEAL_IMAGES_BASE_URL || '';
                            const fullImageUrl = imageUrl ? baseUrl + imageUrl : null;

                            return (
                            <div key={`${day}-${mealType}`} className="space-y-2">
                              <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {fullImageUrl && (
                                    <div className="flex-shrink-0">
                                      <img
                                        src={fullImageUrl}
                                        alt={mealData.name || 'Meal'}
                                        className="w-12 h-12 rounded-lg object-cover border border-gray-300"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide block">
                                      {mealType.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <h5 className="text-sm font-semibold text-gray-800 mt-0.5">
                                      {mealData.name || 'Meal'}
                                    </h5>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleMealSelectAll(day, mealType)}
                                  className={`text-xs px-2 py-1 rounded transition-colors flex-shrink-0 ${
                                    allMealSelected
                                      ? 'bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-300'
                                      : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  {allMealSelected ? 'Deselect' : 'Select All'}
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {mealData.ingredients.map((ingredient, idx) => {
                                  // Safety check for ingredient structure
                                  if (!ingredient || !ingredient.name) {
                                    console.warn(`Invalid ingredient at ${day}/${mealType}[${idx}]:`, ingredient);
                                    return null;
                                  }

                                  const ingredientKey = `${day}||${mealType}||${ingredient.name}`;
                                  const isSelected = selectedDayIngredients.has(ingredientKey);
                                  
                                  return (
                                    <div
                                      key={`${day}-${mealType}-${idx}`}
                                      className={`flex items-center p-2 rounded-lg border transition-all duration-200 cursor-pointer ${
                                        isSelected
                                          ? 'bg-blue-50 border-blue-200 shadow-sm'
                                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                      }`}
                                      onClick={(e) => {
                                        // Don't trigger if clicking directly on the checkbox
                                        if ((e.target as HTMLElement).tagName !== 'INPUT') {
                                          handleDayIngredientToggle(ingredientKey);
                                        }
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleDayIngredientToggle(ingredientKey);
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3 flex-shrink-0 cursor-pointer"
                                      />
                                      <div className="flex-1">
                                        <span className={`font-medium text-sm sm:text-base ${
                                          isSelected ? 'text-blue-900' : 'text-gray-800'
                                        }`}>
                                          {ingredient.name.split(' ').map(word => 
                                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                          ).join(' ')}
                                          <span className={`text-xs font-normal ml-1 ${
                                            isSelected ? 'text-blue-600' : 'text-gray-500'
                                          }`}>
                                            {(() => {
                                              if (ingredient.unit.toLowerCase() === 'g' && ingredient.amount >= 1000) {
                                                const kgAmount = Math.round((ingredient.amount / 1000) * 100) / 100;
                                                return `(${kgAmount} kg)`;
                                              }
                                              return `(${ingredient.amount} ${ingredient.unit})`;
                                            })()}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }).filter(Boolean)}
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      );
                    }).filter(Boolean)}
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
            {activeTab === 'day' && dayWise 
              ? `${selectedDayIngredients.size} ingredient${selectedDayIngredients.size !== 1 ? 's' : ''} selected`
              : `${selectedIngredients.size} of ${ingredients.length} ingredient${ingredients.length !== 1 ? 's' : ''} selected`
            }
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
              disabled={activeTab === 'day' && dayWise ? selectedDayIngredients.size === 0 : selectedIngredients.size === 0}
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
