import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';

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

export async function POST(request: NextRequest) {
  try {
    const { deviceId } = await request.json();

    // Validate input
    if (!deviceId || !deviceId.startsWith('guest_')) {
      return NextResponse.json(
        { error: 'Valid guest device ID is required' },
        { status: 400 }
      );
    }

    // Check if guest user already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('id', '==', deviceId));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Guest user already exists, return existing user
      const existingUser = querySnapshot.docs[0].data();
      const token = Buffer.from(JSON.stringify({ userId: existingUser.id })).toString('base64');
      
      return NextResponse.json({
        token,
        user: {
          id: existingUser.id,
          name: existingUser.name,
          isGuest: true,
          onboardingCompleted: existingUser.onboardingCompleted || false,
          aiUsageCount: existingUser.aiUsageCount || 0,
          shoppingListUsageCount: existingUser.shoppingListUsageCount || 0,
        },
      });
    }

    // Create new guest user document
    const userRef = doc(db, 'users', deviceId);
    const guestUser = {
      id: deviceId,
      name: 'Guest User',
      isGuest: true,
      createdAt: new Date(),
      onboardingCompleted: false,
      cuisinePreferences: [],
      dishPreferences: {
        breakfast: [],
        lunch_dinner: []
      },
      aiUsageCount: 0,
      shoppingListUsageCount: 0,
      guestUsageLimits: {
        aiGeneration: parseInt(process.env.GUEST_AI_LIMIT || '3'),
        shoppingList: parseInt(process.env.GUEST_SHOPPING_LIST_LIMIT || '3')
      }
    };

    await setDoc(userRef, guestUser);

    // Create a JWT-like token (for MVP, we'll use a simple token)
    const token = Buffer.from(JSON.stringify({ userId: guestUser.id })).toString('base64');

    return NextResponse.json({
      token,
      user: {
        id: guestUser.id,
        name: guestUser.name,
        isGuest: true,
        onboardingCompleted: false,
        aiUsageCount: 0,
        shoppingListUsageCount: 0,
      },
    });
  } catch (error) {
    console.error('Guest user creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const deviceId = url.searchParams.get('deviceId');

    if (!deviceId || !deviceId.startsWith('guest_')) {
      return NextResponse.json(
        { error: 'Valid guest device ID is required' },
        { status: 400 }
      );
    }

    // Find guest user by device ID
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('id', '==', deviceId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { error: 'Guest user not found' },
        { status: 404 }
      );
    }

    const guestUser = querySnapshot.docs[0].data();
    
    return NextResponse.json({
      user: {
        id: guestUser.id,
        name: guestUser.name,
        isGuest: true,
        onboardingCompleted: guestUser.onboardingCompleted || false,
        aiUsageCount: guestUser.aiUsageCount || 0,
        shoppingListUsageCount: guestUser.shoppingListUsageCount || 0,
        cuisinePreferences: guestUser.cuisinePreferences || [],
        dishPreferences: guestUser.dishPreferences || { breakfast: [], lunch_dinner: [] },
        dietaryPreferences: guestUser.dietaryPreferences,
      },
    });
  } catch (error) {
    console.error('Guest user fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
