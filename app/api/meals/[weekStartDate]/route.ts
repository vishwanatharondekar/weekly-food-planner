import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';

// Initialize Firebase on server side
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase only if not already initialized
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const db = getFirestore();

// Function to fetch meal images from lambda endpoint
async function fetchMealImages(mealNames: string[]): Promise<{ [key: string]: string }> {
  try {
    if (mealNames.length === 0) {
      return {};
    }

    // Call the internal image mapping API which proxies to lambda
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/image-mapping`, {
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
      return {};
    }

    const data = await response.json();
    
    // The API should return an object with meal names as keys and image URLs as values
    if (typeof data === 'object' && data !== null) {
      return data;
    }

    console.warn('Invalid response format from image mapping API');
    return {};
  } catch (error) {
    console.warn('Error fetching meal images from image mapping API:', error);
    return {};
  }
}

// Helper function to get user ID from token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.userId;
  } catch (error) {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { weekStartDate: string } }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { weekStartDate } = params;
    const mealPlanRef = doc(db, 'mealPlans', `${userId}_${weekStartDate}`);
    const mealPlanDoc = await getDoc(mealPlanRef);

    if (mealPlanDoc.exists()) {
      const data = mealPlanDoc.data();
      
      // Extract meal names for image search
      const mealNames: string[] = [];
      const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const ALL_MEAL_TYPES = ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
      
      DAYS_OF_WEEK.forEach(day => {
        ALL_MEAL_TYPES.forEach(mealType => {
          const meal = data.meals[day]?.[mealType];
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
      
      // Fetch meal images from Firestore
      const mealImages = await fetchMealImages(mealNames);


      
      // Enhance meals with image URLs
      const enhancedMeals = { ...data.meals };
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
      
      return NextResponse.json({
        id: mealPlanDoc.id,
        userId: data.userId,
        weekStartDate: data.weekStartDate,
        meals: enhancedMeals,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      });
    }

    // Create default meal plan if none exists
    const defaultMeals = {
      monday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      tuesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      wednesday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      thursday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      friday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      saturday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
      sunday: { breakfast: '', morningSnack: '', lunch: '', eveningSnack: '', dinner: '' },
    };

    const defaultPlan = {
      id: `${userId}_${weekStartDate}`,
      userId,
      weekStartDate,
      meals: defaultMeals,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(mealPlanRef, {
      ...defaultPlan,
      createdAt: Timestamp.fromDate(defaultPlan.createdAt),
      updatedAt: Timestamp.fromDate(defaultPlan.updatedAt),
    });

    return NextResponse.json(defaultPlan);
  } catch (error) {
    console.error('Get meal plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { weekStartDate: string } }
) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { weekStartDate } = params;
    const { meals } = await request.json();

    const mealPlanRef = doc(db, 'mealPlans', `${userId}_${weekStartDate}`);
    const now = new Date();

    const mealPlan = {
      id: `${userId}_${weekStartDate}`,
      userId,
      weekStartDate,
      meals,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(mealPlanRef, {
      ...mealPlan,
      createdAt: Timestamp.fromDate(mealPlan.createdAt),
      updatedAt: Timestamp.fromDate(mealPlan.updatedAt),
    });

    return NextResponse.json(mealPlan);
  } catch (error) {
    console.error('Update meal plan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 