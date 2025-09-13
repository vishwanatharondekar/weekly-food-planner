'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, Trash2, X, FileDown, ShoppingCart } from 'lucide-react';
import { mealsAPI, aiAPI, authAPI } from '@/lib/api';
import { DAYS_OF_WEEK, getWeekStartDate, formatDate, debounce, getMealDisplayName, getMealPlaceholder, DEFAULT_MEAL_SETTINGS, type MealSettings, ALL_MEAL_TYPES } from '@/lib/utils';
import toast from 'react-hot-toast';
import { generateMealPlanPDF, generateShoppingListPDF } from '@/lib/pdf-generator';
import { saveVideoURLForRecipe } from '@/lib/video-url-utils';
import FullScreenLoader from './FullScreenLoader';

interface MealData {
  [day: string]: {
    [mealType: string]: string;
  };
}

interface MealDataWithVideos {
  [day: string]: {
    [mealType: string]: {
      name: string;
      videoUrl?: string;
    };
  };
}

interface MealPlannerProps {
  user: any;
}

export default function MealPlanner({ user }: MealPlannerProps) {
  const [currentWeek, setCurrentWeek] = useState(getWeekStartDate(new Date()));
  const [meals, setMeals] = useState<MealDataWithVideos>({});
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ hasHistory: false, canGenerate: false });
  const [mealSettings, setMealSettings] = useState<MealSettings>(DEFAULT_MEAL_SETTINGS);
  const [savingMeals, setSavingMeals] = useState<Set<string>>(new Set()); // Track which meals are being saved
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{day: string, mealType: string} | null>(null);
  const [userLanguage, setUserLanguage] = useState<string>('en'); // Default to English
  
  // Full screen loader states
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [loaderSubMessage, setLoaderSubMessage] = useState('');
  const [currentOperation, setCurrentOperation] = useState<'ai' | 'pdf' | 'shopping' | null>(null);
  
  // Tooltip delay states
  const [showPdfTooltip, setShowPdfTooltip] = useState(false);
  const [showShoppingTooltip, setShowShoppingTooltip] = useState(false);
  const [showAiTooltip, setShowAiTooltip] = useState(false);
  const pdfTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shoppingTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMealSettings();
    loadUserLanguagePreferences();
  }, []);

  useEffect(() => {
    loadMeals();
    checkAIStatus();
  }, [currentWeek]);

  // Cleanup tooltip timeouts on unmount
  useEffect(() => {
    return () => {
      if (pdfTooltipTimeoutRef.current) {
        clearTimeout(pdfTooltipTimeoutRef.current);
      }
      if (shoppingTooltipTimeoutRef.current) {
        clearTimeout(shoppingTooltipTimeoutRef.current);
      }
      if (aiTooltipTimeoutRef.current) {
        clearTimeout(aiTooltipTimeoutRef.current);
      }
    };
  }, []);

  // Helper functions for loader management
  const showFullScreenLoader = (operation: 'ai' | 'pdf' | 'shopping', message: string, subMessage?: string) => {
    setCurrentOperation(operation);
    setLoaderMessage(message);
    setLoaderSubMessage(subMessage || '');
    setShowLoader(true);
  };

  const hideFullScreenLoader = () => {
    setShowLoader(false);
    setCurrentOperation(null);
    setLoaderMessage('');
    setLoaderSubMessage('');
  };

  const handleLoaderCancel = () => {
    hideFullScreenLoader();
    setLoading(false);
    toast('Operation cancelled', { icon: 'ℹ️' });
  };

  const loadMealSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/meal-settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const loadedSettings = data.mealSettings || DEFAULT_MEAL_SETTINGS;
        // Ensure meal types are in the correct chronological order
        const orderedSettings = {
          ...loadedSettings,
          enabledMealTypes: ALL_MEAL_TYPES.filter(type => loadedSettings.enabledMealTypes.includes(type))
        };
        setMealSettings(orderedSettings);
      }
    } catch (error) {
      console.error('Error loading meal settings:', error);
    }
  };

  const loadUserLanguagePreferences = async () => {
    try {
      console.log('Loading user language preferences...');
      const preferences = await authAPI.getLanguagePreferences();
      console.log('Language preferences loaded:', preferences);
      
      if (preferences && preferences.language) {
        console.log('Setting user language to:', preferences.language);
        setUserLanguage(preferences.language);
      } else {
        console.log('No language preferences found, keeping default English');
      }
    } catch (error) {
      console.error('Error loading language preferences:', error);
      // Keep default English
    }
  };

  const handleMealSettingsChange = (newSettings: MealSettings) => {
    setMealSettings(newSettings);
    // Reload meals to reflect new structure
    loadMeals();
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      showFullScreenLoader('ai', 'Loading Weekly Plan', 'Fetching your meal plan from the server...');
      
      const weekStart = formatDate(currentWeek);
      const response = await mealsAPI.getWeekMeals(weekStart);
      
      // Update loader message
      setLoaderMessage('Processing Meal Data');
      setLoaderSubMessage('Loading video URLs and organizing your meals...');
      
      // Load user's video URLs
      let userVideoURLs: { [recipeName: string]: string } = {};
      try {
        userVideoURLs = await authAPI.getVideoURLs();
      } catch (error) {
        console.warn('Failed to load user video URLs:', error);
      }
      
      // Convert to new format with video URLs
      const convertedMeals: MealDataWithVideos = {};
      DAYS_OF_WEEK.forEach(day => {
        convertedMeals[day] = {};
        // Load ALL meal types from the response, not just enabled ones
        ALL_MEAL_TYPES.forEach(mealType => {
          const meal = response.meals[day]?.[mealType];
          if (meal) {
            // Handle different meal data formats
            let mealName = '';
            if (typeof meal === 'string') {
              mealName = meal;
            } else if (typeof meal === 'object' && meal.name) {
              mealName = meal.name;
            } else {
              // Fallback: convert to string if it's an object
              mealName = String(meal);
            }
            
            // Look up video URL for this recipe
            const normalizedRecipeName = mealName.toLowerCase().trim();
            const videoUrl = userVideoURLs[normalizedRecipeName];
            
            convertedMeals[day][mealType] = {
              name: mealName,
              videoUrl: videoUrl || undefined
            };
          }
        });
      });
      
      setMeals(convertedMeals);
      hideFullScreenLoader();
    } catch (error) {
      console.error('Error loading meals:', error);
      hideFullScreenLoader();
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  };

  const checkAIStatus = async () => {
    try {
      const status = await aiAPI.getAIStatus();
      setAiStatus(status);
    } catch (error) {
      console.error('Error checking AI status:', error);
    }
  };

  // Debounced meal update function
  const debouncedUpdateMeal = useCallback(
    debounce(async (day: string, mealType: string, value: string) => {
      const mealKey = `${day}-${mealType}`;
      setSavingMeals(prev => new Set(prev).add(mealKey));
      
      try {
        const weekStart = formatDate(currentWeek);
        await mealsAPI.updateMeal(weekStart, day, mealType, value);
      } catch (error) {
        console.error('Error updating meal:', error);
        toast.error('Failed to update meal');
      } finally {
        setSavingMeals(prev => {
          const newSet = new Set(prev);
          newSet.delete(mealKey);
          return newSet;
        });
      }
    }, 500), // 500ms delay
    [currentWeek]
  );

  // Debounced video URL check function
  const debouncedCheckVideoURL = useCallback(
    debounce(async (day: string, mealType: string, mealName: string) => {
      if (!mealName.trim()) return;
      
      try {
        const userVideoURLs = await authAPI.getVideoURLs();
        const normalizedRecipeName = mealName.toLowerCase().trim();
        const videoUrl = userVideoURLs[normalizedRecipeName];
        
        // Update local state with video URL
        setMeals(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            [mealType]: {
              ...prev[day]?.[mealType],
              videoUrl: videoUrl || undefined
            }
          }
        }));
      } catch (error) {
        console.warn('Failed to check for video URL:', error);
      }
    }, 300), // 300ms delay for video URL checking
    []
  );

  const updateMeal = async (day: string, mealType: string, value: string) => {
    // Update local state immediately for responsive UI
    setMeals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: {
          ...prev[day]?.[mealType],
          name: value
        }
      }
    }));

    // Debounce the API call for meal saving
    debouncedUpdateMeal(day, mealType, value);
    
    // Debounce the video URL check
    debouncedCheckVideoURL(day, mealType, value);
  };

  const handleVideoUrlChange = (day: string, mealType: string, videoUrl: string) => {
    setMeals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: {
          ...prev[day]?.[mealType],
          videoUrl: videoUrl || undefined
        }
      }
    }));
  };

  const openVideoModal = (day: string, mealType: string) => {
    setSelectedMeal({ day, mealType });
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedMeal(null);
  };

  const saveVideoUrl = async (videoUrl: string) => {
    if (selectedMeal) {
      const mealName = meals[selectedMeal.day]?.[selectedMeal.mealType]?.name || '';
      
      if (!mealName) {
        toast.error('Please enter a meal name first');
        return;
      }

      try {
        // Save to user's video URL collection
        await saveVideoURLForRecipe(mealName, videoUrl);
        
        // Update local state immediately
        handleVideoUrlChange(selectedMeal.day, selectedMeal.mealType, videoUrl);
        
        toast.success('Video URL saved successfully!');
      } catch (error) {
        console.error('Error saving video URL:', error);
        toast.error('Failed to save video URL');
      }
    }
    closeVideoModal();
  };

  const generateAIMeals = async () => {
    console.log('Generating AI meals');
    try {
      setLoading(true);
      showFullScreenLoader('ai', 'Getting AI Results', 'Analyzing your preferences and generating meal suggestions...');
      
      const weekStart = formatDate(currentWeek);
      const suggestions = await aiAPI.generateMeals(weekStart);
      
      // Update loader message
      setLoaderMessage('Processing AI Results');
      setLoaderSubMessage('Applying suggestions to your meal plan...');
      
      // Prepare updated meals with AI suggestions for empty slots
      const updatedMeals = { ...meals };
      let hasUpdates = false;
      
      // Only update empty meals, preserve existing user input
      for (const [day, dayMeals] of Object.entries(suggestions)) {
        for (const [mealType, mealName] of Object.entries(dayMeals as any)) {
          // Only update if the meal type is enabled in settings
          if (mealSettings.enabledMealTypes.includes(mealType)) {
            const currentMeal = meals[day]?.[mealType]?.name || '';
          if (!currentMeal.trim()) {
            // Check if there's a saved video URL for this recipe
            let videoUrl: string | undefined = undefined;
            try {
              const userVideoURLs = await authAPI.getVideoURLs();
              const normalizedRecipeName = (mealName as string).toLowerCase().trim();
              videoUrl = userVideoURLs[normalizedRecipeName];
            } catch (error) {
              console.warn('Failed to check for video URL:', error);
            }

            // Update local state
            updatedMeals[day] = {
              ...updatedMeals[day],
                [mealType]: {
                  name: mealName as string,
                  videoUrl: videoUrl
                }
            };
            hasUpdates = true;
            }
          }
        }
      }
      
      // Save all updated meals at once if there are any changes
      if (hasUpdates) {
        await mealsAPI.createOrUpdateMealPlan(weekStart, updatedMeals);
        setMeals(updatedMeals);
      }
      
      hideFullScreenLoader();
      toast.success('AI meal suggestions applied to empty slots!');
      await checkAIStatus();
    } catch (error: any) {
      console.error('Error generating AI meals:', error);
      hideFullScreenLoader();
      toast.error(error.message || 'Failed to generate AI suggestions');
    } finally {
      setLoading(false);
    }
  };

  const clearMeals = async () => {
    // Add confirmation dialog
    const confirmed = window.confirm('Are you sure you want to clear all meals for this week? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      showFullScreenLoader('ai', 'Clearing Meals', 'Removing all meals from this week...');
      
      const weekStart = formatDate(currentWeek);
      await mealsAPI.clearWeekMeals(weekStart);
      setMeals({});
      
      hideFullScreenLoader();
      toast.success('All meals cleared for this week!');
      await checkAIStatus(); // Re-check AI status after clearing
    } catch (error) {
      console.error('Error clearing meals:', error);
      hideFullScreenLoader();
      toast.error('Failed to clear meals');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const handleGeneratePDF = async () => {
    try {
      showFullScreenLoader('pdf', 'Generating PDF', 'Preparing your meal plan document...');
      
      // Convert to format expected by PDF generator
      const pdfMeals: { [day: string]: { [mealType: string]: string } } = {};
      const videoURLs: { [day: string]: { [mealType: string]: string } } = {};
      
      DAYS_OF_WEEK.forEach(day => {
        pdfMeals[day] = {};
        videoURLs[day] = {};
        mealSettings.enabledMealTypes.forEach(mealType => {
          const meal = meals[day]?.[mealType];
          if (meal) {
            pdfMeals[day][mealType] = meal.name;
            if (meal.videoUrl) {
              videoURLs[day][mealType] = meal.videoUrl;
            }
          }
        });
      });

      setLoaderMessage('Creating PDF');
      setLoaderSubMessage('Formatting your weekly meal plan...');

      await generateMealPlanPDF({
        weekStartDate: formatDate(currentWeek),
        meals: pdfMeals,
        userInfo: user,
        mealSettings,
        videoURLs,
        targetLanguage: userLanguage

      });
      
      hideFullScreenLoader();
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      hideFullScreenLoader();
      toast.error('Failed to generate PDF');
    }
  };

  const handleGenerateShoppingList = async () => {
    try {
      showFullScreenLoader('shopping', 'Generating Shopping List', 'Analyzing your meals and creating a comprehensive shopping list...');
      
      // Convert to format expected by PDF generator
      const pdfMeals: { [day: string]: { [mealType: string]: string } } = {};
      const videoURLs: { [day: string]: { [mealType: string]: string } } = {};
      
      DAYS_OF_WEEK.forEach(day => {
        pdfMeals[day] = {};
        videoURLs[day] = {};
        mealSettings.enabledMealTypes.forEach(mealType => {
          const meal = meals[day]?.[mealType];
          if (meal) {
            pdfMeals[day][mealType] = meal.name;
            if (meal.videoUrl) {
              videoURLs[day][mealType] = meal.videoUrl;
            }
          }
        });
      });

      setLoaderMessage('Creating Shopping List');
      setLoaderSubMessage('Organizing ingredients and quantities...');

      await generateShoppingListPDF({
        weekStartDate: formatDate(currentWeek),
        meals: pdfMeals,
        userInfo: user,
        mealSettings,
        videoURLs,
        targetLanguage: userLanguage

      });
      
      hideFullScreenLoader();
      toast.success('Shopping list downloaded successfully!');
    } catch (error) {
      console.error('Error generating shopping list:', error);
      hideFullScreenLoader();
      toast.error('Failed to generate shopping list');
    }

  };

  // Tooltip handlers with 2-second delay
  const handlePdfTooltipStart = () => {
    if (pdfTooltipTimeoutRef.current) {
      clearTimeout(pdfTooltipTimeoutRef.current);
    }
    pdfTooltipTimeoutRef.current = setTimeout(() => {
      setShowPdfTooltip(true);
    }, 1000);
  };

  const handlePdfTooltipEnd = () => {
    if (pdfTooltipTimeoutRef.current) {
      clearTimeout(pdfTooltipTimeoutRef.current);
      pdfTooltipTimeoutRef.current = null;
    }
    setShowPdfTooltip(false);
  };

  const handleShoppingTooltipStart = () => {
    if (shoppingTooltipTimeoutRef.current) {
      clearTimeout(shoppingTooltipTimeoutRef.current);
    }
    shoppingTooltipTimeoutRef.current = setTimeout(() => {
      setShowShoppingTooltip(true);
    }, 1000);
  };

  const handleShoppingTooltipEnd = () => {
    if (shoppingTooltipTimeoutRef.current) {
      clearTimeout(shoppingTooltipTimeoutRef.current);
      shoppingTooltipTimeoutRef.current = null;
    }
    setShowShoppingTooltip(false);
  };

  const handleAiTooltipStart = () => {
    if (aiTooltipTimeoutRef.current) {
      clearTimeout(aiTooltipTimeoutRef.current);
    }
    aiTooltipTimeoutRef.current = setTimeout(() => {
      setShowAiTooltip(true);
    }, 1000);
  };

  const handleAiTooltipEnd = () => {
    if (aiTooltipTimeoutRef.current) {
      clearTimeout(aiTooltipTimeoutRef.current);
      aiTooltipTimeoutRef.current = null;
    }
    setShowAiTooltip(false);
  };



  const enabledMealTypes = mealSettings.enabledMealTypes;

  const getVideoIcon = (day: string, mealType: string) => {
    const meal = meals[day]?.[mealType];
    if (meal?.videoUrl) {
      return (
        <span 
          className="text-green-600 cursor-pointer"
          title="Video attached"
          onClick={() => openVideoModal(day, mealType)}
        >
          🎥
        </span>
      );
    }
    return (
      <span 
        className="text-gray-400 cursor-pointer hover:text-blue-600"
        title="Add video"
        onClick={() => openVideoModal(day, mealType)}
      >
        📹
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        
            
        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-4 border border-gray-200">
          <button
            onClick={() => navigateWeek('prev')}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Week
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              {format(currentWeek, 'MMMM d')} - {format(addWeeks(currentWeek, 1), 'MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Current Week</p>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Next Week
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* Meal Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Weekly Meal Plan</h3>
                <p className="text-sm text-gray-600 mt-1">Enter your meals for each day and meal type</p>
              </div>
              


              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                {/* 1. Fill with AI */}
                {aiStatus.canGenerate && (
                  <div className="relative">
                    <button
                      onClick={generateAIMeals}
                      onMouseEnter={handleAiTooltipStart}
                      onMouseLeave={handleAiTooltipEnd}
                      disabled={loading}
                      className="p-2 text-gray-600 hover:text-purple-600 bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="w-5 h-5" />
                    </button>
                    {showAiTooltip && (
                      <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md z-50 whitespace-nowrap shadow-lg">
                        <div className="text-white">Fill with AI</div>
                        <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 2. Download PDF */}
                <div className="relative">
                  <button
                    onClick={handleGeneratePDF}
                    onMouseEnter={handlePdfTooltipStart}
                    onMouseLeave={handlePdfTooltipEnd}
                    className="p-2 text-gray-600 hover:text-blue-600 bg-gray-100 rounded-md transition-colors"
                  >
                    <FileDown className="w-5 h-5" />
                  </button>
                  {showPdfTooltip && (
                    <div className="absolute top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md z-50 whitespace-nowrap shadow-lg">
                      <div className="text-white">Download PDF</div>
                      <div className="absolute bottom-full left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                    </div>
                  )}
                </div>
                
                {/* 3. Shopping List */}
                <div className="relative">
                  <button
                    onClick={handleGenerateShoppingList}
                    onMouseEnter={handleShoppingTooltipStart}
                    onMouseLeave={handleShoppingTooltipEnd}
                    disabled={loading}
                    className="p-2 text-gray-600 hover:text-green-600 bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                  {showShoppingTooltip && (
                    <div className="absolute top-full -left-20 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md z-50 whitespace-nowrap shadow-lg">
                      <div className="text-white">Generate Shopping List</div>
                      <div className="absolute bottom-full left-24 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                    </div>
                  )}
                </div>
                
                {/* 4. Clear Week */}
                <div className="relative">
                  <button
                    onClick={clearMeals}
                    disabled={loading}
                    className="p-2 text-gray-600 hover:text-red-600 bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Day
                  </th>
                  {enabledMealTypes.map(mealType => (
                    <th key={mealType} className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      {getMealDisplayName(mealType)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {DAYS_OF_WEEK.map((day, index) => {
                  const dayDate = new Date(currentWeek);
                  dayDate.setDate(currentWeek.getDate() + index);
                  
                  return (
                    <tr key={day} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap bg-gray-50">
                        <div className="text-sm font-bold text-gray-900">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </div>
                        <div className="text-sm text-gray-600 font-medium">
                          {format(dayDate, 'MMM d')}
                        </div>
                      </td>
                      {enabledMealTypes.map(mealType => (
                        <td key={mealType} className="px-6 py-4 whitespace-nowrap">
                          <div className="relative group">
                            <input
                              type="text"
                              value={(() => {
                                const meal = meals[day]?.[mealType];
                                if (!meal) return '';
                                if (typeof meal === 'string') return meal;
                                if (typeof meal === 'object' && meal.name) return meal.name;
                                if (typeof meal === 'object' && meal.name === '') return '';
                                return '';
                              })()}
                              onChange={(e) => updateMeal(day, mealType, e.target.value)}
                              placeholder={`Enter ${getMealPlaceholder(mealType)}...`}
                              className={`w-full px-4 py-3 pr-16 border-2 rounded-lg focus:outline-none focus:ring-0.5 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                                savingMeals.has(`${day}-${mealType}`) 
                                  ? 'border-blue-400 bg-blue-50 shadow-sm' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                            />
                            {(() => {
                              const meal = meals[day]?.[mealType];
                              if (!meal) return null;
                              const mealName = typeof meal === 'string' ? meal : (meal.name || '');
                              // Show tooltip for any non-empty meal name
                              if (mealName.trim()) {
                                return (
                                  <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs break-words shadow-lg">
                                    <div className="text-white">
                                      {mealName}
                                    </div>
                                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {savingMeals.has(`${day}-${mealType}`) && (
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            {(() => {
                              const meal = meals[day]?.[mealType];
                              if (!meal) return false;
                              const mealName = typeof meal === 'string' ? meal : (meal.name || '');
                              return mealName && !savingMeals.has(`${day}-${mealType}`);
                            })() && (
                              <button
                                type="button"
                                onClick={() => updateMeal(day, mealType, '')}
                                className="absolute inset-y-0 right-8 pr-2 flex items-center hover:text-gray-600 transition-colors"
                                title="Clear meal"
                              >
                                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                              </button>
                            )}
                            <div className="absolute inset-y-0 right-2 flex items-center">
                              {getVideoIcon(day, mealType)}
                            </div>
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {showVideoModal && selectedMeal && (
          <VideoModal
            isOpen={showVideoModal}
            onClose={closeVideoModal}
            onSave={saveVideoUrl}
            currentVideoUrl={meals[selectedMeal.day]?.[selectedMeal.mealType]?.videoUrl || ''}
            mealName={meals[selectedMeal.day]?.[selectedMeal.mealType]?.name || ''}
          />
        )}
      </div>
      
      {/* Full Screen Loader */}
      <FullScreenLoader
        isVisible={showLoader}
        onCancel={handleLoaderCancel}
        message={loaderMessage}
        subMessage={loaderSubMessage}
      />
    </div>
  );
}

// Video Modal Component
interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (videoUrl: string) => Promise<void>;
  currentVideoUrl: string;
  mealName: string;
}

function VideoModal({ isOpen, onClose, onSave, currentVideoUrl, mealName }: VideoModalProps) {
  const [videoUrl, setVideoUrl] = useState(currentVideoUrl);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(videoUrl);
    } catch (error) {
      console.error('Error saving video URL:', error);
    } finally {
      setSaving(false);
    }
  };

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4">
          Attach YouTube Video for: {mealName}
        </h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube Video URL:
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {videoId && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview:</h3>
            <div className="aspect-video bg-gray-100 rounded">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Video'}
          </button>
        </div>
      </div>
    </div>
  );
} 