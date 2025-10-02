import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { DEFAULT_MEAL_SETTINGS } from '@/lib/utils';

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

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify this is a guest user
    if (!userId.startsWith('guest_')) {
      return NextResponse.json(
        { error: 'This endpoint is only for guest account upgrades' },
        { status: 400 }
      );
    }

    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if email is already registered
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email));
    const emailQuerySnapshot = await getDocs(emailQuery);

    if (!emailQuerySnapshot.empty) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Get current guest user data
    const guestUserRef = doc(db, 'users', userId);
    const guestUserDoc = await getDoc(guestUserRef);

    if (!guestUserDoc.exists()) {
      return NextResponse.json(
        { error: 'Guest user not found' },
        { status: 404 }
      );
    }

    const guestUserData = guestUserDoc.data();

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new registered user document with a new ID
    const newUserRef = doc(collection(db, 'users'));
    const upgradedUser = {
      id: newUserRef.id,
      email,
      name,
      password: hashedPassword,
      isGuest: false, // No longer a guest
      createdAt: new Date(),
      upgradedAt: new Date(),
      previousGuestId: userId, // Keep track of the original guest ID
      
      // Preserve all guest data
      onboardingCompleted: guestUserData.onboardingCompleted || false,
      cuisinePreferences: guestUserData.cuisinePreferences || [],
      dishPreferences: guestUserData.dishPreferences || { breakfast: [], lunch_dinner: [] },
      dietaryPreferences: guestUserData.dietaryPreferences,
      mealSettings: guestUserData.mealSettings || DEFAULT_MEAL_SETTINGS,
      ingredients: guestUserData.ingredients || [],
      
      // Reset usage counts since they now have unlimited access
      aiUsageCount: 0,
      shoppingListUsageCount: 0,
      // Remove guest usage limits since they're now unlimited
    };

    await setDoc(newUserRef, upgradedUser);

    // Update all meal plans to use the new user ID
    try {
      const mealPlansRef = collection(db, 'mealPlans');
      const mealPlansQuery = query(mealPlansRef, where('userId', '==', userId));
      const mealPlansSnapshot = await getDocs(mealPlansQuery);

      const updatePromises = mealPlansSnapshot.docs.map(async (mealPlanDoc) => {
        const mealPlanData = mealPlanDoc.data();

        // Create a new meal plan doc for the upgraded user
        const newMealPlanId = `${newUserRef.id}_${mealPlanData.weekStartDate}`;
        const newMealPlanData = {
          ...mealPlanData,
          id: newMealPlanId,
          userId: newUserRef.id,
          upgradedAt: new Date(),
        };

        return setDoc(doc(db, 'mealPlans', newMealPlanId), newMealPlanData);
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating meal plans during upgrade:', error);
      // Don't fail the upgrade if meal plan update fails
    }

    // Note: We keep the old guest user document for audit purposes
    // but mark it as upgraded
    try {
      await setDoc(guestUserRef, {
        ...guestUserData,
        upgradedTo: newUserRef.id,
        upgradedAt: new Date(),
        isUpgraded: true,
      }, { merge: true });
    } catch (error) {
      console.error('Error marking guest user as upgraded:', error);
      // Don't fail the upgrade if this fails
    }

    // Create a new token for the upgraded user
    const token = Buffer.from(JSON.stringify({ userId: newUserRef.id })).toString('base64');

    return NextResponse.json({
      token,
      user: {
        id: newUserRef.id,
        email: upgradedUser.email,
        name: upgradedUser.name,
        isGuest: false,
        onboardingCompleted: upgradedUser.onboardingCompleted,
        cuisinePreferences: upgradedUser.cuisinePreferences,
        dishPreferences: upgradedUser.dishPreferences,
        dietaryPreferences: upgradedUser.dietaryPreferences,
        aiUsageCount: 0,
        shoppingListUsageCount: 0,
      },
      message: 'Guest account successfully upgraded to registered account'
    });
  } catch (error) {
    console.error('Guest upgrade error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
