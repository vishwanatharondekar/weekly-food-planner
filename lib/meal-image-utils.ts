import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Initialize Firebase on server side
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Get Firestore instance
const db = getFirestore();

/**
 * Function to fetch meal images from Firestore mealImageMappings collection
 * @param mealNames - Array of meal names to fetch images for
 * @returns Object mapping meal names to image URLs
 */
export async function fetchMealImages(mealNames: string[]): Promise<{ [key: string]: string }> {
  try {
    if (mealNames.length === 0) {
      return {};
    }

    const mealImages: { [key: string]: string } = {};
    
    // Query Firestore for each meal name
    for (const mealName of mealNames) {
      try {
        const q = query(
          collection(db, 'mealImageMappings'),
          where('mealName', '==', mealName)
        );
        
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Get the first matching document
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          
          if (data.imageUrl) {
            mealImages[mealName] = data.imageUrl;
          }
        }
      } catch (error) {
        console.warn(`Error fetching image for meal "${mealName}":`, error);
        // Continue with other meals even if one fails
      }
    }

    return mealImages;
  } catch (error) {
    console.warn('Error fetching meal images from Firestore:', error);
    return {};
  }
}

/**
 * Extract meal names from meal data structure
 * @param meals - Meal data object
 * @returns Array of unique meal names
 */
export function extractMealNames(meals: any): string[] {
  const mealNames: string[] = [];
  const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const ALL_MEAL_TYPES = ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
  
  DAYS_OF_WEEK.forEach(day => {
    ALL_MEAL_TYPES.forEach(mealType => {
      const meal = meals[day]?.[mealType];
      if (meal) {
        let mealName = '';
        if (typeof meal === 'string') {
          mealName = meal;
        } else if (typeof meal === 'object' && meal.name) {
          mealName = meal.name;
        }
        
        if (mealName.trim()) {
          mealNames.push(mealName.trim());
        }
      }
    });
  });
  
  // Return unique meal names
  return Array.from(new Set(mealNames));
}

/**
 * Enhance meals with image URLs
 * @param meals - Original meal data
 * @param mealImages - Object mapping meal names to image URLs
 * @returns Enhanced meal data with image URLs
 */
export function enhanceMealsWithImages(meals: any, mealImages: { [key: string]: string }): any {
  const enhancedMeals = { ...meals };
  const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const ALL_MEAL_TYPES = ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
  
  DAYS_OF_WEEK.forEach(day => {
    ALL_MEAL_TYPES.forEach(mealType => {
      const meal = enhancedMeals[day]?.[mealType];
      if (meal) {
        let mealName = '';
        if (typeof meal === 'string') {
          mealName = meal;
        } else if (typeof meal === 'object' && meal.name) {
          mealName = meal.name;
        }
        
        if (mealName.trim() && mealImages[mealName.trim()]) {
          if (typeof meal === 'string') {
            // Convert string meal to object with image
            enhancedMeals[day][mealType] = {
              name: meal,
              imageUrl: mealImages[mealName.trim()]
            };
          } else if (typeof meal === 'object') {
            // Add image to existing object
            enhancedMeals[day][mealType] = {
              ...meal,
              imageUrl: mealImages[mealName.trim()]
            };
          }
        }
      }
    });
  });
  
  return enhancedMeals;
}
