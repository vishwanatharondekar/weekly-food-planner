'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { format, addWeeks, subWeeks, addDays, isToday, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, Trash2, X, FileDown, ShoppingCart, ChefHat, Calendar, Pencil } from 'lucide-react';
import { mealsAPI, aiAPI, authAPI } from '@/lib/api';
import { DAYS_OF_WEEK, getWeekStartDate, formatDate, debounce, getMealDisplayName, getMealPlaceholder, DEFAULT_MEAL_SETTINGS, type MealSettings, ALL_MEAL_TYPES, getPlanUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import { generateMealPlanPDF, generateShoppingListPDF } from '@/lib/pdf-generator';
import { saveVideoURLForRecipe } from '@/lib/video-url-utils';
import FullScreenLoader from './FullScreenLoader';
import PreferencesEditModal from './PreferencesEditModal';
import GuestUpgradeModal from './GuestUpgradeModal';
import YouTubeVideoSearch from './YouTubeVideoSearch';
import { analytics, AnalyticsEvents } from '@/lib/analytics';
import { isGuestUser, getRemainingGuestUsage, hasExceededGuestLimit } from '@/lib/guest-utils';

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
      calories?: number;
    };
  };
}

interface MealPlannerProps {
  user: any;
  continueFromOnboarding?: boolean;
  onUserUpdate?: (updatedUser: any) => void;
  initialWeek?: Date;
  todaysMealsAvailable?: boolean;
}

