'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Check, X } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type Language } from '@/lib/translate-api';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { analytics, AnalyticsEvents } from '@/lib/analytics';

interface LanguagePreferencesProps {
  user: any;
  onClose: () => void;
}

export default function LanguagePreferences({ user, onClose }: LanguagePreferencesProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  
  useEffect(() => {
    loadLanguagePreferences();
  }, []);

  // Also reload preferences when the modal is opened
  useEffect(() => {
    if (user) {
            loadLanguagePreferences();
    }
  }, [user]);

  // Add a function to manually refresh preferences
  const refreshPreferences = () => {
        loadLanguagePreferences();
  };

  const loadLanguagePreferences = async () => {
    try {
      const response = await authAPI.getLanguagePreferences();
            
      if (response && response.language) {
        const language = SUPPORTED_LANGUAGES.find(lang => lang.code === response.language);
        if (language) {
                    setSelectedLanguage(language);
        }
      } else {
                setSelectedLanguage(SUPPORTED_LANGUAGES[0]); // Default to English
      }
    } catch (error) {
      console.error('Error loading language preferences:', error);
      // Fallback to default language
      setSelectedLanguage(SUPPORTED_LANGUAGES[0]);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleLanguageSelect = (language: Language) => {
    setSelectedLanguage(language);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await authAPI.updateLanguagePreferences({
        language: selectedLanguage.code,
      });
      
      // Track language preferences update
      analytics.trackEvent({
        action: AnalyticsEvents.PREFERENCES.UPDATE_LANGUAGE,
        category: 'preferences',
        custom_parameters: {
          language_code: selectedLanguage.code,
          language_name: selectedLanguage.name,
          user_id: user?.id,
        },
      });
      
      toast.success('Language preferences saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving language preferences:', error);
      toast.error('Failed to save language preferences');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Globe className="w-6 h-6 mr-3 text-blue-600" />
            Language Preferences
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPreferences}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
              title="Refresh preferences"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-gray-600 mb-6">
            Choose your preferred language for PDF generation. This will be used to translate meal plans, shopping lists, and other content.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language)}
                className={`p-4 border-2 rounded-lg text-left transition-all duration-200 hover:shadow-md ${
                  selectedLanguage.code === language.code
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">
                      {language.nativeName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {language.name}
                    </div>
                  </div>
                  {selectedLanguage.code === language.code && (
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Preferences'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 