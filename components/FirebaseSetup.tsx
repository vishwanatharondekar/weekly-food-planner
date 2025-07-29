'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, Database } from 'lucide-react';
import toast from 'react-hot-toast';

interface FirebaseSetupProps {
  onClose: () => void;
}

export default function FirebaseSetup({ onClose }: FirebaseSetupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} copied to clipboard!`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const openFirebaseConsole = () => {
    window.open('https://console.firebase.google.com/', '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Database className="w-6 h-6 mr-2 text-blue-600" />
            Firebase Setup Guide
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Step 1: Create Firebase Project */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Step 1: Create Firebase Project
            </h3>
            <p className="text-blue-800 mb-3">
              Create a new Firebase project or use an existing one.
            </p>
            <button
              onClick={openFirebaseConsole}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Firebase Console
            </button>
          </div>

          {/* Step 2: Enable Firestore */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-green-900 mb-2">
              Step 2: Enable Firestore Database
            </h3>
            <ol className="text-green-800 space-y-1 ml-4">
              <li>1. Go to Firestore Database in your Firebase console</li>
              <li>2. Click "Create Database"</li>
              <li>3. Choose "Start in test mode" (we'll add security rules later)</li>
              <li>4. Select a location close to your users</li>
            </ol>
          </div>

          {/* Step 3: Get Configuration */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Step 3: Get Your Firebase Configuration
            </h3>
            <ol className="text-purple-800 space-y-1 ml-4 mb-3">
              <li>1. Go to Project Settings (gear icon)</li>
              <li>2. Scroll down to "Your apps"</li>
              <li>3. Click "Add app" and choose Web</li>
              <li>4. Copy the configuration values below</li>
            </ol>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Firebase Config:</h4>
              <div className="space-y-2">
                {Object.entries(firebaseConfig).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-mono text-gray-700">
                      {key}: "{value}"
                    </span>
                    <button
                      onClick={() => copyToClipboard(value, key)}
                      className="ml-2 p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedField === key ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 4: Environment Variables */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Step 4: Add Environment Variables
            </h3>
            <p className="text-yellow-800 mb-3">
              Create a <code className="bg-yellow-200 px-1 rounded">.env.local</code> file in your project root with:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="space-y-2">
                {Object.entries(firebaseConfig).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm font-mono text-gray-700">
                      NEXT_PUBLIC_FIREBASE_{key.toUpperCase()}={value}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}=${value}`, key)}
                      className="ml-2 p-1 hover:bg-gray-200 rounded"
                    >
                      {copiedField === key ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 5: Security Rules */}
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Step 5: Configure Security Rules (Important!)
            </h3>
            <p className="text-red-800 mb-3">
              In your Firestore Database, go to "Rules" and add these security rules:
            </p>
            <div className="bg-gray-100 p-4 rounded-lg">
              <pre className="text-sm text-gray-800 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Meal plans can only be accessed by the user who created them
    match /mealPlans/{mealPlanId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}`}
              </pre>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
              Next Steps
            </h3>
            <ol className="text-indigo-800 space-y-1 ml-4">
              <li>1. Restart your development server</li>
              <li>2. The app will automatically use Firebase if configured</li>
              <li>3. Your data will be stored in the cloud and sync across devices</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
} 