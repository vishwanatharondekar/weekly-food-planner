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

    const { cuisinePreferences, onboardingCompleted } = await request.json();

    // Validate input
    if (!Array.isArray(cuisinePreferences)) {
      return NextResponse.json(
        { error: 'Cuisine preferences must be an array' },
        { status: 400 }
      );
    }

    // Update user document
    const userRef = doc(db, 'users', tokenData.userId);
    await updateDoc(userRef, {
      cuisinePreferences,
      onboardingCompleted: onboardingCompleted || false,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Cuisine preferences updated successfully',
    });
  } catch (error) {
    console.error('Cuisine preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}