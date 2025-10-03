import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

export async function GET(request: NextRequest) {
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

    // Get user from database
    const userRef = doc(db, 'users', tokenData.userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    return NextResponse.json({
      user: {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        isGuest: userData.isGuest || false,
        dietaryPreferences: userData.dietaryPreferences,
        onboardingCompleted: userData.onboardingCompleted || false,
        cuisinePreferences: userData.cuisinePreferences || [],
        dishPreferences: userData.dishPreferences || { breakfast: [], lunch_dinner: [] },
        ingredients: userData.ingredients || [],
        // Include usage counts for guest users
        aiUsageCount: userData.aiUsageCount || 0,
        shoppingListUsageCount: userData.shoppingListUsageCount || 0,
        guestUsageLimits: userData.guestUsageLimits || {
          aiGeneration: parseInt(process.env.GUEST_AI_LIMIT || '3'),
          shoppingList: parseInt(process.env.GUEST_SHOPPING_LIST_LIMIT || '3')
        },
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 