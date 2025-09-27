import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, updateDoc, getDoc } from 'firebase/firestore';
import { verifyUnsubscribeToken } from '@/lib/jwt-utils';

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
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the JWT token
    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    const { email, userId } = decoded;

    console.log('userId : ', userId);
    console.log('email : ', email);

    // Get the user document
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Verify the email matches
    if (userData.email !== email) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Update user preferences to unsubscribe
    await updateDoc(userRef, {
      emailPreferences: {
        weeklyMealPlans: false,
        unsubscribedAt: new Date(),
        unsubscribeToken: token, // Store the token used for audit trail
      },
      updatedAt: new Date(),
    });

    console.log(`User ${email} (${userId}) unsubscribed from weekly meal plans`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from weekly meal plan emails',
      email: email,
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the JWT token
    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    const { email, userId } = decoded;

    console.log('userId : ', userId);
    console.log('email : ', email);

    // Get the user document to verify
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();

    // Verify the email matches
    if (userData.email !== email) {
      return NextResponse.json(
        { error: 'Email mismatch' },
        { status: 400 }
      );
    }

    // Check if already unsubscribed
    const isUnsubscribed = userData.emailPreferences?.weeklyMealPlans === false;

    return NextResponse.json({
      success: true,
      email: email,
      isUnsubscribed: isUnsubscribed,
      message: isUnsubscribed 
        ? 'You are already unsubscribed from weekly meal plan emails'
        : 'Token is valid. You can proceed with unsubscribe.'
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}