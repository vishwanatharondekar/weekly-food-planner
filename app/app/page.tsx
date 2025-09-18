'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import MealPlanner from '@/components/MealPlanner';
import StorageInitializer from '@/components/StorageInitializer';
import FirebaseSetup from '@/components/FirebaseSetup';
import DietaryPreferences from '@/components/DietaryPreferences';
import MealSettingsComponent from '@/components/MealSettings';
import VideoURLManager from '@/components/VideoURLManager';
import LanguagePreferences from '@/components/LanguagePreferences';
import CuisineOnboarding from '@/components/CuisineOnboarding';
import { authAPI } from '@/lib/api';
import { ChevronDown, Settings, Leaf, Video, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [continueFromOnboarding, setContinueFromOnboarding] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      loadUserProfile();
    } else {
      setLoading(false);
      // Let unauthenticated users see the login form
    }
  }, [router]);

  const loadUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.user);
      
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
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setShowSettingsDropdown(false);
  };

  const handleCuisineOnboardingComplete = async (selectedCuisines: string[]) => {
    try {
      await authAPI.updateCuisinePreferences({
        cuisinePreferences: selectedCuisines,
        onboardingCompleted: true,
      });
      
      // Update local user state
      setUser((prev: any) => ({
        ...prev,
        cuisinePreferences: selectedCuisines,
        onboardingCompleted: true,
      }));
      
      setShowCuisineOnboarding(false);
      setContinueFromOnboarding(true);
      
      // Show success message
      toast.success('Cuisine preferences saved! Your personalized meal plan will be generated automatically.');
    } catch (error) {
      console.error('Error updating cuisine preferences:', error);
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

  if (!token || !user) {
    return (
      <StorageInitializer>
        <AuthForm
          mode={authMode}
          onSuccess={handleAuthSuccess}
          onToggleMode={toggleAuthMode}
        />
      </StorageInitializer>
    );
  }

  return (
    <StorageInitializer>
      <div className="min-h-screen bg-slate-50">
        {/* Header with logout */}
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

                
                {/* Settings Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <span>{user.name}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showSettingsDropdown && (
                    <div data-dropdown="settings" className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
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
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
        
        {
          user.onboardingCompleted && (<MealPlanner 
            user={user} 
            continueFromOnboarding={continueFromOnboarding}
          />)
        }
        {/* Settings Modals */}
        {showMealSettings && (
          <MealSettingsComponent
            user={user}
            onSettingsChange={() => {}} // This will be handled by MealPlanner
            onClose={() => setShowMealSettings(false)}
          />
        )}
        
        {showDietaryPreferences && (
          <DietaryPreferences
            user={user}
            onClose={() => setShowDietaryPreferences(false)}
          />
        )}
        
        {showVideoURLManager && (
          <VideoURLManager
            isOpen={showVideoURLManager}
            onClose={() => setShowVideoURLManager(false)}
          />
        )}
        
        {showLanguagePreferences && (
          <LanguagePreferences
            user={user}
            onClose={() => setShowLanguagePreferences(false)}
          />
        )}
        
        {showCuisineOnboarding && (
          <CuisineOnboarding
            onComplete={handleCuisineOnboardingComplete}
          />
        )}
      </div>
    </StorageInitializer>
  );
} 