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
      const emptyMeals = {
        monday: { breakfast: '', lunch: '', dinner: '' },
        tuesday: { breakfast: '', lunch: '', dinner: '' },
        wednesday: { breakfast: '', lunch: '', dinner: '' },
        thursday: { breakfast: '', lunch: '', dinner: '' },
        friday: { breakfast: '', lunch: '', dinner: '' },
        saturday: { breakfast: '', lunch: '', dinner: '' },
        sunday: { breakfast: '', lunch: '', dinner: '' },
      };

      const response = await fetch(`/api/meals/${weekStartDate}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ meals: emptyMeals }),
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
  generateMeals: async (weekStartDate: string) => {
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
        body: JSON.stringify({ weekStartDate }),
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
      
      const hasHistory = history.length >= 1;
      const canGenerate = hasHistory;

      return { hasHistory, canGenerate };
    } catch (error) {
      console.error('Error checking AI status:', error);
      return { hasHistory: false, canGenerate: false };
    }
  },
};

export default { authAPI, mealsAPI, aiAPI }; 