import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase only if not already initialized
try {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
} catch (error) {
  console.log('Firebase already initialized or error:', error);
}

const db = getFirestore();

// Helper function to get user ID from token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Invalid auth header format');
      return null;
    }

    const token = authHeader.substring(7);
    
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    
    return tokenData.userId;
  } catch (error) {
    console.error('Token parsing error:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    
    const userId = getUserIdFromToken(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRef = doc(db, 'users', userId);
    console.log('Fetching user document for ID:', userId);
    console.log('Database reference created:', userRef);
    
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.log('User document not found for ID:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    console.log('User data retrieved:', { 
      hasLanguagePreferences: !!userData?.languagePreferences,
      languagePreferences: userData?.languagePreferences 
    });
    
    const languagePreferences = userData?.languagePreferences || { language: 'en' };

    console.log('Returning language preferences:', languagePreferences);
    return NextResponse.json(languagePreferences);
  } catch (error) {
    console.error('Get language preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('Language preferences PUT request received');
    
    const userId = getUserIdFromToken(request);
    console.log('User ID extracted:', userId);
    
    if (!userId) {
      console.log('No user ID found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await request.json();
    console.log('Preferences received:', preferences);

    const userRef = doc(db, 'users', userId);
    console.log('Updating user document for ID:', userId);
    
    await updateDoc(userRef, {
      languagePreferences: preferences,
      updatedAt: serverTimestamp(),
    });

    console.log('User document updated successfully');
    
    const updatedUserDoc = await getDoc(userRef);
    const userData = updatedUserDoc.data();

    console.log('Updated user data:', {
      id: updatedUserDoc.id,
      email: userData?.email,
      name: userData?.name,
      languagePreferences: userData?.languagePreferences
    });

    return NextResponse.json({
      user: {
        id: updatedUserDoc.id,
        email: userData?.email,
        name: userData?.name,
        languagePreferences: userData?.languagePreferences,
      },
    });
  } catch (error) {
    console.error('Update language preferences error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 