export default function MealPlanner({ user, continueFromOnboarding = false, onUserUpdate, initialWeek, todaysMealsAvailable = false }: MealPlannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [currentWeek, setCurrentWeek] = useState(initialWeek || getWeekStartDate(new Date()));
  const [meals, setMeals] = useState<MealDataWithVideos>({});
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ hasHistory: false, canGenerate: false });
  const [mealSettings, setMealSettings] = useState<MealSettings>(DEFAULT_MEAL_SETTINGS);
  const [savingMeals, setSavingMeals] = useState<Set<string>>(new Set()); // Track which meals are being saved
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{day: string, mealType: string} | null>(null);
  const [userLanguage, setUserLanguage] = useState<string>('en'); // Default to English
  const [editingMeal, setEditingMeal] = useState<{day: string, mealType: string} | null>(null); // Track which meal is being edited
  
  // Mode switching state
  const [currentMode, setCurrentMode] = useState<'plan' | 'cook'>('plan');
  const [todaysMeals, setTodaysMeals] = useState({});
  const [initialModeSet, setInitialModeSet] = useState(false);
  
  // Cook mode independent data
  const [cookModeData, setCookModeData] = useState<MealDataWithVideos>({});
  const [cookModeLoading, setCookModeLoading] = useState(false);
  
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

  // Preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalType, setUpgradeModalType] = useState<'ai' | 'shopping_list'>('ai');
  const [showNoEmptySlotsModal, setShowNoEmptySlotsModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

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

  // Handle URL changes for /plan/[weekStartDate] routes
  useEffect(() => {
    if (pathname?.startsWith('/plan/') && initialWeek) {
      // Update currentWeek when the URL changes
      setCurrentWeek(initialWeek);
    }
  }, [pathname, initialWeek]);

  // Auto-generate meals for new users with cuisine preferences
  useEffect(() => {
    if (continueFromOnboarding) {
      // Small delay to ensure everything is loaded
      const timer = setTimeout(() => {
        // Check guest limits for onboarding flow too
        if (isGuestUser(user?.id) && hasExceededGuestLimit('ai', user)) {
          console.log('Guest user has exceeded AI limit during onboarding flow');
          setUpgradeModalType('ai');
          setShowUpgradeModal(true);
          return;
        }
        performAIGeneration();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [continueFromOnboarding]);
  

  // Handle todaysMealsAvailable prop from URL query parameter
  useEffect(() => {
    if (todaysMealsAvailable && !initialModeSet) {
      setCurrentMode('cook');
      setInitialModeSet(true);
    }
  }, [todaysMealsAvailable, initialModeSet]);

  // Load cook mode data when switching to cook mode
  useEffect(() => {
    if (currentMode === 'cook') {
      loadCookModeData();
    }
  }, [currentMode]);

  // Refresh cook mode data when user switches to cook mode (in case data changed)
  const refreshCookModeData = () => {
    if (currentMode === 'cook') {
      loadCookModeData();
    }
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
            let calories: number | undefined = undefined;
            
            if (typeof meal === 'string') {
              mealName = meal;
            } else if (typeof meal === 'object') {
              if (meal.name) {
                mealName = meal.name;
                calories = meal.calories;
              } else {
                // Fallback: convert to string if it's an object
                mealName = String(meal);
              }
            }
            
            // Look up video URL for this recipe
            const normalizedRecipeName = mealName.toLowerCase().trim();
            const videoUrl = userVideoURLs[normalizedRecipeName];
            
            convertedMeals[day][mealType] = {
              name: mealName,
              videoUrl: videoUrl || undefined,
              calories: calories
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

  const loadCookModeData = async () => {
    try {
      setCookModeLoading(true);
      
      // Get today's date and current week
      const today = new Date();
      const weekStart = getWeekStartDate(today);
      const weekStartString = formatDate(weekStart);
      
      // Fetch the current week's meal plan
      const response = await mealsAPI.getWeekMeals(weekStartString);
      
      // Load user's video URLs
      let userVideoURLs: { [recipeName: string]: string } = {};
      try {
        userVideoURLs = await authAPI.getVideoURLs();
      } catch (error) {
        console.warn('Failed to load user video URLs for cook mode:', error);
      }
      
      // Convert to new format with video URLs
      const convertedMeals: MealDataWithVideos = {};
      DAYS_OF_WEEK.forEach(day => {
        convertedMeals[day] = {};
        ALL_MEAL_TYPES.forEach(mealType => {
          const meal = response.meals[day]?.[mealType];
          if (meal) {
            // Handle different meal data formats
            let mealName = '';
            let calories: number | undefined = undefined;
            
            if (typeof meal === 'string') {
              mealName = meal;
            } else if (typeof meal === 'object') {
              if (meal.name) {
                mealName = meal.name;
                calories = meal.calories;
              } else {
                mealName = String(meal);
              }
            }
            
            // Look up video URL for this recipe
            const normalizedRecipeName = mealName.toLowerCase().trim();
            const videoUrl = userVideoURLs[normalizedRecipeName];
            
            convertedMeals[day][mealType] = {
              name: mealName,
              ...(videoUrl && { videoUrl }),
              ...(calories && { calories })
            };
          }
        });
      });
      
      setCookModeData(convertedMeals);
    } catch (error) {
      console.error('Error loading cook mode data:', error);
      toast.error('Failed to load today\'s meals');
    } finally {
      setCookModeLoading(false);
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
    // Clear calories when user edits the meal (backend will remove it too)
    setMeals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: {
          ...prev[day]?.[mealType],
          name: value,
          calories: undefined // Clear calories on user edit
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

  const startEditingMeal = (day: string, mealType: string, formFactor?: 'mobile' | 'desktop') => {
    setEditingMeal({ day, mealType });
    // Small delay to ensure input/textarea is rendered before focusing
    setTimeout(() => {
      const inputId = formFactor ? `meal-input-${formFactor}-${day}-${mealType}` : `meal-input-${day}-${mealType}`;
      const inputElement = document.getElementById(inputId) as HTMLInputElement | HTMLTextAreaElement;
      if (inputElement) {
        inputElement.focus();
        // Move cursor to end of text
        const length = inputElement.value.length;
        inputElement.setSelectionRange(length, length);
        
        // For textarea, scroll to bottom to show cursor position
        if (inputElement instanceof HTMLTextAreaElement) {
          inputElement.scrollTop = inputElement.scrollHeight;
        }
      }
    }, 50);
  };

  const stopEditingMeal = () => {
    setEditingMeal(null);
  };

  const focusMealInput = (day: string, mealType: string, formFactor?: string) => {
    startEditingMeal(day, mealType);
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

  // Function to check if there are empty slots in the meal plan
  const hasEmptySlots = () => {
    for (const day of DAYS_OF_WEEK) {
      for (const mealType of mealSettings.enabledMealTypes) {
        const meal = meals[day]?.[mealType];
        const mealName = meal ? (typeof meal === 'string' ? meal : (meal.name || '')) : '';
        if (!mealName.trim()) {
          return true; // Found at least one empty slot
        }
      }
    }
    return false; // No empty slots found
  };

  const generateAIMeals = () => {
    console.log('AI button clicked - checking for empty slots first');
    
    // First check if there are empty slots
    if (!hasEmptySlots()) {
      setShowNoEmptySlotsModal(true);
      return;
    }
    
    console.log('Empty slots found - checking guest limits');
    
    // Check guest usage limits before opening preferences modal
    if (isGuestUser(user?.id)) {
      if (hasExceededGuestLimit('ai', user)) {
        setUpgradeModalType('ai');
        setShowUpgradeModal(true);
        return;
      }
      
        const remaining = getRemainingGuestUsage('ai', user);
        if (remaining <= 1) {
          toast.success(`You have ${remaining} AI generation${remaining === 1 ? '' : 's'} remaining as a guest user. Sign in for unlimited access!`);
        }
    }
    
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
          is_guest: isGuestUser(user?.id),
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
        for (const [mealType, mealData] of Object.entries(dayMeals as any)) {
          // Only update if the meal type is enabled in settings
          if (mealSettings.enabledMealTypes.includes(mealType)) {
            const currentMeal = meals[day]?.[mealType]?.name || '';
          if (!currentMeal.trim()) {
            // Handle both string and object formats
            let mealName: string;
            let calories: number | undefined = undefined;
            
            if (typeof mealData === 'string') {
              mealName = mealData;
            } else if (typeof mealData === 'object' && mealData !== null && 'name' in mealData) {
              mealName = (mealData as any).name;
              calories = (mealData as any).calories;
            } else {
              mealName = String(mealData);
            }
            
            // Check if there's a saved video URL for this recipe
            let videoUrl: string | undefined = undefined;
            try {
              const normalizedRecipeName = mealName.toLowerCase().trim();
              videoUrl = userVideoURLs[normalizedRecipeName];
            } catch (error) {
              console.warn('Failed to check for video URL:', error);
            }

            // Update local state
            updatedMeals[day] = {
              ...updatedMeals[day],
                [mealType]: {
                  name: mealName,
                  videoUrl: videoUrl,
                  calories: calories
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
      
      // Refresh user data to get updated usage counts for guest users
      if (isGuestUser(user?.id) && onUserUpdate) {
        try {
          const response = await authAPI.getProfile();
          onUserUpdate(response.user);
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      }
    } catch (error: any) {
      console.error('Error generating AI meals:', error);
      hideFullScreenLoader();
      
      // Handle guest limit reached error
      if (error.message && error.message.includes('Guest users are limited to')) {
        toast.error(error.message);
      } else {
        toast.error(error.message || 'Failed to generate AI suggestions');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearMeals = () => {
    // Show custom confirmation modal instead of browser dialog
    setShowClearModal(true);
  };

  const handleClearConfirm = async () => {
    setShowClearModal(false);
    
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
    const newWeek = direction === 'prev' ? subWeeks(currentWeek, 1) : addWeeks(currentWeek, 1);
    
    // Track navigation event
    analytics.trackEvent({
      action: AnalyticsEvents.NAVIGATION.WEEK_CHANGE,
      category: 'navigation',
      custom_parameters: {
        direction,
        from_week: formatDate(currentWeek),
        to_week: formatDate(newWeek),
        user_id: user?.id,
      },
    });
    
    // Check if we're on a /plan/[weekStartDate] route
    if (pathname?.startsWith('/plan/')) {
      // Navigate to the new week URL
      router.push(getPlanUrl(newWeek));
    } else {
      // For /app route, just update the state
      setCurrentWeek(newWeek);
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
      // Check guest usage limits before proceeding
      if (isGuestUser(user?.id)) {
        if (hasExceededGuestLimit('shopping_list', user)) {
          setUpgradeModalType('shopping_list');
          setShowUpgradeModal(true);
          return;
        }
        
        const remaining = getRemainingGuestUsage('shopping_list', user);
        if (remaining <= 1) {
          toast.success(`You have ${remaining} shopping list generation${remaining === 1 ? '' : 's'} remaining as a guest user. Sign in for unlimited access!`);
        }
      }

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
          is_guest: isGuestUser(user?.id),
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
      
      // Refresh user data to get updated usage counts for guest users
      if (isGuestUser(user?.id) && onUserUpdate) {
        try {
          const response = await authAPI.getProfile();
          onUserUpdate(response.user);
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      }
    } catch (error: any) {
      console.error('Error generating shopping list:', error);
      hideFullScreenLoader();
      
      // Handle guest limit reached error
      if (error.message && error.message.includes('Guest users are limited to')) {
        toast.error(error.message);
      } else {
        toast.error('Failed to generate shopping list');
      }
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
    
    // Use cook mode data if available, otherwise fall back to plan data
    const todaysMealsData = cookModeData[todayDay] || todaysMeals;
    
    return {
      day: todayDay,
      date: today,
      meals: todaysMealsData
    };
  };


  return (
    <div className="min-h-screen bg-gradient-to-br ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="space-y-6">

        {/* Mode Switcher - Chrome-like Full Width Tabs */}
        {!continueFromOnboarding && <div className="w-full bg-white/80 backdrop-blur-sm shadow-lg border border-slate-200 border-b-0">
          <div className="flex">
            {/* Cook Mode Tab - Left Side */}
            <button
              onClick={switchToCookMode}
              className={`relative flex-1 flex items-center justify-center px-2 py-4 text-sm font-medium transition-all duration-200 ${
                currentMode === 'cook'
                  ? 'bg-white text-gray-900 border-b-2 border-orange-500'
                  : 'bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                  
              }`}
            >
              {/* Angled cut for active tab */}
              {currentMode === 'cook' && (
                <div className="absolute right-0 top-0 w-0 h-0 border-l-[20px] border-l-white border-t-[40px] border-t-transparent"></div>
              )}
              
              <ChefHat className="w-4 h-4 mr-2" />
              Today's Menu
            </button>
            
            {/* Plan Mode Tab - Right Side */}
            <button
              onClick={switchToPlanMode}
              className={`relative flex-1 flex items-center justify-center px-4 py-4 text-sm font-medium transition-all duration-200 ${
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
        {(!continueFromOnboarding && currentMode === 'cook') && !cookModeLoading && (
          <CookModeView 
            todaysData={getTodaysMeals()}
            mealSettings={mealSettings}
            onVideoClick={openVideoModal}
          />
        )}
        
        {/* Cook Mode Loading */}
        {(!continueFromOnboarding && currentMode === 'cook') && cookModeLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading today's menu...</p>
            </div>
          </div>
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
            user={user}
            editingMeal={editingMeal}
            onNavigateWeek={navigateWeek}
            onGenerateAIMeals={generateAIMeals}
            onGeneratePDF={handleGeneratePDF}
            onGenerateShoppingList={handleGenerateShoppingList}
            onClearMeals={clearMeals}
            onUpdateMeal={updateMeal}
            onStartEditingMeal={startEditingMeal}
            onStopEditingMeal={stopEditingMeal}
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

      {/* Guest Upgrade Modal */}
      <GuestUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onSuccess={(token, upgradedUser) => {
          // Update the user state with the new registered user
          if (onUserUpdate) {
            onUserUpdate(upgradedUser);
          }
          setShowUpgradeModal(false);
        }}
        limitType={upgradeModalType}
        currentUsage={upgradeModalType === 'ai' ? (user?.aiUsageCount || 0) : (user?.shoppingListUsageCount || 0)}
        usageLimit={upgradeModalType === 'ai' ? (user?.guestUsageLimits?.aiGeneration || 3) : (user?.guestUsageLimits?.shoppingList || 3)}
      />

      {/* No Empty Slots Modal */}
      {showNoEmptySlotsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    No Empty Slots Available
                  </h3>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  AI will be used only for filling empty slots. Clear the complete plan if you wish to regenerate the whole plan.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowNoEmptySlotsModal(false)}
                  className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Clear All Meals
                  </h3>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-sm text-gray-600">
                  Are you sure you want to clear all meals for this week? This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearConfirm}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  onRefresh?: () => void;
}

function CookModeView({ todaysData, mealSettings, onVideoClick, onRefresh }: CookModeViewProps) {
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
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              title="Refresh today's menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm">Refresh</span>
            </button>
          )}
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
              const calories = meal && typeof meal === 'object' ? meal.calories : undefined;
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
                      {calories && (
                        <div className="flex items-center text-sm text-orange-600">
                          <span className="mr-1">📊</span>
                          <span className="font-semibold">{calories} kcal</span>
                        </div>
                      )}
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
  user: any;
  editingMeal: {day: string, mealType: string} | null;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
  onGenerateAIMeals: () => void;
  onGeneratePDF: () => void;
  onGenerateShoppingList: () => void;
  onClearMeals: () => void;
  onUpdateMeal: (day: string, mealType: string, value: string) => void;
  onStartEditingMeal: (day: string, mealType: string, formFactor?: 'mobile' | 'desktop') => void;
  onStopEditingMeal: () => void;
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
  user,
  editingMeal,
  onNavigateWeek,
  onGenerateAIMeals,
  onGeneratePDF,
  onGenerateShoppingList,
  onClearMeals,
  onUpdateMeal,
  onStartEditingMeal,
  onStopEditingMeal,
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
  // Helper function to get meal type pill colors
  const getMealTypePillClasses = (mealType: string) => {
    const colorMap: { [key: string]: string } = {
      'breakfast': 'bg-amber-100 text-amber-700',
      'lunch': 'bg-green-100 text-green-700',
      'dinner': 'bg-blue-100 text-blue-700',
      'snack': 'bg-purple-100 text-purple-700',
      'snack1': 'bg-purple-100 text-purple-700',
      'snack2': 'bg-pink-100 text-pink-700',
    };
    return colorMap[mealType] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-2">
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

      {/* Action Buttons - Sticky on Mobile */}
      <div className="md:hidden sticky top-16 z-40 bg-gradient-to-r from-slate-50 to-blue-50 backdrop-blur-sm px-4 py-3 border-b border-slate-200 shadow-md">
        <div className="flex items-center space-x-2 w-full">
          {/* 1. Fill with AI */}
          <button
            onClick={onGenerateAIMeals}
            disabled={loading}
            className="flex flex-col items-center justify-center flex-1 px-2 py-2 text-sm font-medium text-purple-700 bg-white hover:bg-slate-50 border border-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-purple-600 mb-1" />
            <span className="text-xs">AI</span>
            {isGuestUser(user?.id) && (
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                {getRemainingGuestUsage('ai', user)}
              </span>
            )}
          </button>
          
          {/* 2. Download PDF */}
          <button
            onClick={onGeneratePDF}
            className="flex flex-col items-center justify-center flex-1 px-2 py-2 text-sm font-medium text-blue-700 bg-white hover:bg-slate-50 border border-blue-200 rounded-lg transition-colors shadow-sm"
          >
            <FileDown className="w-4 h-4 text-blue-600 mb-1" />
            <span className="text-xs">PDF</span>
          </button>
          
          {/* 3. Shopping List */}
          <button
            onClick={onGenerateShoppingList}
            disabled={loading}
            className="flex flex-col items-center justify-center flex-1 px-2 py-2 text-sm font-medium text-green-700 bg-white hover:bg-slate-50 border border-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative shadow-sm"
          >
            <ShoppingCart className="w-4 h-4 text-green-600 mb-1" />
            <span className="text-xs">List</span>
            {isGuestUser(user?.id) && (
              <span className="absolute -top-1 -right-1 bg-green-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                {getRemainingGuestUsage('shopping_list', user)}
              </span>
            )}
          </button>
          
          {/* 4. Clear Week */}
          <button
            onClick={onClearMeals}
            disabled={loading}
            className="flex flex-col items-center justify-center flex-1 px-2 py-2 text-sm font-medium text-red-700 bg-white hover:bg-slate-50 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Trash2 className="w-4 h-4 text-red-600 mb-1" />
            <span className="text-xs">Clear</span>
          </button>
        </div>
      </div>

      {/* Meal Planning Table */}
      <div className="bg-white/80 backdrop-blur-sm shadow-xl rounded-xl overflow-hidden border border-slate-200">
      {/* Action Buttons - Desktop Only */}
      <div className="hidden md:block bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            {/* 1. Fill with AI */}
            <button
              onClick={onGenerateAIMeals}
              disabled={loading}
              className="flex flex-row items-center justify-center px-4 py-2 text-sm font-medium text-purple-700 bg-slate-50 hover:bg-slate-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
              <span className="text-sm">AI</span>
              {isGuestUser(user?.id) && (
                <span className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {getRemainingGuestUsage('ai', user)}
                </span>
              )}
            </button>
            
            {/* 2. Download PDF */}
            <button
              onClick={onGeneratePDF}
              className="flex flex-row items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-slate-50 hover:bg-slate-100 border border-blue-200 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm">PDF</span>
            </button>
            
            {/* 3. Shopping List */}
            <button
              onClick={onGenerateShoppingList}
              disabled={loading}
              className="flex flex-row items-center justify-center px-4 py-2 text-sm font-medium text-green-700 bg-slate-50 hover:bg-slate-100 border border-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <ShoppingCart className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm">List</span>
              {isGuestUser(user?.id) && (
                <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {getRemainingGuestUsage('shopping_list', user)}
                </span>
              )}
            </button>
            
            {/* 4. Clear Week */}
            <button
              onClick={onClearMeals}
              disabled={loading}
              className="flex flex-row items-center justify-center px-4 py-2 text-sm font-medium text-red-700 bg-slate-50 hover:bg-slate-100 border border-red-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-sm">Clear</span>
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
                    const calories = meal && typeof meal === 'object' ? meal.calories : undefined;
                    const hasText = mealName.trim().length > 0;
                    const showCalorieInfo = user?.dietaryPreferences?.showCalories && calories;
                    const isEditing = editingMeal?.day === day && editingMeal?.mealType === mealType;
                    
                    return (
                      <td key={mealType} className="px-0 py-0 border-r border-gray-300 last:border-r-0 align-top">
                        <div className="relative group">
                          {isEditing ? (
                            // Show textarea when editing
                            <textarea
                              id={`meal-input-desktop-${day}-${mealType}`}
                              value={mealName}
                              onChange={(e) => onUpdateMeal(day, mealType, e.target.value)}
                              onBlur={(e) => {
                                // Delay blur to allow button clicks to complete
                                setTimeout(() => onStopEditingMeal(), 100);
                              }}
                              placeholder={`Enter ${getMealPlaceholder(mealType)}...`}
                              rows={2}
                              className={`text-black w-full px-6 py-3 pr-16 bg-transparent focus:outline-none focus:bg-blue-50/30 transition-all duration-200 resize-none leading-relaxed border-2 border-blue-400 rounded ${
                                savingMeals.has(`${day}-${mealType}`) 
                                  ? 'bg-blue-50' 
                                  : ''
                              }`}
                            />
                          ) : !hasText ? (
                            // Show placeholder state when empty and not editing
                            <div 
                              className="w-full px-6 py-3 pr-16 transition-all duration-200 min-h-[60px] flex items-center text-gray-400 italic"
                            >
                              Click edit to add meal
                            </div>
                          ) : (
                            // Show display div when has content and not editing
                            <div 
                              className="text-black w-full px-6 py-3 pr-16 transition-all duration-200 min-h-[60px] flex items-center"
                            >
                              <span className="line-clamp-2 leading-relaxed break-words">{mealName}</span>
                            </div>
                          )}
                          
                          {/* Calorie badge - top right, separate from action buttons */}
                          {showCalorieInfo && hasText && (
                            <div className="absolute top-0 right-0 bg-orange-50 text-orange-600 text-[10px] font-medium px-1.5 py-0.5 rounded border border-orange-200">
                              {calories} kcal
                            </div>
                          )}
                          
                          {/* Loading spinner */}
                          {savingMeals.has(`${day}-${mealType}`) && (
                            <div className="absolute inset-y-0 right-4 flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                            </div>
                          )}
                          
                          {/* Action buttons - show when not editing */}
                          {!isEditing && !savingMeals.has(`${day}-${mealType}`) && (
                            <div className="absolute top-4 right-2 flex items-center space-x-1 pt-1">
                              {/* Video button - only show when there's text and only visible on hover */}
                              {hasText && (
                                <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  {onGetVideoIcon(day, mealType)}
                                </div>
                              )}
                              
                              {/* Edit button - always visible */}
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault(); // Prevent input blur
                                }}
                                onClick={() => onStartEditingMeal(day, mealType, 'desktop')}
                                className="p-1 hover:bg-gray-200 rounded opacity-40 hover:opacity-100 transition-all duration-200"
                                title="Edit meal"
                              >
                                <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                              </button>
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
                  const calories = meal && typeof meal === 'object' ? meal.calories : undefined;
                  const hasText = mealName.trim().length > 0;
                  const showCalorieInfo = user?.dietaryPreferences?.showCalories && calories;
                  const isLastMeal = mealIndex === enabledMealTypes.length - 1;
                  const isEditing = editingMeal?.day === day && editingMeal?.mealType === mealType;
                  
                  return (
                    <div key={mealType} className={`px-4 py-3 hover:bg-gray-50/50 ${isLastMeal ? '' : 'border-b border-gray-100'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">

                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-2 mr-2 ${getMealTypePillClasses(mealType)}`}>
                            {getMealDisplayName(mealType)}
                          </div>
                          {/* Calorie badge - next to meal name for mobile */}
                          {showCalorieInfo && hasText && (
                              <span className="bg-orange-50 text-orange-600 text-xs font-medium px-2 py-0.5 rounded border border-orange-200">
                                {calories} kcal
                              </span>
                            )}
                          <div className="relative group">
                            {isEditing ? (
                              // Show textarea when editing
                              <textarea
                                id={`meal-input-mobile-${day}-${mealType}`}
                                value={mealName}
                                onChange={(e) => onUpdateMeal(day, mealType, e.target.value)}
                                onBlur={(e) => {
                                  // Delay blur to allow button clicks to complete
                                  setTimeout(() => onStopEditingMeal(), 100);
                                }}
                                placeholder={`Enter ${getMealPlaceholder(mealType)}...`}
                                rows={2}
                                className={`text-black w-full px-2 py-1 pr-16 bg-transparent focus:outline-none focus:bg-blue-50/30 transition-all duration-200 resize-none leading-relaxed border-2 border-blue-400 rounded ${
                                  savingMeals.has(`${day}-${mealType}`) 
                                    ? 'bg-blue-50' 
                                    : ''
                                }`}
                              />
                            ) : !hasText ? (
                              // Show placeholder state when empty and not editing
                              <div 
                                className="w-full px-0 py-1 pr-16 transition-all duration-200 rounded min-h-[32px] text-gray-400 italic"
                              >
                                Click edit to add meal
                              </div>
                            ) : (
                              // Show display div when has content and not editing
                              <div 
                                className="text-black w-full px-0 py-1 pr-16 transition-all duration-200 rounded min-h-[32px]"
                              >
                                <span className="line-clamp-2 leading-relaxed break-words block">{mealName}</span>
                              </div>
                            )}
                            
                            {/* Loading spinner */}
                            {savingMeals.has(`${day}-${mealType}`) && (
                              <div className="absolute top-1 right-0 flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            
                            {/* Action buttons - show when not editing */}
                            {!isEditing && !savingMeals.has(`${day}-${mealType}`) && (
                              <div className="absolute top-0 right-0 flex items-center space-x-1">
                                {/* Video button - only show when there's text */}
                                {hasText && (
                                  <div className="p-1">
                                    {onGetVideoIcon(day, mealType)}
                                  </div>
                                )}
                                
                                {/* Edit button - always visible */}
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onStartEditingMeal(day, mealType, 'mobile');
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded opacity-60 hover:opacity-100 transition-all duration-200"
                                  title="Edit meal"
                                >
                                  <Pencil className="h-4 w-4 text-gray-500 hover:text-gray-700" />
                                </button>
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
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [showPreview, setShowPreview] = useState(!!currentVideoUrl);

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

  const handleVideoSelect = async (video: any) => {
    setVideoUrl(video.url);
    // Automatically save and close the modal
    await onSave(video.url);
  };


  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = extractVideoId(videoUrl);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 p-2 sm:p-0">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-6xl w-full max-h-[calc(100vh-16px)] sm:max-h-[85vh] overflow-hidden mt-2 sm:mt-0">
        {/* Modal Title */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center h-8 flex items-center justify-center overflow-hidden">
            <span className="truncate">
              Video for {mealName}
            </span>
          </h2>
          <div className="border-b border-gray-200"></div>
        </div>

        {/* Instruction Text */}
        {!showPreview && (
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              Select or manually add video URL to save against this meal
            </p>
          </div>
        )}

        {/* Tab Navigation */}
        {!showPreview && (
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Search Videos
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'manual'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Enter URL Manually
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[calc(100vh-360px)] sm:max-h-[calc(85vh-280px)]">
          {showPreview && videoId ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Saved Video for <span className="font-medium text-gray-800">{mealName}</span>
                </p>
              </div>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-sm">
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
              
              {/* Separator */}
              <div className="border-t border-gray-200"></div>
              
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Replace video by selecting from options or adding manually
                  </p>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('search')}
                    className={`px-4 py-2 font-medium text-sm ${
                      activeTab === 'search'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Search Videos
                  </button>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={`px-4 py-2 font-medium text-sm ${
                      activeTab === 'manual'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Enter URL Manually
                  </button>
                </div>
                
                {/* Tab Content */}
                {activeTab === 'search' ? (
                  <YouTubeVideoSearch
                    onVideoSelect={handleVideoSelect}
                    initialQuery={mealName}
                  />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        YouTube Video URL for {mealName}:
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
                      <div>
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
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'search' ? (
            <YouTubeVideoSearch
              onVideoSelect={handleVideoSelect}
              initialQuery={mealName}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube Video URL for {mealName}:
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
                <div>
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
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end mt-4 sm:mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          {activeTab === 'manual' && (
            <button
              onClick={handleSave}
              disabled={saving || !videoUrl.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Video'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 