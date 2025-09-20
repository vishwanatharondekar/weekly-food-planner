import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

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

export async function PUT(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());

    const { dishPreferences, onboardingCompleted } = await request.json();

    // Validate input
    if (!dishPreferences || typeof dishPreferences !== 'object') {
      return NextResponse.json(
        { error: 'Dish preferences must be an object' },
        { status: 400 }
      );
    }

    const { breakfast, lunch_dinner } = dishPreferences;

    // Validate breakfast and lunch_dinner arrays
    if (!Array.isArray(breakfast) || !Array.isArray(lunch_dinner)) {
      return NextResponse.json(
        { error: 'Breakfast and lunch_dinner must be arrays' },
        { status: 400 }
      );
    }

    if (breakfast.length === 0 || lunch_dinner.length === 0) {
      return NextResponse.json(
        { error: 'At least one breakfast and one lunch/dinner option must be selected' },
        { status: 400 }
      );
    }

    // Update user document
    const userRef = doc(db, 'users', tokenData.userId);
    await updateDoc(userRef, {
      dishPreferences: {
        breakfast,
        lunch_dinner
      },
      onboardingCompleted: onboardingCompleted || false,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Dish preferences updated successfully',
    });
  } catch (error) {
    console.error('Dish preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}