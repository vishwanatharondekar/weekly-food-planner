import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { fetchMealImages, extractMealNames, enhanceMealsWithImages } from '@/lib/meal-image-utils';

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
      const mealNames = extractMealNames(data.meals);
      
      // Fetch meal images from Firestore
      const mealImages = await fetchMealImages(mealNames);
      
      // Enhance meals with image URLs
      const enhancedMeals = enhanceMealsWithImages(data.meals, mealImages);
      
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