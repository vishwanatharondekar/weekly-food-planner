'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getWeekStartDate, formatDate, getPlanUrl } from '@/lib/utils';
import AuthForm from '@/components/AuthForm';
import MealPlanner from '@/components/MealPlanner';
import StorageInitializer from '@/components/StorageInitializer';
import FirebaseSetup from '@/components/FirebaseSetup';
import DietaryPreferences from '@/components/DietaryPreferences';
import MealSettingsComponent from '@/components/MealSettings';
import VideoURLManager from '@/components/VideoURLManager';
import LanguagePreferences from '@/components/LanguagePreferences';
import CuisineOnboarding from '@/components/CuisineOnboarding';
import GuestUpgradeModal from '@/components/GuestUpgradeModal';
import { authAPI } from '@/lib/api';
import { ChevronDown, Settings, Leaf, Video, Globe, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { analytics, AnalyticsEvents } from '@/lib/analytics';
import { getGuestDeviceId, isGuestUser, clearGuestData } from '@/lib/guest-utils';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showDietaryPreferences, setShowDietaryPreferences] = useState(false);
  const [showMealSettings, setShowMealSettings] = useState(false);
  const [showVideoURLManager, setShowVideoURLManager] = useState(false);
  const [showLanguagePreferences, setShowLanguagePreferences] = useState(false);
  const [showCuisineOnboarding, setShowCuisineOnboarding] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [continueFromOnboarding, setContinueFromOnboarding] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      loadUserProfile();
    } else {
      // No token found, show welcome screen (onboarding will handle guest user creation)
      setLoading(false);
      setShowCuisineOnboarding(true);
    }
  }, [router]);

  // Redirect to home route when user is authenticated and onboarding is complete
  useEffect(() => {
    if (user && user.onboardingCompleted && !continueFromOnboarding) {
      router.replace('/home');
    }
  }, [user, continueFromOnboarding, router]);

  const createGuestUser = async () => {
    try {
      const deviceId = getGuestDeviceId();
      const response = await authAPI.createGuestUser(deviceId);
      
      setToken(response.token);
      setUser(response.user);
      localStorage.setItem('token', response.token);
      
      // Initialize analytics for guest user
      analytics.setUserProperties({
        user_id: response.user.id,
        user_type: 'new',
        dietary_preference: 'non-vegetarian', // Default, will be updated after onboarding
        language: 'en',
        has_ai_history: false,
      });
      
      // Show onboarding for new guest users
      if (!response.user.onboardingCompleted) {
        setShowCuisineOnboarding(true);
      }
    } catch (error) {
      console.error('Error creating guest user:', error);
      toast.error('Failed to initialize app. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.user);

      // Initialize analytics with user ID
      analytics.setUserProperties({
        user_id: response.user.id,
        user_type: 'returning',
        dietary_preference: response.user.dietaryPreferences?.isVegetarian ? 'vegetarian' : 'non-vegetarian',
        language: response.user.language || 'en',
        has_ai_history: response.user.onboardingCompleted || false,
        email: response.user.email,
        name: response.user.name,
      });
      
      // Show onboarding if user hasn't completed it
      if (!response.user.onboardingCompleted) {
        setShowCuisineOnboarding(true);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (newToken: string, userData: any) => {
    setToken(newToken);
    
    // Initialize analytics for new user
    analytics.setUserProperties({
      user_id: userData.id,
      user_type: 'new',
      dietary_preference: 'non-vegetarian', // Default, will be updated after onboarding
      language: 'en',
      has_ai_history: false,
    });
    
    // Load full user profile to get onboardingCompleted and other fields
    loadUserProfile();
  };

  const handleLogout = () => {
    // Track logout event
    analytics.trackEvent({
      action: AnalyticsEvents.AUTH.LOGOUT,
      category: 'authentication',
      custom_parameters: {
        user_id: user?.id,
        user_type: user?.isGuest ? 'guest' : 'registered',
      },
    });
    
    // Logout for registered users only
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setShowSettingsDropdown(false);
    
    // Redirect to sign-in page
    router.push('/signin');
  };

  const handleSignUp = () => {
    setShowSettingsDropdown(false);
    // Redirect to sign-in page (which includes both login and register)
    router.push('/signin');
  };

  const handleUpgradeSuccess = (token: string, newUser: any) => {
    // Update the user state with the new registered user
    setUser(newUser);
    setToken(token);
    
    // Close the modal
    setShowUpgradeModal(false);
    
    // Show success message (handled by the modal itself)
    // Refresh the page data to reflect the new user status
    loadUserProfile();
  };

  const handleCuisineOnboardingComplete = async (selectedCuisines: string[], selectedDishes: { breakfast: string[]; lunch_dinner: string[] }, dietaryPreferences?: { isVegetarian: boolean; nonVegDays: string[]; showCalories: boolean; dailyCalorieTarget: number; preferHealthy: boolean; glutenFree: boolean; nutsFree: boolean; lactoseIntolerant: boolean }) => {
    try {
      // Save cuisine preferences
      await authAPI.updateCuisinePreferences({
        cuisinePreferences: selectedCuisines,
        onboardingCompleted: true,
      });

      // Save dietary preferences if provided
      if (dietaryPreferences) {
        await authAPI.updateDietaryPreferences({
          isVegetarian: dietaryPreferences.isVegetarian,
          nonVegDays: dietaryPreferences.nonVegDays,
          showCalories: dietaryPreferences.showCalories,
          dailyCalorieTarget: dietaryPreferences.dailyCalorieTarget,
          preferHealthy: dietaryPreferences.preferHealthy,
          glutenFree: dietaryPreferences.glutenFree,
          nutsFree: dietaryPreferences.nutsFree,
          lactoseIntolerant: dietaryPreferences.lactoseIntolerant,
        });
      }
      
      // Track onboarding completion
      analytics.trackEvent({
        action: AnalyticsEvents.ONBOARDING.COMPLETE,
        category: 'onboarding',
        custom_parameters: {
          user_id: user?.id,
          cuisine_count: selectedCuisines.length,
          selected_cuisines: selectedCuisines,
          dietary_preference: dietaryPreferences?.isVegetarian ? 'vegetarian' : 'non-vegetarian',
          non_veg_days: dietaryPreferences?.nonVegDays?.length || 0,
          breakfast_dishes: selectedDishes.breakfast.length,
          lunch_dinner_dishes: selectedDishes.lunch_dinner.length,
        },
      });
      
      // Update analytics user properties after onboarding
      analytics.setUserProperties({
        user_id: user?.id,
        user_type: 'returning',
        dietary_preference: dietaryPreferences?.isVegetarian ? 'vegetarian' : 'non-vegetarian',
        language: user?.language || 'en',
        has_ai_history: true,
      });
      
      // Fetch complete user profile to ensure all preferences are available
      // This is crucial for the AI modal to have access to dishPreferences
      try {
        const response = await authAPI.getProfile();
        setUser(response.user);
      } catch (profileError) {
        console.error('Error fetching updated profile:', profileError);
        // Fallback to manual state update if profile fetch fails
        setUser((prev: any) => ({
          ...prev,
          cuisinePreferences: selectedCuisines,
          dietaryPreferences: dietaryPreferences || prev.dietaryPreferences,
          dishPreferences: selectedDishes,
          onboardingCompleted: true,
        }));
      }
      
      setShowCuisineOnboarding(false);
      setContinueFromOnboarding(true);
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    }
  };


  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      const dropdown = document.querySelector('[data-dropdown="settings"]');
      
      if (showSettingsDropdown && dropdown && !dropdown.contains(target)) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsDropdown]);

  // Check if Firebase is configured
  const isFirebaseConfigured = () => {
    return process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
           process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Remove the old auth form logic since we automatically create guest users

  return (
    <StorageInitializer>
      <div className="min-h-screen bg-slate-50">
        {/* Header with logout */}
        {user && (
          <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                    <img 
                      src="/images/logos/logo-pack-fe229c/icon-transparent.png" 
                      alt="खाना क्या बनाऊं Logo" 
                      className="w-10 h-10 object-contain"
                    />
                  </div>
                  <span className="text-xl font-bold text-slate-800">खाना क्या बनाऊं</span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Login CTA for Guest Users - Desktop Only */}
                  {user?.isGuest && (
                    <div className="hidden md:flex items-center space-x-2 text-sm text-blue-700">
                      <span>Already have an account?</span>
                      <button
                        onClick={() => {
                          window.location.href = '/signin';
                        }}
                        className="font-medium text-blue-600 hover:text-blue-800 underline transition-colors"
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                  
                  {/* Settings Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                      className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {user?.isGuest && <User className="w-4 h-4 text-blue-500" />}
                      <span>{user?.isGuest ? 'Guest User' : user.name}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  
                  {showSettingsDropdown && (
                    <div data-dropdown="settings" className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                      {user?.isGuest && (
                        <>
                          <button
                            onClick={() => {
                              setShowUpgradeModal(true);
                              setShowSettingsDropdown(false);
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium"
                          >
                            <User className="w-4 h-4 mr-3 text-blue-600" />
                            Create Account
                          </button>
                          <div className="border-t border-gray-200 my-1"></div>
                        </>
                      )}
                      
                      <button
                        onClick={() => {
                          setShowDietaryPreferences(true);
                          setShowSettingsDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Leaf className="w-4 h-4 mr-3 text-green-600" />
                        Dietary Preferences
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowMealSettings(true);
                          setShowSettingsDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3 text-blue-600" />
                        Meal Settings
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowVideoURLManager(true);
                          setShowSettingsDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Video className="w-4 h-4 mr-3 text-orange-600" />
                        Video URLs
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowLanguagePreferences(true);
                          setShowSettingsDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Globe className="w-4 h-4 mr-3 text-indigo-600" />
                        Language Preferences
                      </button>
                      
                      {/* Only show logout for registered users */}
                      {!user?.isGuest && (
                        <>
                          <div className="border-t border-gray-200 my-1"></div>
                          
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleLogout();
                            }}
                            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Logout
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </div>
          </nav>
        )}

        {/* Login CTA Banner for Guest Users - Mobile Only */}
        {user?.isGuest && (
          <div className="md:hidden bg-blue-50 border-b border-blue-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="py-3 text-center">
                <span className="text-sm text-blue-700">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      // Redirect to dedicated sign-in page
                      window.location.href = '/signin';
                    }}
                    className="font-medium text-blue-600 hover:text-blue-800 underline transition-colors"
                  >
                    Sign In
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}
        
        {user && user.onboardingCompleted ? (
          <MealPlanner 
            user={user} 
            continueFromOnboarding={continueFromOnboarding}
            onUserUpdate={setUser}
          />
        ) : user && !user.onboardingCompleted ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your meal planner...</p>
            </div>
          </div>
        ) : null}
        {/* Settings Modals */}
        {showMealSettings && user && (
          <MealSettingsComponent
            user={user}
            onSettingsChange={() => {}} // This will be handled by MealPlanner
            onClose={() => setShowMealSettings(false)}
            onUserUpdate={setUser}
          />
        )}
        
        {showDietaryPreferences && user && (
          <DietaryPreferences
            user={user}
            onClose={() => setShowDietaryPreferences(false)}
            onUserUpdate={setUser}
          />
        )}
        
        {showVideoURLManager && (
          <VideoURLManager
            isOpen={showVideoURLManager}
            onClose={() => setShowVideoURLManager(false)}
          />
        )}
        
        {showLanguagePreferences && user && (
          <LanguagePreferences
            user={user}
            onClose={() => setShowLanguagePreferences(false)}
            onUserUpdate={setUser}
          />
        )}
        
        {showUpgradeModal && user && (
          <GuestUpgradeModal
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            onSuccess={handleUpgradeSuccess}
            limitType="ai" // Default to ai type for manual upgrade
            currentUsage={user?.aiUsageCount || 0}
            usageLimit={user?.guestUsageLimits?.ai || 3}
            isManualRegistration={true} // Hide limit message for manual registration
          />
        )}
        
        {showCuisineOnboarding && (
          <CuisineOnboarding
            onComplete={handleCuisineOnboardingComplete}
            onCreateGuestUser={createGuestUser}
            isUserAuthenticated={!!token}
          />
        )}
      </div>
    </StorageInitializer>
  );
} 