import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getWeekStartDate, formatDate } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Initialize Google AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    const { weekStartDate } = await request.json();

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

    if (history.length < 1) {
      return NextResponse.json(
        { error: 'Need at least 1 week of meal history to generate suggestions' },
        { status: 400 }
      );
    }

    // Get user dietary preferences
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('__name__', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    const userData = userSnapshot.docs[0]?.data();
    const dietaryPreferences = userData?.dietaryPreferences;

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(history, weekStartDate, dietaryPreferences);

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

async function generateAISuggestions(history: any[], weekStartDate: string, dietaryPreferences?: any) {
  // Prepare history for AI
  const historyText = history.map(plan => {
    const meals = plan.meals;
    const weekInfo = `Week of ${plan.weekStartDate}:\n`;
    const mealsText = Object.entries(meals).map(([day, dayMeals]: [string, any]) => {
      return `  ${day}: ${dayMeals.breakfast || 'empty'} / ${dayMeals.lunch || 'empty'} / ${dayMeals.dinner || 'empty'}`;
    }).join('\n');
    return weekInfo + mealsText;
  }).join('\n\n');

  // Prepare dietary preferences
  const dietaryInfo = dietaryPreferences ? 
    `Dietary Preferences: ${dietaryPreferences.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}, Non-veg days: ${dietaryPreferences.nonVegDays?.join(', ') || 'none'}` :
    'No specific dietary preferences';

  const prompt = `Based on the following meal history and dietary preferences, suggest meals for the week of ${weekStartDate}.

${dietaryInfo}

Meal History:
${historyText}

Please suggest meals for each day (breakfast, lunch, dinner) that are:
1. Similar to the user's historical preferences
2. Respect their dietary restrictions
3. Varied and healthy
4. Easy to prepare

Return the suggestions in this exact JSON format:
{
  "monday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" },
  "tuesday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" },
  "wednesday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" },
  "thursday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" },
  "friday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" },
  "saturday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" },
  "sunday": { "breakfast": "meal name", "lunch": "meal name", "dinner": "meal name" }
}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid AI response format - no JSON found in response');
  }

  const suggestions = JSON.parse(jsonMatch[0]);
  return suggestions;
} 