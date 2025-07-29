import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase-config';
import type { User, MealData, MealPlan } from './storage';
import { getWeekStartDate, formatDate } from './utils';

export class FirebaseStorageProvider {
  private usersCollection = 'users';
  private mealPlansCollection = 'mealPlans';

  // Helper method to convert Firestore timestamp to Date
  private convertTimestamp(timestamp: any): Date {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    return timestamp;
  }

  // Helper method to convert Date to Firestore timestamp
  private convertToTimestamp(date: Date) {
    return Timestamp.fromDate(date);
  }

  // User management
  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const userRef = doc(collection(db, this.usersCollection));
    const user: User = {
      id: userRef.id,
      ...userData,
      createdAt: new Date(),
    };

    await setDoc(userRef, {
      ...user,
      createdAt: this.convertToTimestamp(user.createdAt),
    });

    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const usersRef = collection(db, this.usersCollection);
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    return {
      ...userData,
      id: userDoc.id,
      createdAt: this.convertTimestamp(userData.createdAt),
    } as User;
  }

  async getUserById(id: string): Promise<User | null> {
    const userRef = doc(db, this.usersCollection, id);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return {
      ...userData,
      id: userDoc.id,
      createdAt: this.convertTimestamp(userData.createdAt),
    } as User;
  }

  async updateDietaryPreferences(userId: string, preferences: {
    nonVegDays: string[];
    isVegetarian: boolean;
  }): Promise<User> {
    const userRef = doc(db, this.usersCollection, userId);
    await updateDoc(userRef, {
      dietaryPreferences: preferences,
      updatedAt: serverTimestamp(),
    });

    const updatedUser = await this.getUserById(userId);
    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async getDietaryPreferences(userId: string): Promise<{
    nonVegDays: string[];
    isVegetarian: boolean;
  } | null> {
    const user = await this.getUserById(userId);
    return user?.dietaryPreferences || null;
  }

  // Meal plan management
  async getMealPlan(userId: string, weekStartDate: string): Promise<MealPlan> {
    const mealPlanRef = doc(db, this.mealPlansCollection, `${userId}_${weekStartDate}`);
    const mealPlanDoc = await getDoc(mealPlanRef);

    if (mealPlanDoc.exists()) {
      const data = mealPlanDoc.data();
      return {
        ...data,
        id: mealPlanDoc.id,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      } as MealPlan;
    }

    // Create default meal plan if none exists
    const defaultMeals: MealData = {
      monday: { breakfast: '', lunch: '', dinner: '' },
      tuesday: { breakfast: '', lunch: '', dinner: '' },
      wednesday: { breakfast: '', lunch: '', dinner: '' },
      thursday: { breakfast: '', lunch: '', dinner: '' },
      friday: { breakfast: '', lunch: '', dinner: '' },
      saturday: { breakfast: '', lunch: '', dinner: '' },
      sunday: { breakfast: '', lunch: '', dinner: '' },
    };

    const defaultPlan: MealPlan = {
      id: `${userId}_${weekStartDate}`,
      userId,
      weekStartDate,
      meals: defaultMeals,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(mealPlanRef, {
      ...defaultPlan,
      createdAt: this.convertToTimestamp(defaultPlan.createdAt),
      updatedAt: this.convertToTimestamp(defaultPlan.updatedAt),
    });

    return defaultPlan;
  }

  async createOrUpdateMealPlan(userId: string, weekStartDate: string, meals: MealData): Promise<MealPlan> {
    const mealPlanRef = doc(db, this.mealPlansCollection, `${userId}_${weekStartDate}`);
    const now = new Date();

    const mealPlan: MealPlan = {
      id: `${userId}_${weekStartDate}`,
      userId,
      weekStartDate,
      meals,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(mealPlanRef, {
      ...mealPlan,
      createdAt: this.convertToTimestamp(mealPlan.createdAt),
      updatedAt: this.convertToTimestamp(mealPlan.updatedAt),
    });

    return mealPlan;
  }

  async updateMeal(userId: string, weekStartDate: string, day: string, mealType: string, mealName: string): Promise<MealPlan> {
    const mealPlanRef = doc(db, this.mealPlansCollection, `${userId}_${weekStartDate}`);
    
    // Get current meal plan
    const currentPlan = await this.getMealPlan(userId, weekStartDate);
    
    // Update the specific meal
    const updatedMeals = {
      ...currentPlan.meals,
      [day]: {
        ...currentPlan.meals[day],
        [mealType]: mealName,
      },
    };

    const updatedPlan: MealPlan = {
      ...currentPlan,
      meals: updatedMeals,
      updatedAt: new Date(),
    };

    await updateDoc(mealPlanRef, {
      [`meals.${day}.${mealType}`]: mealName,
      updatedAt: this.convertToTimestamp(updatedPlan.updatedAt),
    });

    return updatedPlan;
  }

  async getMealHistory(userId: string, limitCount: number = 10, targetWeek?: string): Promise<MealPlan[]> {
    const mealPlansRef = collection(db, this.mealPlansCollection);
    
    // Use target week if provided, otherwise use current week
    const referenceWeekStart = targetWeek ? new Date(targetWeek) : getWeekStartDate(new Date());
    const referenceWeekStartStr = formatDate(referenceWeekStart);
    
    console.log('Firebase getMealHistory:', { 
      userId, 
      targetWeek,
      referenceWeekStartStr, 
      limitCount 
    });
    
    // Query for meal plans that are before the reference week
    const q = query(
      mealPlansRef,
      where('userId', '==', userId),
      where('weekStartDate', '<', referenceWeekStartStr),
      orderBy('weekStartDate', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const mealPlans: MealPlan[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      mealPlans.push({
        ...data,
        id: doc.id,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      } as MealPlan);
    });

    console.log('Firebase meal history result:', {
      totalFound: mealPlans.length,
      weeks: mealPlans.map(p => p.weekStartDate)
    });

    return mealPlans;
  }

  async deleteMealPlan(userId: string, weekStartDate: string): Promise<void> {
    const mealPlanRef = doc(db, this.mealPlansCollection, `${userId}_${weekStartDate}`);
    await deleteDoc(mealPlanRef);
  }

  // AI status
  async getAIStatus(userId: string): Promise<{ hasHistory: boolean; canGenerate: boolean }> {
    try {
      const history = await this.getMealHistory(userId, 10);
      
      // Check if there are any meal plans with actual meal data
      const hasMealData = history.some(plan => {
        const meals = plan.meals;
        return Object.values(meals).some(dayMeals => 
          Object.values(dayMeals).some(meal => meal && meal.trim() !== '')
        );
      });

      console.log('history : ', history);
      
      const hasHistory = history.length >= 1; // Changed from 2 to 1 for new users
      const canGenerate = hasHistory; // Allow generation even with limited data
      
      console.log('Firebase AI Status Result:', { hasHistory, hasMealData, canGenerate });
      
      return { hasHistory, canGenerate };
    } catch (error) {
      console.error('Error checking AI status:', error);
      return { hasHistory: false, canGenerate: false };
    }
  }

  // Utility
  async clearAllData(): Promise<void> {
    // This would typically be used for testing or admin purposes
    // In production, you might want to restrict this functionality
    const mealPlansRef = collection(db, this.mealPlansCollection);
    const usersRef = collection(db, this.usersCollection);

    // Delete all meal plans
    const mealPlansSnapshot = await getDocs(mealPlansRef);
    const mealPlanDeletions = mealPlansSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(mealPlanDeletions);

    // Delete all users
    const usersSnapshot = await getDocs(usersRef);
    const userDeletions = usersSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(userDeletions);
  }
} 