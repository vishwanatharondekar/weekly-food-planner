'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getWeekStartDate, formatDate, getPlanUrl } from '@/lib/utils';
import { mealsAPI, authAPI } from '@/lib/api';
import { isSameDay } from 'date-fns';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkUserStatusAndRedirect();
  }, []);

  const checkUserStatusAndRedirect = async () => {
    try {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        // No token found, redirect to landing page
        router.replace('/');
        return;
      }

      // Get user profile to ensure token is valid
      let user;
      try {
        const profileResponse = await authAPI.getProfile();
        user = profileResponse.user;
      } catch (authError) {
        // Token is invalid, clear it and redirect to landing page
        localStorage.removeItem('token');
        router.replace('/');
        return;
      }

      // Check if user has completed onboarding
      if (!user.onboardingCompleted) {
        // User hasn't completed onboarding, redirect to current week's plan
        // The plan page will handle showing the onboarding
        const currentWeek = getWeekStartDate(new Date());
        const planUrl = `/plan/${formatDate(currentWeek)}`;
        router.replace(planUrl);
        return;
      }

      // User is authenticated and onboarded, check for today's meals
      const todaysMealsAvailable = await checkTodaysMealsAvailable();
      
      // Get current week's plan URL
      const currentWeek = getWeekStartDate(new Date());
      const planUrl = `/plan/${formatDate(currentWeek)}`;
      
      // Redirect with todaysMealsAvailable query parameter
      const redirectUrl = todaysMealsAvailable 
        ? `${planUrl}?todaysMealsAvailable=true`
        : planUrl;
      
      router.replace(redirectUrl);
      
    } catch (error) {
      console.error('Error checking user status:', error);
      setError('Failed to check user status. Please try again.');
      setLoading(false);
    }
  };

  const checkTodaysMealsAvailable = async (): Promise<boolean> => {
    try {
      const today = new Date();
      const weekStart = getWeekStartDate(today);
      const weekStartDateString = formatDate(weekStart);
      
      // Get the meal plan for current week
      const mealPlan = await mealsAPI.getWeekMeals(weekStartDateString);
      
      if (!mealPlan || !mealPlan.meals) {
        return false;
      }

      // Check if we're looking at the current week
      const isCurrentWeek = isSameDay(weekStart, getWeekStartDate(new Date()));
      if (!isCurrentWeek) {
        return false;
      }

      // Get today's day name (monday, tuesday, etc.)
      const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1; // Convert Sunday=0 to Sunday=6
      const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const todayDay = DAYS_OF_WEEK[todayIndex];
      
      const todaysMeals = mealPlan.meals[todayDay];
      if (!todaysMeals) {
        return false;
      }

      // Check if there are any meals planned for today
      // We'll check for basic meal types that are commonly enabled
      const commonMealTypes = ['breakfast', 'lunch', 'dinner'];
      
      const hasAnyMeal = commonMealTypes.some(mealType => {
        const meal = todaysMeals[mealType];
        if (!meal) return false;
        
        // Handle both string and object formats
        const mealName = typeof meal === 'string' ? meal : (meal.name || '');
        return mealName.trim().length > 0;
      });

      return hasAnyMeal;
      
    } catch (error) {
      console.error('Error checking today\'s meals:', error);
      return false;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-4">Error</div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <FullScreenLoader
      isVisible={loading}
      message="Checking your meal plan..."
      subMessage="Redirecting you to the right place"
    />
  );
}
