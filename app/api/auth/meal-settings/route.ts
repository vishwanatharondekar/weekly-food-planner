import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { DEFAULT_MEAL_SETTINGS, type MealSettings, sortMealTypes } from '@/lib/utils';

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

// GET meal settings
export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const mealSettings = userData.mealSettings || DEFAULT_MEAL_SETTINGS;
      return NextResponse.json({ mealSettings });
    } else {
      return NextResponse.json({ mealSettings: DEFAULT_MEAL_SETTINGS });
    }
  } catch (error) {
    console.error('Error getting meal settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT meal settings
export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { mealSettings } = await request.json();

    // Validate meal settings
    if (!mealSettings || !Array.isArray(mealSettings.enabledMealTypes)) {
      return NextResponse.json(
        { error: 'Invalid meal settings format' },
        { status: 400 }
      );
    }

    // Ensure at least one meal type is enabled
    if (mealSettings.enabledMealTypes.length === 0) {
      return NextResponse.json(
        { error: 'At least one meal type must be enabled' },
        { status: 400 }
      );
    }

    // Ensure meal types are in the correct chronological order
    const orderedMealSettings = {
      ...mealSettings,
      enabledMealTypes: sortMealTypes(mealSettings.enabledMealTypes)
    };

    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      // Update existing user document
      await updateDoc(userDocRef, {
        mealSettings: orderedMealSettings,
        updatedAt: new Date()
      });
    } else {
      // Create new user document with meal settings
      await setDoc(userDocRef, {
        mealSettings: orderedMealSettings,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json({ 
      success: true,
      mealSettings: orderedMealSettings
    });
  } catch (error) {
    console.error('Error updating meal settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 