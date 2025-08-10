// Storage utility using IndexedDB for local data persistence
// This can be easily replaced with API calls later

import { getWeekStartDate, formatDate } from './utils';

interface User {
  id: string;
  email: string;
  name: string;
  dietaryPreferences?: {
    isVegetarian: boolean;
    nonVegDays: string[];
  };
  mealSettings?: {
    enabledMealTypes: string[];
  };
  videoURLs?: {
    [recipeName: string]: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface MealData {
  [day: string]: {
    [mealType: string]: string;
  };
}

interface MealPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  meals: MealData;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export MealSettings from utils for consistency
export type { MealSettings } from './utils';

class StorageManager {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'WeeklyFoodPlannerDB';
  private readonly DB_VERSION = 1;
  private isInitialized = false;

  // Check if IndexedDB is available (client-side only)
  private isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && 'indexedDB' in window;
  }

  async init(): Promise<void> {
    // Only initialize on client-side
    if (typeof window === 'undefined') {
      console.log('Storage manager: Server-side, skipping initialization');
      return;
    }

    if (!this.isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available in this environment');
    }

    if (this.isInitialized) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create users store
        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        // Create mealPlans store
        if (!db.objectStoreNames.contains('mealPlans')) {
          const mealPlanStore = db.createObjectStore('mealPlans', { keyPath: 'id' });
          mealPlanStore.createIndex('userId', 'userId', { unique: false });
          mealPlanStore.createIndex('weekStartDate', 'weekStartDate', { unique: false });
          mealPlanStore.createIndex('userId_weekStartDate', ['userId', 'weekStartDate'], { unique: true });
        }

        // Create videoURLs store
        if (!db.objectStoreNames.contains('videoURLs')) {
          const videoURLsStore = db.createObjectStore('videoURLs', { keyPath: 'id' });
          videoURLsStore.createIndex('userId', 'userId', { unique: false });
          videoURLsStore.createIndex('weekStartDate', 'weekStartDate', { unique: false });
          videoURLsStore.createIndex('userId_weekStartDate', ['userId', 'weekStartDate'], { unique: false });
        }
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // User management
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot create user on server-side');
    }

    const store = await this.getStore('users', 'readwrite');
    const user: User = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(user);
      request.onsuccess = () => resolve(user);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const store = await this.getStore('users');
    const index = store.index('email');

    return new Promise((resolve, reject) => {
      const request = index.get(email);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(id: string): Promise<User | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const store = await this.getStore('users');

    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateDietaryPreferences(userId: string, preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
  }): Promise<User> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update dietary preferences on server-side');
    }

    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const store = await this.getStore('users', 'readwrite');
    const updatedUser: User = {
      ...user,
      dietaryPreferences: preferences,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updatedUser);
      request.onsuccess = () => resolve(updatedUser);
      request.onerror = () => reject(request.error);
    });
  }

  async getDietaryPreferences(userId: string): Promise<{
    nonVegDays: string[];
    isVegetarian: boolean;
  } | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const user = await this.getUserById(userId);
    return user?.dietaryPreferences || null;
  }

  // Meal plan management
  async getMealPlan(userId: string, weekStartDate: string): Promise<MealPlan> {
    if (typeof window === 'undefined') {
      // Return a default plan for server-side rendering
      const defaultMeals: MealData = {
        monday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        tuesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        wednesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        thursday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        friday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        saturday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
        sunday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      };

      return {
        id: 'server-side',
        userId,
        weekStartDate,
        meals: defaultMeals,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const store = await this.getStore('mealPlans');
    const index = store.index('userId_weekStartDate');

    return new Promise((resolve, reject) => {
      const request = index.get([userId, weekStartDate]);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve(result);
        } else {
          // Create default meal plan
          const defaultMeals: MealData = {
            monday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
            tuesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
            wednesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
            thursday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
            friday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
            saturday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
            sunday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
          };

          const defaultPlan: MealPlan = {
            id: crypto.randomUUID(),
            userId,
            weekStartDate,
            meals: defaultMeals,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Save the default plan to the database
          const writeStore = this.getStore('mealPlans', 'readwrite');
          writeStore.then(store => {
            const addRequest = store.add(defaultPlan);
            addRequest.onsuccess = () => resolve(defaultPlan);
            addRequest.onerror = () => reject(addRequest.error);
          }).catch(reject);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async createOrUpdateMealPlan(userId: string, weekStartDate: string, meals: MealData): Promise<MealPlan> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update meal plan on server-side');
    }

    const existingPlan = await this.getMealPlan(userId, weekStartDate);
    
    if (existingPlan) {
      // Update existing plan
      const store = await this.getStore('mealPlans', 'readwrite');
      const updatedPlan: MealPlan = {
        ...existingPlan,
        meals,
        updatedAt: new Date(),
      };

      return new Promise((resolve, reject) => {
        const request = store.put(updatedPlan);
        request.onsuccess = () => resolve(updatedPlan);
        request.onerror = () => reject(request.error);
      });
    } else {
      // Create new plan
      const store = await this.getStore('mealPlans', 'readwrite');
      const newPlan: MealPlan = {
        id: crypto.randomUUID(),
        userId,
        weekStartDate,
        meals,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return new Promise((resolve, reject) => {
        const request = store.add(newPlan);
        request.onsuccess = () => resolve(newPlan);
        request.onerror = () => reject(request.error);
      });
    }
  }

  async updateMeal(userId: string, weekStartDate: string, day: string, mealType: string, mealName: string): Promise<MealPlan> {
    if (typeof window === 'undefined') {
      throw new Error('Cannot update meal on server-side');
    }

    const plan = await this.getMealPlan(userId, weekStartDate);
    // getMealPlan now always returns a valid plan

    const updatedMeals = {
      ...plan.meals,
      [day]: {
        ...plan.meals[day],
        [mealType]: mealName,
      },
    };

    return this.createOrUpdateMealPlan(userId, weekStartDate, updatedMeals);
  }

  async getMealHistory(userId: string, limit: number = 10, targetWeek?: string): Promise<MealPlan[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    const store = await this.getStore('mealPlans');
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const plans = request.result || [];
        
        // Use target week if provided, otherwise use current week
        const referenceWeekStart = targetWeek ? new Date(targetWeek) : getWeekStartDate(new Date());
        const referenceWeekStartStr = formatDate(referenceWeekStart);
        
        console.log('IndexedDB getMealHistory:', { 
          userId, 
          targetWeek,
          referenceWeekStartStr, 
          totalPlans: plans.length,
          allWeeks: plans.map(p => p.weekStartDate)
        });
        
        // Filter for plans before the reference week and sort by weekStartDate descending
        const previousWeeks = plans
          .filter(plan => plan.weekStartDate < referenceWeekStartStr)
          .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
          .slice(0, limit);
        
        console.log('IndexedDB meal history result:', {
          totalFound: previousWeeks.length,
          weeks: previousWeeks.map(p => p.weekStartDate)
        });
        
        resolve(previousWeeks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMealPlan(userId: string, weekStartDate: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const plan = await this.getMealPlan(userId, weekStartDate);
    if (!plan) {
      return;
    }

    const store = await this.getStore('mealPlans', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(plan.id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // AI status check
  async getAIStatus(userId: string): Promise<{ hasHistory: boolean; canGenerate: boolean }> {
    if (typeof window === 'undefined') {
      return { hasHistory: false, canGenerate: false };
    }

    try {
      const history = await this.getMealHistory(userId, 10);
      console.log('IndexedDB AI Status Check:', { userId, historyLength: history.length });
      
      // Check if there are any meal plans with actual meal data
      const hasMealData = history.some(plan => {
        const meals = plan.meals;
        return Object.values(meals).some(dayMeals => 
          Object.values(dayMeals).some(meal => meal && meal.trim() !== '')
        );
      });
      
      const hasHistory = history.length >= 1; // Changed from 2 to 1 for new users
      const canGenerate = hasHistory; // Allow generation even with limited data
      
      console.log('IndexedDB AI Status Result:', { hasHistory, hasMealData, canGenerate });
      
      return { hasHistory, canGenerate };
    } catch (error) {
      console.error('Error checking AI status:', error);
      return { hasHistory: false, canGenerate: false };
    }
  }

  // Clear all data (for testing)
  async clearAllData(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const transaction = this.db!.transaction(['users', 'mealPlans'], 'readwrite');
    const userStore = transaction.objectStore('users');
    const mealPlanStore = transaction.objectStore('mealPlans');

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const userRequest = userStore.clear();
        userRequest.onsuccess = () => resolve();
        userRequest.onerror = () => reject(userRequest.error);
      }),
      new Promise<void>((resolve, reject) => {
        const mealPlanRequest = mealPlanStore.clear();
        mealPlanRequest.onsuccess = () => resolve();
        mealPlanRequest.onerror = () => reject(mealPlanRequest.error);
      })
    ]);
  }

  // Video URL storage methods
  async saveVideoURL(userId: string, weekStartDate: string, day: string, mealType: string, videoUrl: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const key = `${userId}_${weekStartDate}_${day}_${mealType}`;
    const videoData = {
      id: key,
      userId,
      weekStartDate,
      day,
      mealType,
      videoUrl,
      createdAt: new Date()
    };

    const transaction = this.db!.transaction(['videoURLs'], 'readwrite');
    const store = transaction.objectStore('videoURLs');
    
    return new Promise((resolve, reject) => {
      const request = store.put(videoData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getVideoURL(userId: string, weekStartDate: string, day: string, mealType: string): Promise<string | null> {
    if (!this.db) {
      await this.init();
    }

    const key = `${userId}_${weekStartDate}_${day}_${mealType}`;
    const transaction = this.db!.transaction(['videoURLs'], 'readonly');
    const store = transaction.objectStore('videoURLs');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result?.videoUrl || null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllVideoURLs(userId: string, weekStartDate: string): Promise<{ [day: string]: { [mealType: string]: string } }> {
    if (!this.db) {
      await this.init();
    }

    const transaction = this.db!.transaction(['videoURLs'], 'readonly');
    const store = transaction.objectStore('videoURLs');
    const index = store.index('userId_weekStartDate');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll([userId, weekStartDate]);
      request.onsuccess = () => {
        const videoURLs: { [day: string]: { [mealType: string]: string } } = {};
        request.result.forEach((item: any) => {
          if (!videoURLs[item.day]) {
            videoURLs[item.day] = {};
          }
          videoURLs[item.day][item.mealType] = item.videoUrl;
        });
        resolve(videoURLs);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Create and export a singleton instance
const storageManager = new StorageManager();

export default storageManager;
export type { User, MealData, MealPlan }; 