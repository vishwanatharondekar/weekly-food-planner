// Auth API - using server routes
export const authAPI = {
  register: async (data: { email: string; password: string; name: string }) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  login: async (data: { email: string; password: string }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  createGuestUser: async (deviceId: string) => {
    try {
      const response = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Guest user creation failed');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  getGuestUser: async (deviceId: string) => {
    try {
      const response = await fetch(`/api/auth/guest?deviceId=${encodeURIComponent(deviceId)}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get guest user');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  upgradeGuestAccount: async (data: { email: string; password: string; name: string }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No guest token found');
      }

      const response = await fetch('/api/auth/upgrade-guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upgrade guest account');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  getProfile: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get profile');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  updateDietaryPreferences: async (preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
    showCalories?: boolean;
    dailyCalorieTarget?: number;
    preferHealthy?: boolean;
    glutenFree?: boolean;
    nutsFree?: boolean;
    lactoseIntolerant?: boolean;
  }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/dietary-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update dietary preferences');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  getDietaryPreferences: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/dietary-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get dietary preferences');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  getLanguagePreferences: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/language-preferences', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get language preferences');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  updateLanguagePreferences: async (preferences: { language: string }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/language-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update language preferences');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  // Cuisine preferences management
  updateCuisinePreferences: async (preferences: {
    cuisinePreferences: string[];
    onboardingCompleted: boolean;
  }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/cuisine-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update cuisine preferences');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  // Dish preferences management
  updateDishPreferences: async (preferences: {
    dishPreferences: {
      breakfast: string[];
      lunch_dinner: string[];
    };
    onboardingCompleted: boolean;
  }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/dish-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update dish preferences');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  // Ingredients management
  updateIngredients: async (preferences: {
    ingredients: string[];
  }) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/ingredients', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update ingredients');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  // Video URL management
  getVideoURLs: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/video-urls', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get video URLs');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  saveVideoURL: async (recipeName: string, videoUrl: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/auth/video-urls', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ recipeName, videoUrl }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save video URL');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },
};

// Meals API - using server routes
export const mealsAPI = {
  getWeekMeals: async (weekStartDate: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`/api/meals/${weekStartDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get meals');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  updateMeal: async (weekStartDate: string, day: string, mealType: string, mealName: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      // Get current meal plan first
      const currentPlan = await mealsAPI.getWeekMeals(weekStartDate);
      
      // Update the specific meal
      const updatedMeals = {
        ...(currentPlan.meals || {}),
        [day]: {
          ...(currentPlan.meals?.[day] || {}),
          [mealType]: mealName,
        },
      };

      const response = await fetch(`/api/meals/${weekStartDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ meals: updatedMeals }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update meal');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  createOrUpdateMealPlan: async (weekStartDate: string, meals: any) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`/api/meals/${weekStartDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ meals }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update meal plan');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  getMealHistory: async (targetWeek?: string, limitCount: number = 10) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const params = new URLSearchParams();
      if (targetWeek) params.append('targetWeek', targetWeek);
      params.append('limit', limitCount.toString());

      const response = await fetch(`/api/meals/history?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get meal history');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  deleteWeekMeals: async (weekStartDate: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`/api/meals/${weekStartDate}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete meal plan');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  clearWeekMeals: async (weekStartDate: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      // Create an empty meal plan to clear all meals
      const defaultMeals = {
        monday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        tuesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        wednesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        thursday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        friday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        saturday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        sunday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      };

      const response = await fetch(`/api/meals/${weekStartDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ meals: defaultMeals }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clear meals');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

};

// AI API - using server routes
export const aiAPI = {
  generateMeals: async (weekStartDate: string, ingredients?: string[]) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          weekStartDate,
          ingredients: ingredients || []
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate AI suggestions');
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  },

  getAIStatus: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      // Get meal history to check AI status
      const history = await mealsAPI.getMealHistory();
      
      // Get user profile to check cuisine preferences
      const profile = await authAPI.getProfile();
      const hasCuisinePreferences = profile.user.cuisinePreferences && profile.user.cuisinePreferences.length > 0;
      
      const hasHistory = history.length >= 1;
      const canGenerate = hasHistory || hasCuisinePreferences;

      return { hasHistory, canGenerate };
    } catch (error) {
      console.error('Error checking AI status:', error);
      return { hasHistory: false, canGenerate: false };
    }
  },
};

// Image Mapping API - internal proxy to external service for real-time image fetching
export const imageMappingAPI = {
  fetchMealImages: async (mealNames: string[]): Promise<{ mealImageMappings: { [key: string]: string } }> => {
    try {
      if (mealNames.length === 0) {
        return {
          mealImageMappings: {},
        };
      }

      const response = await fetch('/api/image-mapping', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mealNames: mealNames
        }),
      });

      if (!response.ok) {
        console.warn('Image mapping API request failed:', response.status, response.statusText);
        return {
          mealImageMappings: {},
        };
      }

      const data = await response.json();
      
      // The API should return an object with meal names as keys and image URLs as values
      if (typeof data === 'object' && data !== null) {
        return data;
      }

      console.warn('Invalid response format from image mapping API');
      return {
        mealImageMappings: {},
      };
    } catch (error) {
      console.warn('Error fetching meal images from image mapping API:', error);
      return {
        mealImageMappings: {},
      };
    }
  },
};

export default { authAPI, mealsAPI, aiAPI, imageMappingAPI }; 