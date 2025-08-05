'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, Trash2, Leaf, X, FileDown, ShoppingCart, Settings } from 'lucide-react';
import { mealsAPI, aiAPI, authAPI } from '@/lib/api';
import { DAYS_OF_WEEK, getWeekStartDate, formatDate, debounce, getMealDisplayName, getMealPlaceholder, DEFAULT_MEAL_SETTINGS, type MealSettings, ALL_MEAL_TYPES } from '@/lib/utils';
import toast from 'react-hot-toast';
import DietaryPreferences from './DietaryPreferences';
import MealSettingsComponent from './MealSettings';
import { generateMealPlanPDF, generateShoppingListPDF } from '@/lib/pdf-generator';
import { saveVideoURLForRecipe } from '@/lib/video-url-utils';
import VideoURLManager from './VideoURLManager';

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
  const [showDietaryPreferences, setShowDietaryPreferences] = useState(false);
  const [showMealSettings, setShowMealSettings] = useState(false);
  const [mealSettings, setMealSettings] = useState<MealSettings>(DEFAULT_MEAL_SETTINGS);
  const [savingMeals, setSavingMeals] = useState<Set<string>>(new Set()); // Track which meals are being saved
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{day: string, mealType: string} | null>(null);
  const [showVideoURLManager, setShowVideoURLManager] = useState(false);

  useEffect(() => {
    loadMealSettings();
  }, []);

  useEffect(() => {
    loadMeals();
    checkAIStatus();
  }, [currentWeek]);

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

  const handleMealSettingsChange = (newSettings: MealSettings) => {
    setMealSettings(newSettings);
    // Reload meals to reflect new structure
    loadMeals();
  };

  const loadMeals = async () => {
    try {
      setLoading(true);
      const weekStart = formatDate(currentWeek);
      const response = await mealsAPI.getWeekMeals(weekStart);
      
      console.log('Raw meal data from API:', response.meals);
      
      // Load user's video URLs
      let userVideoURLs: { [recipeName: string]: string } = {};
      try {
        userVideoURLs = await authAPI.getVideoURLs();
        console.log('User video URLs loaded:', userVideoURLs);
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
      
      console.log('Converted meals:', convertedMeals);
      setMeals(convertedMeals);
    } catch (error) {
      console.error('Error loading meals:', error);
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

  const updateMeal = async (day: string, mealType: string, value: string) => {
    // Check if there's a saved video URL for this recipe
    let videoUrl: string | undefined = undefined;
    if (value.trim()) {
      try {
        const userVideoURLs = await authAPI.getVideoURLs();
        const normalizedRecipeName = value.toLowerCase().trim();
        videoUrl = userVideoURLs[normalizedRecipeName];
      } catch (error) {
        console.warn('Failed to check for video URL:', error);
      }
    }

    // Update local state immediately for responsive UI
    setMeals(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: {
          ...prev[day]?.[mealType],
          name: value,
          videoUrl: videoUrl
        }
      }
    }));

    // Debounce the API call
    debouncedUpdateMeal(day, mealType, value);
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
      const weekStart = formatDate(currentWeek);
      const suggestions = await aiAPI.generateMeals(weekStart);
      
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
      
      toast.success('AI meal suggestions applied to empty slots!');
      await checkAIStatus();
    } catch (error: any) {
      console.error('Error generating AI meals:', error);
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
      const weekStart = formatDate(currentWeek);
      await mealsAPI.clearWeekMeals(weekStart);
      setMeals({});
      toast.success('All meals cleared for this week!');
      await checkAIStatus(); // Re-check AI status after clearing
    } catch (error) {
      console.error('Error clearing meals:', error);
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

    await generateMealPlanPDF({
      weekStartDate: formatDate(currentWeek),
      meals: pdfMeals,
      userInfo: user,
      mealSettings,
      videoURLs
    });
  };

  const handleGenerateShoppingList = async () => {
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

    await generateShoppingListPDF({
      weekStartDate: formatDate(currentWeek),
      meals: pdfMeals,
      userInfo: user,
      mealSettings,
      videoURLs
    });
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <h1 className="text-3xl font-bold text-gray-900">Weekly Meal Planner</h1>
          
          <div className="flex flex-wrap items-center gap-2">
            {aiStatus.canGenerate && (
              <button
                onClick={generateAIMeals}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {loading ? 'Generating...' : 'Fill Food with AI'}
              </button>
            )}
            
              <button
                onClick={clearMeals}
                disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Week
              </button>
            
              <button
                onClick={() => setShowDietaryPreferences(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Dietary Preferences
              </button>
            <button
              onClick={() => setShowMealSettings(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Settings className="w-4 h-4 mr-2" />
              Meal Settings
            </button>
            <button
              onClick={handleGeneratePDF}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={handleGenerateShoppingList}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Shopping List
            </button>
            <button
              onClick={() => setShowVideoURLManager(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              🎥
              <span className="ml-2">Video URLs</span>
            </button>
          </div>
            </div>
            
        {/* Week Navigation */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
              <button
                onClick={() => navigateWeek('prev')}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous Week
              </button>
          
          <h2 className="text-lg font-semibold text-gray-900">
            {format(currentWeek, 'MMMM d')} - {format(addWeeks(currentWeek, 1), 'MMMM d, yyyy')}
          </h2>
          
              <button
                onClick={() => navigateWeek('next')}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
            Next Week
            <ChevronRight className="w-4 h-4 ml-1" />
              </button>
        </div>

        {/* Status Messages */}
        {!aiStatus.hasHistory && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Welcome to AI Meal Planning!
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Plan at least one week of meals to unlock AI suggestions that will help you create varied and delicious meal plans based on your preferences.
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

        {/* Meal Table */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Day
                  </th>
                  {enabledMealTypes.map(mealType => (
                    <th key={mealType} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </div>
                        <div className="text-sm text-gray-500">
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
                                return String(meal);
                              })()}
                              onChange={(e) => updateMeal(day, mealType, e.target.value)}
                              placeholder={`Enter ${getMealPlaceholder(mealType)}...`}
                              className={`w-full px-3 py-2 pr-16 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                                savingMeals.has(`${day}-${mealType}`) 
                                  ? 'border-blue-300 bg-blue-50' 
                                  : 'border-gray-300'
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
        
        {/* Meal Settings Modal */}
        {showMealSettings && (
          <MealSettingsComponent
            user={user}
            onSettingsChange={handleMealSettingsChange}
            onClose={() => setShowMealSettings(false)}
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

        {/* Dietary Preferences Modal */}
        {showDietaryPreferences && (
          <DietaryPreferences
            user={user}
            onClose={() => setShowDietaryPreferences(false)}
          />
        )}

        {/* Video URL Manager */}
        <VideoURLManager
          isOpen={showVideoURLManager}
          onClose={() => setShowVideoURLManager(false)}
        />
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