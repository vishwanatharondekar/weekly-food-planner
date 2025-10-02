'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, addWeeks, subWeeks, addDays, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, Trash2, X, FileDown, ShoppingCart, ChefHat, Calendar, Pencil } from 'lucide-react';
import { mealsAPI, aiAPI, authAPI } from '@/lib/api';
import { DAYS_OF_WEEK, getWeekStartDate, formatDate, debounce, getMealDisplayName, getMealPlaceholder, DEFAULT_MEAL_SETTINGS, type MealSettings, ALL_MEAL_TYPES } from '@/lib/utils';
import toast from 'react-hot-toast';
import { generateMealPlanPDF, generateShoppingListPDF } from '@/lib/pdf-generator';
import { saveVideoURLForRecipe } from '@/lib/video-url-utils';
import FullScreenLoader from './FullScreenLoader';
import PreferencesEditModal from './PreferencesEditModal';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

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
  continueFromOnboarding?: boolean;
  onUserUpdate?: (updatedUser: any) => void;
}

export default function MealPlanner({ user, continueFromOnboarding = false, onUserUpdate }: MealPlannerProps) {
  const [currentWeek, setCurrentWeek] = useState(getWeekStartDate(new Date()));
  const [meals, setMeals] = useState<MealDataWithVideos>({});
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ hasHistory: false, canGenerate: false });
  const [mealSettings, setMealSettings] = useState<MealSettings>(DEFAULT_MEAL_SETTINGS);
  const [savingMeals, setSavingMeals] = useState<Set<string>>(new Set()); // Track which meals are being saved
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{day: string, mealType: string} | null>(null);
  const [userLanguage, setUserLanguage] = useState<string>('en'); // Default to English
  
  // Mode switching state
  const [currentMode, setCurrentMode] = useState<'plan' | 'cook'>('plan');
  const [hasTodaysMeals, setHasTodaysMeals] = useState(false);
  const [todaysMeals, setTodaysMeals] = useState({});
  const [initialModeSet, setInitialModeSet] = useState(false);
  
  // Full screen loader states
  const [showLoader, setShowLoader] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState('');
  const [loaderSubMessage, setLoaderSubMessage] = useState('');
  const [currentOperation, setCurrentOperation] = useState<'ai' | 'pdf' | 'shopping' | null>(null);
  
  // Tooltip delay states
  const [showPdfTooltip, setShowPdfTooltip] = useState(false);
  const [showShoppingTooltip, setShowShoppingTooltip] = useState(false);
  const [showAiTooltip, setShowAiTooltip] = useState(false);
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(true);
  const pdfTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shoppingTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const aiTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  useEffect(() => {
    loadMealSettings();
    loadUserLanguagePreferences();
  }, []);

  // React to user prop changes - reload settings when user is updated
  useEffect(() => {
    if (user) {
      loadMealSettings();
      loadUserLanguagePreferences();
    }
  }, [user]);

  useEffect(() => {
    loadMeals();
    checkAIStatus();
  }, [currentWeek]);

  // Auto-generate meals for new users with cuisine preferences
  useEffect(() => {
    if (continueFromOnboarding) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        performAIGeneration();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [continueFromOnboarding]);
  
  // Check if there are meals planned for today
  useEffect(() => {
    if (meals && Object.keys(meals).length > 0 && mealSettings.enabledMealTypes.length > 0) {
      checkTodaysMeals(meals);
    }
  }, [meals, currentWeek, mealSettings.enabledMealTypes]);

  // Set default mode to Cook if there are meals planned for today
  useEffect(() => {
    if (hasTodaysMeals) {
      setCurrentMode('cook');
      setInitialModeSet(true);
    } else if (!initialModeSet && !hasTodaysMeals) {
      setInitialModeSet(true);
    }
  }, [hasTodaysMeals, initialModeSet]);

  const checkTodaysMeals = (meals: MealDataWithVideos) => {
    const today = new Date();
    const weekStart = getWeekStartDate(today);
    const isCurrentWeek = isSameDay(weekStart, currentWeek);
    
    if (!isCurrentWeek) {
      // setHasTodaysMeals(false);
      return;
    }

    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sunday=0 to Sunday=6
    const todayDay = DAYS_OF_WEEK[todayIndex];
    const todaysMeals = meals[todayDay];
    
    if (!todaysMeals) {
      setHasTodaysMeals(false);
      return;
    }
    
    const hasAnyMeal = mealSettings.enabledMealTypes.some(mealType => {
      const meal = todaysMeals[mealType];
      const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
      return mealName.trim().length > 0;
    });
    
    setTodaysMeals(todaysMeals);
    setHasTodaysMeals(hasAnyMeal);
  };

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
      const preferences = await authAPI.getLanguagePreferences();
      
      if (preferences && preferences.language) {
        setUserLanguage(preferences.language);
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
    // Track meal update event
    const isNewMeal = !meals[day]?.[mealType]?.name?.trim();
    analytics.trackEvent({
      action: isNewMeal ? AnalyticsEvents.MEAL.ADD : AnalyticsEvents.MEAL.UPDATE,
      category: 'meal_planning',
      label: `${day}_${mealType}`,
      custom_parameters: {
        day,
        meal_type: mealType,
        meal_name: value,
        is_new_meal: isNewMeal,
        week_start: formatDate(currentWeek),
      },
    });

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
    // Track video modal opening
    analytics.trackEvent({
      action: AnalyticsEvents.VIDEO.OPEN_MODAL,
      category: 'video_management',
      custom_parameters: {
        day,
        meal_type: mealType,
        meal_name: meals[day]?.[mealType]?.name || '',
        week_start: formatDate(currentWeek),
        user_id: user?.id,
      },
    });
    
    setSelectedMeal({ day, mealType });
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedMeal(null);
  };

  const focusMealInput = (day: string, mealType: string, formFactor?: string) => {
    // Find the input element for the specific day and meal type
    const inputId = formFactor ? `meal-input-${formFactor}-${day}-${mealType}` : `meal-input-${day}-${mealType}`;
    const inputElement = document.getElementById(inputId);
    if (inputElement) {
      inputElement.focus();
    }
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
        
        // Track video URL addition
        analytics.trackEvent({
          action: AnalyticsEvents.VIDEO.ADD_URL,
          category: 'video_management',
          custom_parameters: {
            meal_name: mealName,
            day: selectedMeal.day,
            meal_type: selectedMeal.mealType,
            video_url: videoUrl,
            week_start: formatDate(currentWeek),
          },
        });
        
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

  const generateAIMeals = () => {
    console.log('Opening preferences modal for AI generation');
    setShowPreferencesModal(true);
  };

  const handlePreferencesConfirm = async (preferences: any) => {
    console.log('Updating preferences and generating AI meals');
    setIsUpdatingPreferences(true);
    
    try {
      // Update user preferences
      await authAPI.updateDishPreferences({
        dishPreferences: preferences.dishPreferences,
        onboardingCompleted: true,
      });

      // Update the user data in parent component
      if (onUserUpdate) {
        const updatedUser = {
          ...user,
          dishPreferences: preferences.dishPreferences,
          ingredients: preferences.ingredients || [],
          customIngredients: preferences.customIngredients || []
        };
        onUserUpdate(updatedUser);
      }

      // Close modal
      setShowPreferencesModal(false);
      
      // Now generate AI meals with ingredients
      await performAIGeneration(preferences.ingredients);
      
    } catch (error: any) {
      console.error('Error updating preferences:', error);
      toast.error(error.message || 'Failed to update preferences');
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const performAIGeneration = async (ingredients?: string[]) => {
    try {
      setLoading(true);
      showFullScreenLoader('ai', 'Getting AI Results', 'Analyzing your preferences and generating meal suggestions...');
      
      // Track AI generation start
      analytics.trackEvent({
        action: AnalyticsEvents.AI.GENERATE_MEALS,
        category: 'ai_features',
        custom_parameters: {
          week_start: formatDate(currentWeek),
          has_ingredients: !!ingredients,
          ingredient_count: ingredients?.length || 0,
          user_id: user?.id,
        },
      });
      
      const weekStart = formatDate(currentWeek);
      const suggestions = await aiAPI.generateMeals(weekStart, ingredients);
      const userVideoURLs = await authAPI.getVideoURLs();

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
      
      // Track clear meals event
      analytics.trackEvent({
        action: AnalyticsEvents.MEAL.CLEAR_WEEK,
        category: 'meal_planning',
        custom_parameters: {
          week_start: formatDate(currentWeek),
          user_id: user?.id,
        },
      });
      
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
    // Track navigation event
    analytics.trackEvent({
      action: AnalyticsEvents.NAVIGATION.WEEK_CHANGE,
      category: 'navigation',
      custom_parameters: {
        direction,
        from_week: formatDate(currentWeek),
        to_week: formatDate(direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1)),
        user_id: user?.id,
      },
    });
    
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const handleGeneratePDF = async () => {
    try {
      showFullScreenLoader('pdf', 'Generating PDF', 'Preparing your meal plan document...');
      
      // Track PDF generation event
      analytics.trackEvent({
        action: AnalyticsEvents.PDF.GENERATE_MEAL_PLAN,
        category: 'pdf_generation',
        custom_parameters: {
          week_start: formatDate(currentWeek),
          language: userLanguage,
          meal_count: Object.values(meals).reduce((total, dayMeals) => {
            return total + Object.values(dayMeals).filter(meal => meal.name?.trim()).length;
          }, 0),
          user_id: user?.id,
        },
      });
      
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
      
      // Track shopping list generation event
      analytics.trackEvent({
        action: AnalyticsEvents.PDF.GENERATE_SHOPPING_LIST,
        category: 'pdf_generation',
        custom_parameters: {
          week_start: formatDate(currentWeek),
          language: userLanguage,
          meal_count: Object.values(meals).reduce((total, dayMeals) => {
            return total + Object.values(dayMeals).filter(meal => meal.name?.trim()).length;
          }, 0),
          user_id: user?.id,
        },
      });
      
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
    const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
    const hasText = mealName.trim().length > 0;
    
    // Only show video icon if there's text
    if (!hasText) return null;
    
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

  // Mode switching functions
  const switchToPlanMode = () => {
    // Track mode switch event
    analytics.trackEvent({
      action: AnalyticsEvents.NAVIGATION.MODE_SWITCH,
      category: 'navigation',
      custom_parameters: {
        from_mode: currentMode,
        to_mode: 'plan',
        user_id: user?.id,
      },
    });
    
    setCurrentMode('plan');
  };

  const switchToCookMode = () => {
    // Track mode switch event
    analytics.trackEvent({
      action: AnalyticsEvents.NAVIGATION.MODE_SWITCH,
      category: 'navigation',
      custom_parameters: {
        from_mode: currentMode,
        to_mode: 'cook',
        user_id: user?.id,
      },
    });
    
    setCurrentMode('cook');
  };

  // Get today's meals for cook mode
  const getTodaysMeals = () => {
    const today = new Date();
    const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sunday=0 to Sunday=6
    const todayDay = DAYS_OF_WEEK[todayIndex];
    
    return {
      day: todayDay,
      date: today,
      meals: todaysMeals
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 md:py-8">
        <div className="space-y-6">


        {/* Mode Switcher - Chrome-like Full Width Tabs */}
        {!continueFromOnboarding && <div className="w-full bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200 border-b-0">
          <div className="flex">
            {/* Cook Mode Tab - Left Side */}
            <button
              onClick={switchToCookMode}
              disabled={!hasTodaysMeals}
              className={`relative flex-1 flex items-center justify-center px-8 py-4 text-sm font-medium transition-all duration-200 ${
                currentMode === 'cook'
                  ? 'bg-white text-gray-900 border-b-2 border-orange-500'
                  : hasTodaysMeals
                  ? 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {/* Angled cut for active tab */}
              {currentMode === 'cook' && (
                <div className="absolute right-0 top-0 w-0 h-0 border-l-[20px] border-l-white border-t-[40px] border-t-transparent"></div>
              )}
              
              <ChefHat className="w-4 h-4 mr-2" />
              Today's Menu
              {!hasTodaysMeals && (
                <span className="ml-2 text-xs font-normal opacity-75">(No meals)</span>
              )}
            </button>
            
            {/* Plan Mode Tab - Right Side */}
            <button
              onClick={switchToPlanMode}
              className={`relative flex-1 flex items-center justify-center px-8 py-4 text-sm font-medium transition-all duration-200 ${
                currentMode === 'plan'
                  ? 'bg-white text-gray-900 border-b-2 border-blue-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              {/* Angled cut for active tab */}
              {currentMode === 'plan' && (
                <div className="absolute left-0 top-0 w-0 h-0 border-r-[20px] border-r-white border-t-[40px] border-t-transparent"></div>
              )}
              
              <Calendar className="w-4 h-4 mr-2" />
              Plan
            </button>
          </div>
        </div>
        }

        {/* Cook Mode View */}
        {(!continueFromOnboarding && currentMode === 'cook') && hasTodaysMeals && (
          <CookModeView 
            todaysData={getTodaysMeals()}
            mealSettings={mealSettings}
            onVideoClick={openVideoModal}
          />
        )}

        {/* Plan Mode View */}
        {(continueFromOnboarding || currentMode === 'plan') && (
          <PlanModeView
            currentWeek={currentWeek}
            meals={meals}
            loading={loading}
            aiStatus={aiStatus}
            mealSettings={mealSettings}
            savingMeals={savingMeals}
            enabledMealTypes={enabledMealTypes}
            onNavigateWeek={navigateWeek}
            onGenerateAIMeals={generateAIMeals}
            onGeneratePDF={handleGeneratePDF}
            onGenerateShoppingList={handleGenerateShoppingList}
            onClearMeals={clearMeals}
            onUpdateMeal={updateMeal}
            onFocusMealInput={focusMealInput}
            onGetVideoIcon={getVideoIcon}
            onPdfTooltipStart={handlePdfTooltipStart}
            onPdfTooltipEnd={handlePdfTooltipEnd}
            onShoppingTooltipStart={handleShoppingTooltipStart}
            onShoppingTooltipEnd={handleShoppingTooltipEnd}
            onAiTooltipStart={handleAiTooltipStart}
            onAiTooltipEnd={handleAiTooltipEnd}
            showPdfTooltip={showPdfTooltip}
            showShoppingTooltip={showShoppingTooltip}
            showAiTooltip={showAiTooltip}
          />
        )}

        
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

      {/* Preferences Edit Modal */}
      <PreferencesEditModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
        onConfirm={handlePreferencesConfirm}
        user={user}
        isLoading={isUpdatingPreferences}
      />
      </div>
    </div>
  );
}

// Cook Mode View Component
interface CookModeViewProps {
  todaysData: {
    day: string;
    date: Date;
    meals: any;
  };
  mealSettings: MealSettings;
  onVideoClick: (day: string, mealType: string) => void;
}

function CookModeView({ todaysData, mealSettings, onVideoClick }: CookModeViewProps) {
  const { day, date, meals } = todaysData;
  const enabledMealTypes = mealSettings.enabledMealTypes;

  const getVideoIcon = (mealType: string) => {
    const meal = meals[mealType];
    const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
    const hasText = mealName.trim().length > 0;
    
    if (!hasText) return null;
    
    if (meal?.videoUrl) {
      return (
        <span 
          className="text-green-600 cursor-pointer text-lg"
          title="Video attached - Click to view"
          onClick={() => onVideoClick(day, mealType)}
        >
          🎥
        </span>
      );
    }
    return (
      <span 
        className="text-gray-400 cursor-pointer hover:text-blue-600 text-lg"
        title="Add video - Click to add"
        onClick={() => onVideoClick(day, mealType)}
      >
        📹
      </span>
    );
  };

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-xl border border-orange-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 mt-1">
              {day.charAt(0).toUpperCase() + day.slice(1)} • {format(date, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Today's Menu</h3>
        
        {enabledMealTypes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <ChefHat className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No meal types enabled in settings</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enabledMealTypes.map((mealType) => {
              const meal = meals[mealType];
              const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
              const hasMeal = mealName.trim().length > 0;
              
              return (
                <div
                  key={mealType}
                  className={`bg-white rounded-lg p-6 border-2 transition-all duration-200 ${
                    hasMeal 
                      ? 'border-orange-200 shadow-md hover:shadow-lg' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {getMealDisplayName(mealType)}
                    </h4>
                    {hasMeal && getVideoIcon(mealType)}
                  </div>
                  
                  {hasMeal ? (
                    <div className="space-y-2">
                      <p className="text-gray-800 font-medium text-lg">{mealName}</p>
                      {meal?.videoUrl && (
                        <div className="flex items-center text-sm text-green-600">
                          <span className="mr-1">🎥</span>
                          <span>Video tutorial available</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">
                      No meal planned
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Cooking Tips */}
        <div className="mt-8 bg-white rounded-lg p-6 border border-orange-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <span className="mr-2">💡</span>
            Cooking Tips
          </h4>
          <ul className="text-gray-600 space-y-2">
            <li>• Check all ingredients before you start cooking</li>
            <li>• Prep ingredients in advance for smoother cooking</li>
            <li>• Click the video icon to watch cooking tutorials</li>
            <li>• Switch back to Plan Mode to modify your meal plan</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Plan Mode View Component
interface PlanModeViewProps {
  currentWeek: Date;
  meals: MealDataWithVideos;
  loading: boolean;
  aiStatus: { hasHistory: boolean; canGenerate: boolean };
  mealSettings: MealSettings;
  savingMeals: Set<string>;
  enabledMealTypes: string[];
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGenerateAIMeals: () => void;
  onGeneratePDF: () => void;
  onGenerateShoppingList: () => void;
  onClearMeals: () => void;
  onUpdateMeal: (day: string, mealType: string, value: string) => void;
  onFocusMealInput: (day: string, mealType: string, formFactor?: string) => void;
  onGetVideoIcon: (day: string, mealType: string) => React.ReactNode;
  onPdfTooltipStart: () => void;
  onPdfTooltipEnd: () => void;
  onShoppingTooltipStart: () => void;
  onShoppingTooltipEnd: () => void;
  onAiTooltipStart: () => void;
  onAiTooltipEnd: () => void;
  showPdfTooltip: boolean;
  showShoppingTooltip: boolean;
  showAiTooltip: boolean;
}

function PlanModeView({
  currentWeek,
  meals,
  loading,
  aiStatus,
  mealSettings,
  savingMeals,
  enabledMealTypes,
  onNavigateWeek,
  onGenerateAIMeals,
  onGeneratePDF,
  onGenerateShoppingList,
  onClearMeals,
  onUpdateMeal,
  onFocusMealInput,
  onGetVideoIcon,
  onPdfTooltipStart,
  onPdfTooltipEnd,
  onShoppingTooltipStart,
  onShoppingTooltipEnd,
  onAiTooltipStart,
  onAiTooltipEnd,
  showPdfTooltip,
  showShoppingTooltip,
  showAiTooltip,
}: PlanModeViewProps) {
  return (
    <div className="space-y-6">
      {/* Week Navigation - Desktop */}
      <div className="hidden md:flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-slate-200">
        <button
          onClick={() => onNavigateWeek('prev')}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </button>
        
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">
            {format(currentWeek, 'MMMM d')} - {format(addDays(currentWeek, 6), 'MMMM d, yyyy')}
          </h2>
        </div>
        
        <button
          onClick={() => onNavigateWeek('next')}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      {/* Week Navigation - Mobile */}
      <div className="md:hidden bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-slate-200">
        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onNavigateWeek('prev')}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>
          
          <button
            onClick={() => onNavigateWeek('next')}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </button>
        </div>
        
        {/* Separator */}
        <div className="border-t border-gray-200 mb-4"></div>
        
        {/* Week Dates Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">
            {format(currentWeek, 'MMM d')} - {format(addDays(currentWeek, 6), 'MMM d, yyyy')}
          </h2>
        </div>
      </div>

      {/* Meal Planning Table */}
      <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden border border-slate-200">
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 md:space-x-3 w-full md:w-auto">
            {/* 1. Fill with AI */}
            <button
              onClick={onGenerateAIMeals}
              disabled={loading}
              className="flex flex-col md:flex-row items-center justify-center flex-1 md:flex-none px-2 md:px-4 py-3 md:py-2 text-sm font-medium text-purple-700 bg-slate-50 hover:bg-slate-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-purple-600 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm">AI</span>
            </button>
            
            {/* 2. Download PDF */}
            <button
              onClick={onGeneratePDF}
              className="flex flex-col md:flex-row items-center justify-center flex-1 md:flex-none px-2 md:px-4 py-3 md:py-2 text-sm font-medium text-blue-700 bg-slate-50 hover:bg-slate-100 border border-blue-200 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4 text-blue-600 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm">PDF</span>
            </button>
            
            {/* 3. Shopping List */}
            <button
              onClick={onGenerateShoppingList}
              disabled={loading}
              className="flex flex-col md:flex-row items-center justify-center flex-1 md:flex-none px-2 md:px-4 py-3 md:py-2 text-sm font-medium text-green-700 bg-slate-50 hover:bg-slate-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="w-4 h-4 text-green-600 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm">List</span>
            </button>
            
            {/* 4. Clear Week */}
            <button
              onClick={onClearMeals}
              disabled={loading}
              className="flex flex-col md:flex-row items-center justify-center flex-1 md:flex-none px-2 md:px-4 py-3 md:py-2 text-sm font-medium text-red-700 bg-slate-50 hover:bg-slate-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 text-red-600 mb-1 md:mb-0 md:mr-2" />
              <span className="text-xs md:text-sm">Clear</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-hidden">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b  border-r border-gray-300">
                Day
              </th>
              {enabledMealTypes.map(mealType => (
                <th key={mealType} className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b  border-r border-gray-300 last:border-r-0">
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
                <tr key={day} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}`}>
                  <td className="px-6 py-4 whitespace-nowrap border-r border-gray-300">
                    <div className="text-sm font-bold text-gray-900">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {format(dayDate, 'MMM d')}
                    </div>
                  </td>
                  {enabledMealTypes.map(mealType => {
                    const meal = meals[day]?.[mealType];
                    const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
                    const hasText = mealName.trim().length > 0;
                    
                    return (
                      <td key={mealType} className="px-0 py-0 whitespace-nowrap border-r border-gray-300 last:border-r-0">
                        <div className="relative group h-full">
                          <input
                            id={`meal-input-desktop-${day}-${mealType}`}
                            type="text"
                            value={mealName}
                            onChange={(e) => onUpdateMeal(day, mealType, e.target.value)}
                            placeholder={`Enter ${getMealPlaceholder(mealType)}...`}
                            className={`text-black w-full h-full px-6 py-4 pr-16 bg-transparent focus:outline-none focus:bg-blue-50/30 transition-all duration-200 ${
                              savingMeals.has(`${day}-${mealType}`) 
                                ? 'bg-blue-50' 
                                : ''
                            }`}
                          />
                          
                          {/* Loading spinner */}
                          {savingMeals.has(`${day}-${mealType}`) && (
                            <div className="absolute inset-y-0 right-4 flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                          
                          {/* Action buttons - only show when there's text */}
                          {hasText && !savingMeals.has(`${day}-${mealType}`) && (
                            <div className="absolute inset-y-0 right-2 flex items-center space-x-1">
                              {/* Video button - only visible on hover */}
                              <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                {onGetVideoIcon(day, mealType)}
                              </div>
                              
                              {/* Edit button - always visible when text exists */}
                              <button
                                type="button"
                                onClick={() => onFocusMealInput(day, mealType, 'desktop')}
                                className="p-1 hover:bg-gray-200 rounded opacity-40 hover:opacity-100 transition-all duration-200"
                                title="Edit meal"
                              >
                                <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                              </button>
                            </div>
                          )}
                          
                          {/* Tooltip for meal name */}
                          {hasText && (
                            <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs break-words shadow-lg">
                              <div className="text-white">
                                {mealName}
                              </div>
                              <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {DAYS_OF_WEEK.map((day, index) => {
          const dayDate = new Date(currentWeek);
          dayDate.setDate(currentWeek.getDate() + index);
          const isLastDay = index === DAYS_OF_WEEK.length - 1;
          
          return (
            <div key={day} className={isLastDay ? '' : 'border-b border-gray-200'}>
              {/* Day Header */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <div className="text-lg font-bold text-gray-900">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {format(dayDate, 'MMM d')}
                </div>
              </div>
              
              {/* Meals Table-like Layout */}
              <div className="divide-y divide-gray-200">
                {enabledMealTypes.map((mealType, mealIndex) => {
                  const meal = meals[day]?.[mealType];
                  const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
                  const hasText = mealName.trim().length > 0;
                  const isLastMeal = mealIndex === enabledMealTypes.length - 1;
                  
                  return (
                    <div key={mealType} className={`px-4 py-3 hover:bg-gray-50/50 ${isLastMeal ? '' : 'border-b border-gray-100'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {getMealDisplayName(mealType)}
                          </label>
                          <div className="relative group">
                            <input
                              id={`meal-input-mobile-${day}-${mealType}`}
                              type="text"
                              value={mealName}
                              onChange={(e) => onUpdateMeal(day, mealType, e.target.value)}
                              placeholder={`Enter ${getMealPlaceholder(mealType)}...`}
                              className={`text-black w-full px-0 py-1 pr-16 bg-transparent border-0 focus:outline-none focus:bg-blue-50/30 transition-all duration-200 ${
                                savingMeals.has(`${day}-${mealType}`) 
                                  ? 'bg-blue-50' 
                                  : ''
                              }`}
                            />
                            
                            {/* Loading spinner */}
                            {savingMeals.has(`${day}-${mealType}`) && (
                              <div className="absolute inset-y-0 right-0 flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            
                            {/* Action buttons - only show when there's text */}
                            {hasText && !savingMeals.has(`${day}-${mealType}`) && (
                              <div className="absolute inset-y-0 right-0 flex items-center space-x-1">
                                {/* Video button - only visible on hover */}
                                <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  {onGetVideoIcon(day, mealType)}
                                </div>
                                
                                {/* Edit button - always visible when text exists */}
                                <button
                                  type="button"
                                  onClick={() => onFocusMealInput(day, mealType, 'mobile')}
                                  className="p-1 hover:bg-gray-200 rounded opacity-40 hover:opacity-100 transition-all duration-200"
                                  title="Edit meal"
                                >
                                  <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                                </button>
                              </div>
                            )}
                            
                            {/* Tooltip for meal name */}
                            {hasText && (
                              <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs break-words shadow-lg">
                                <div className="text-white">
                                  {mealName}
                                </div>
                                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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