import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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

export async function PUT(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { ingredients } = await request.json();

    // Validate input
    if (!Array.isArray(ingredients)) {
      return NextResponse.json(
        { error: 'Ingredients must be an array' },
        { status: 400 }
      );
    }

    // Update user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ingredients,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Ingredients updated successfully',
    });
  } catch (error) {
    console.error('Update ingredients error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}