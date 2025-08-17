'use client';

import React, { useState } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, type Language } from '@/lib/translate-api';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onLanguageChange: (language: Language) => void;
  className?: string;
}

export default function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange, 
  className = '' 
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageSelect = (language: Language) => {
    onLanguageChange(language);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        <div className="flex items-center">
          <Globe className="w-4 h-4 mr-2 text-gray-500" />
          <span className="mr-2">{selectedLanguage.nativeName}</span>
          <span className="text-gray-400 text-xs">({selectedLanguage.name})</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageSelect(language)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                selectedLanguage.code === language.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">{language.nativeName}</span>
                  <span className="text-gray-500 text-xs">({language.name})</span>
                </div>
                {selectedLanguage.code === language.code && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 