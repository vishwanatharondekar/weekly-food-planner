'use client';

import React, { useEffect, useState } from 'react';
import storageManager from '@/lib/storage';

interface StorageInitializerProps {
  children: React.ReactNode;
}

export default function StorageInitializer({ children }: StorageInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStorage = async () => {
      try {
        await storageManager.init();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize storage:', err);
        setError('Failed to initialize local storage. Please check if IndexedDB is supported in your browser.');
      }
    };

    initializeStorage();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Storage Error
            </h2>
            <p className="text-gray-600 mb-4">
              {error}
            </p>
            <p className="text-sm text-gray-500">
              This application requires IndexedDB support. Please try using a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 