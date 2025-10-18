import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, doc, setDoc } from 'firebase/firestore';
import { formatDate } from '@/lib/utils';
import { generateAISuggestions } from '@/lib/ai-generation-utils';

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

export async function POST(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { weekStartDate, ingredients = [] } = await request.json();

    // Check if this is a guest user and enforce usage limits
    if (userId.startsWith('guest_')) {
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('__name__', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      const userData = userSnapshot.docs[0]?.data();
      
      if (userData) {
        const currentUsage = userData.aiUsageCount || 0;
        const usageLimit = userData.guestUsageLimits?.aiGeneration || parseInt(process.env.GUEST_AI_LIMIT || '3');
        
        if (currentUsage >= usageLimit) {
          return NextResponse.json(
            { 
              error: `Guest users are limited to ${usageLimit} AI generations. Please create an account for unlimited access.`,
              isGuestLimitReached: true,
              usageLimit,
              currentUsage
            },
            { status: 403 }
          );
        }
        
        // Increment usage count
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { 
          ...userData, 
          aiUsageCount: currentUsage + 1 
        }, { merge: true });
      }
    }

    // Get meal history for the target week
    const referenceWeekStart = new Date(weekStartDate);
    const referenceWeekStartStr = formatDate(referenceWeekStart);

    const mealPlansRef = collection(db, 'mealPlans');
    const q = query(
      mealPlansRef,
      where('userId', '==', userId),
      where('weekStartDate', '<', referenceWeekStartStr),
      orderBy('weekStartDate', 'desc'),
      limit(5)
    );

    const querySnapshot = await getDocs(q);
    const history: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      });
    });

    

    // Get user dietary preferences, cuisine preferences, and dish preferences
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('__name__', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    const userData = userSnapshot.docs[0]?.data();
    const dietaryPreferences = userData?.dietaryPreferences;
    const cuisinePreferences = userData?.cuisinePreferences || [];
    const dishPreferences = userData?.dishPreferences || { breakfast: [], lunch_dinner: [] };
    const mealSettings = userData?.mealSettings;

    // If no history, check if user has cuisine preferences or dish preferences
    if (history.length < 1 && cuisinePreferences.length === 0 && 
        (dishPreferences.breakfast.length === 0 || dishPreferences.lunch_dinner.length === 0)) {
      return NextResponse.json(
        { error: 'Need at least 1 week of meal history, cuisine preferences, or dish preferences to generate suggestions' },
        { status: 400 }
      );
    }

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(
      history, 
      weekStartDate, 
      dietaryPreferences, 
      cuisinePreferences, 
      dishPreferences, 
      ingredients,
      mealSettings,
    );

    return NextResponse.json(suggestions);
  } catch (error: any) {
    console.error('AI generation error:', error);
    
    // Return the actual error message to the client
    return NextResponse.json(
      { 
        error: error.message || 'AI generation failed',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
