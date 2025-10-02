'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import StorageInitializer from '@/components/StorageInitializer';
import { authAPI } from '@/lib/api';
import { clearGuestData } from '@/lib/guest-utils';

export default function SignInPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // No token, allow access to sign-in page
        setIsCheckingAuth(false);
        return;
      }

      try {
        // Fetch user profile to check if they're a registered user
        const response = await authAPI.getProfile();
        const user = response.user; // Extract user from response
        
        if (user && !user.isGuest) {
          // Registered user - redirect to app
          router.replace('/app');
        } else {
          // Guest user - allow access to sign-in page
          setIsCheckingAuth(false);
        }
      } catch (error) {
        // Error fetching profile (invalid token, etc.) - allow access to sign-in page
        console.error('Error checking auth status:', error);
        setIsCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  const handleAuthSuccess = (token: string, user: any) => {
    // Clear any existing guest data from localStorage
    clearGuestData();
    
    // Redirect to app after successful authentication
    router.replace('/app');
  };

  const toggleAuthMode = () => {
    setAuthMode(prev => prev === 'login' ? 'register' : 'login');
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
