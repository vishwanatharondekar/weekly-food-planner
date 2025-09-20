import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { formatDate } from '@/lib/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { INDIAN_CUISINES, getDishesForCuisines } from '@/lib/cuisine-data';

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

    

    // Get user dietary preferences, cuisine preferences, and dish preferences
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('__name__', '==', userId));
    const userSnapshot = await getDocs(userQuery);
    const userData = userSnapshot.docs[0]?.data();
    const dietaryPreferences = userData?.dietaryPreferences;
    const cuisinePreferences = userData?.cuisinePreferences || [];
    const dishPreferences = userData?.dishPreferences || { breakfast: [], lunch_dinner: [] };

    // If no history, check if user has cuisine preferences or dish preferences
    if (history.length < 1 && cuisinePreferences.length === 0 && 
        (dishPreferences.breakfast.length === 0 || dishPreferences.lunch_dinner.length === 0)) {
      return NextResponse.json(
        { error: 'Need at least 1 week of meal history, cuisine preferences, or dish preferences to generate suggestions' },
        { status: 400 }
      );
    }

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(history, weekStartDate, dietaryPreferences, cuisinePreferences, dishPreferences);

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

async function generateAISuggestions(history: any[], weekStartDate: string, dietaryPreferences?: any, cuisinePreferences: string[] = [], dishPreferences: { breakfast: string[], lunch_dinner: string[] } = { breakfast: [], lunch_dinner: [] }) {
  // Prepare history for AI
  const historyText = history.length > 0 ? history.map(plan => {
    const meals = plan.meals;
    const weekInfo = `Week of ${plan.weekStartDate}:\n`;
    const mealsText = Object.entries(meals).map(([day, dayMeals]: [string, any]) => {
      return `  ${day}: ${dayMeals.breakfast || 'empty'} / ${dayMeals.morningSnack || 'empty'} / ${dayMeals.lunch || 'empty'} / ${dayMeals.eveningSnack || 'empty'} / ${dayMeals.dinner || 'empty'}`;
    }).join('\n');
    return weekInfo + mealsText;
  }).join('\n\n') : 'No previous meal history available.';

  // Prepare dietary preferences
  const dietaryInfo = dietaryPreferences ? 
    `Dietary Preferences: ${dietaryPreferences.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}, Non-veg days: ${dietaryPreferences.nonVegDays?.join(', ') || 'none'}` :
    'No specific dietary preferences';

  // Prepare cuisine preferences and get available dishes
  let cuisineInfo = 'No specific cuisine preferences';
  let availableDishes = '';
  
  // Check if user has specific dish preferences (from onboarding)
  const hasDishPreferences = dishPreferences.breakfast.length > 0 && dishPreferences.lunch_dinner.length > 0;
  
  if (hasDishPreferences) {
    // Use user's specific dish preferences from onboarding
    cuisineInfo = `User has selected specific dish preferences from onboarding`;
    availableDishes = `
User's preferred dishes:
Breakfast: ${dishPreferences.breakfast.join(', ')}
Lunch/Dinner: ${dishPreferences.lunch_dinner.join(', ')}`;
  } else if (cuisinePreferences.length > 0) {
    // Fallback to cuisine-based dish selection
    cuisineInfo = `Preferred Cuisines: ${cuisinePreferences.join(', ')}`;
    
    // Get dishes from selected cuisines
    const cuisineDishes = getDishesForCuisines(cuisinePreferences);
    
    // Create a comprehensive list of available dishes
    const breakfastDishes = cuisineDishes.breakfast.slice(0, 15); // Limit to avoid token limits
    const lunchDinnerDishes = cuisineDishes.lunch_dinner.slice(0, 20);
    const snackDishes = cuisineDishes.snacks.slice(0, 15);
    
    availableDishes = `
Available dishes from selected cuisines:
Breakfast: ${breakfastDishes.join(', ')}
Lunch/Dinner: ${lunchDinnerDishes.join(', ')}
Snacks: ${snackDishes.join(', ')}`;
  }

  const prompt = `Based on the following meal history, dietary preferences, and preferences, suggest meals for the week of ${weekStartDate}.

${dietaryInfo}
${cuisineInfo}
${availableDishes}

Meal History:
${historyText}

Please suggest meals for each day (breakfast, morning snack, lunch, evening snack, dinner) that are:
${history.length > 0 ? '1. Similar to the user\'s historical preferences' : hasDishPreferences ? '1. Based on their specific dish preferences from onboarding' : '1. Based on their cuisine preferences and dietary restrictions'}
2. Respect their dietary restrictions
3. ${hasDishPreferences ? 'Focus on their selected dish preferences' : cuisinePreferences.length > 0 ? `Focus on their preferred cuisines: ${cuisinePreferences.join(', ')}` : 'Use any appropriate cuisine'}
4. Varied and healthy
5. Easy to prepare
${hasDishPreferences ? '6. Select dishes primarily from their preferred dishes list provided above' : cuisinePreferences.length > 0 ? `6. Include authentic dishes from: ${cuisinePreferences.join(', ')}` : ''}
${history.length === 0 && (hasDishPreferences || cuisinePreferences.length > 0) ? '7. Select dishes primarily from the available dishes list provided above' : ''}

Return the suggestions in this exact JSON format:
{
  "monday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" },
  "tuesday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" },
  "wednesday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" },
  "thursday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" },
  "friday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" },
  "saturday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" },
  "sunday": { "breakfast": "meal name", "morningSnack": "snack name", "lunch": "meal name", "eveningSnack": "snack name", "dinner": "meal name" }
}`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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