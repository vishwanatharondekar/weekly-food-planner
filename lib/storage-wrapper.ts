// Storage wrapper that abstracts storage implementation
// This makes it easy to switch between IndexedDB and backend API

import storageManager, { type User, type MealData, type MealPlan } from './storage';
import { FirebaseStorageProvider } from './firebase-storage';

// Storage interface that can be implemented by different storage backends
interface IStorageProvider {
  // User management
  createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  updateDietaryPreferences(userId: string, preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
  }): Promise<User>;
  getDietaryPreferences(userId: string): Promise<{
    nonVegDays: string[];
    isVegetarian: boolean;
  } | null>;

  // Meal plan management
  getMealPlan(userId: string, weekStartDate: string): Promise<MealPlan>;
  createOrUpdateMealPlan(userId: string, weekStartDate: string, meals: MealData): Promise<MealPlan>;
  updateMeal(userId: string, weekStartDate: string, day: string, mealType: string, mealName: string): Promise<MealPlan>;
  getMealHistory(userId: string, limit?: number, targetWeek?: string): Promise<MealPlan[]>;
  deleteMealPlan(userId: string, weekStartDate: string): Promise<void>;

  // AI status
  getAIStatus(userId: string): Promise<{ hasHistory: boolean; canGenerate: boolean }>;

  // Utility
  clearAllData(): Promise<void>;
}

// IndexedDB implementation
class IndexedDBStorageProvider implements IStorageProvider {
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    return storageManager.createUser(userData);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return storageManager.getUserByEmail(email);
  }

  async getUserById(id: string): Promise<User | null> {
    return storageManager.getUserById(id);
  }

  async updateDietaryPreferences(userId: string, preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
  }): Promise<User> {
    return storageManager.updateDietaryPreferences(userId, preferences);
  }

  async getDietaryPreferences(userId: string): Promise<{
    nonVegDays: string[];
    isVegetarian: boolean;
  } | null> {
    return storageManager.getDietaryPreferences(userId);
  }

  async getMealPlan(userId: string, weekStartDate: string): Promise<MealPlan> {
    return storageManager.getMealPlan(userId, weekStartDate);
  }

  async createOrUpdateMealPlan(userId: string, weekStartDate: string, meals: MealData): Promise<MealPlan> {
    return storageManager.createOrUpdateMealPlan(userId, weekStartDate, meals);
  }

  async updateMeal(userId: string, weekStartDate: string, day: string, mealType: string, mealName: string): Promise<MealPlan> {
    return storageManager.updateMeal(userId, weekStartDate, day, mealType, mealName);
  }

  async getMealHistory(userId: string, limit: number = 10, targetWeek?: string): Promise<MealPlan[]> {
    return storageManager.getMealHistory(userId, limit, targetWeek);
  }

  async deleteMealPlan(userId: string, weekStartDate: string): Promise<void> {
    return storageManager.deleteMealPlan(userId, weekStartDate);
  }

  async getAIStatus(userId: string): Promise<{ hasHistory: boolean; canGenerate: boolean }> {
    return storageManager.getAIStatus(userId);
  }

  async clearAllData(): Promise<void> {
    return storageManager.clearAllData();
  }
}

// Future: API implementation for backend
class APIStorageProvider implements IStorageProvider {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return response.user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    // This would typically be done during login
    throw new Error('getUserByEmail not implemented for API provider');
  }

  async getUserById(id: string): Promise<User | null> {
    const response = await this.request('/auth/profile');
    return response.user;
  }

  async updateDietaryPreferences(userId: string, preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
  }): Promise<User> {
    throw new Error('updateDietaryPreferences not implemented for API provider');
  }

  async getDietaryPreferences(userId: string): Promise<{
    nonVegDays: string[];
    isVegetarian: boolean;
  } | null> {
    throw new Error('getDietaryPreferences not implemented for API provider');
  }

  async getMealPlan(userId: string, weekStartDate: string): Promise<MealPlan> {
    return this.request(`/meals/${weekStartDate}`);
  }

  async createOrUpdateMealPlan(userId: string, weekStartDate: string, meals: MealData): Promise<MealPlan> {
    // This would be implemented based on your API structure
    throw new Error('createOrUpdateMealPlan not implemented for API provider');
  }

  async updateMeal(userId: string, weekStartDate: string, day: string, mealType: string, mealName: string): Promise<MealPlan> {
    return this.request(`/meals/${weekStartDate}/${day}/${mealType}`, {
      method: 'PUT',
      body: JSON.stringify({ mealName }),
    });
  }

  async getMealHistory(userId: string, limit: number = 10, targetWeek?: string): Promise<MealPlan[]> {
    return this.request('/meals/history/all');
  }

  async deleteMealPlan(userId: string, weekStartDate: string): Promise<void> {
    return this.request(`/meals/${weekStartDate}`, {
      method: 'DELETE',
    });
  }

  async getAIStatus(userId: string): Promise<{ hasHistory: boolean; canGenerate: boolean }> {
    return this.request('/ai/status');
  }

  async clearAllData(): Promise<void> {
    throw new Error('clearAllData not implemented for API provider');
  }
}

// Storage manager that can switch between providers
class StorageWrapper {
  private provider: IStorageProvider;

  constructor(provider: IStorageProvider) {
    this.provider = provider;
  }

  // Method to switch storage providers
  setProvider(provider: IStorageProvider) {
    this.provider = provider;
  }

  // Delegate all methods to the current provider
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    return this.provider.createUser(userData);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.provider.getUserByEmail(email);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.provider.getUserById(id);
  }

  async updateDietaryPreferences(userId: string, preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
  }): Promise<User> {
    return this.provider.updateDietaryPreferences(userId, preferences);
  }

  async getDietaryPreferences(userId: string): Promise<{
    nonVegDays: string[];
    isVegetarian: boolean;
  } | null> {
    return this.provider.getDietaryPreferences(userId);
  }

  async getMealPlan(userId: string, weekStartDate: string): Promise<MealPlan> {
    return this.provider.getMealPlan(userId, weekStartDate);
  }

  async createOrUpdateMealPlan(userId: string, weekStartDate: string, meals: MealData): Promise<MealPlan> {
    return this.provider.createOrUpdateMealPlan(userId, weekStartDate, meals);
  }

  async updateMeal(userId: string, weekStartDate: string, day: string, mealType: string, mealName: string): Promise<MealPlan> {
    return this.provider.updateMeal(userId, weekStartDate, day, mealType, mealName);
  }

  async getMealHistory(userId: string, limit: number = 10, targetWeek?: string): Promise<MealPlan[]> {
    return this.provider.getMealHistory(userId, limit, targetWeek);
  }

  async deleteMealPlan(userId: string, weekStartDate: string): Promise<void> {
    return this.provider.deleteMealPlan(userId, weekStartDate);
  }

  async getAIStatus(userId: string): Promise<{ hasHistory: boolean; canGenerate: boolean }> {
    return this.provider.getAIStatus(userId);
  }

  async clearAllData(): Promise<void> {
    return this.provider.clearAllData();
  }
}

// Create and export the storage wrapper with Firebase provider as default
const storageWrapper = new StorageWrapper(new FirebaseStorageProvider());

// Export the wrapper and providers for easy switching
export default storageWrapper;
export { IndexedDBStorageProvider, APIStorageProvider, FirebaseStorageProvider, StorageWrapper };
export type { IStorageProvider }; 