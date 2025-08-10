'use client';

import React, { useState, useEffect } from 'react';
import AuthForm from '@/components/AuthForm';
import MealPlanner from '@/components/MealPlanner';
import StorageInitializer from '@/components/StorageInitializer';
import FirebaseSetup from '@/components/FirebaseSetup';
import DietaryPreferences from '@/components/DietaryPreferences';
import MealSettingsComponent from '@/components/MealSettings';
import VideoURLManager from '@/components/VideoURLManager';
import { authAPI } from '@/lib/api';
import { ChevronDown, Settings, Leaf, Video } from 'lucide-react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(true);
  const [showFirebaseSetup, setShowFirebaseSetup] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showDietaryPreferences, setShowDietaryPreferences] = useState(false);
  const [showMealSettings, setShowMealSettings] = useState(false);
  const [showVideoURLManager, setShowVideoURLManager] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      loadUserProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.user);
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
    setToken(null);
    setUser(null);
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsDropdown) {
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
      <div>
        {/* Header with logout */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🍽️</span>
                </div>
                <h1 className="text-2xl font-bold text-white">Weekly Food Planner</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-blue-100">Welcome, {user.name}</span>
                
                {/* Settings Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                    className="flex items-center space-x-2 text-sm text-white hover:text-blue-100 px-3 py-2 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSettingsDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showSettingsDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
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
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleLogout}
                  className="text-sm text-white hover:text-blue-100 px-3 py-1 rounded-md hover:bg-white/10 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <MealPlanner user={user} />
        
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
      </div>
    </StorageInitializer>
  );
} 