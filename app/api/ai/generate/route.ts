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

    const { weekStartDate, ingredients = [] } = await request.json();

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

function getDietaryInfo(dietaryPreferences: any) {
  if (!dietaryPreferences) {
    return 'No specific dietary preferences';
  }

  let returnString  = `Dietary Preferences: `
  
  if (dietaryPreferences.isVegetarian) {
    returnString += `The user is strictly vegetarian. Never suggest non-vegetarian meals.
Exclude any dish with meat, fish, or eggs. 
If uncertain, default to a vegetarian option.`;
  } else {
    returnString += `Non-vegetarian,User can eat non veg only on the days: ${dietaryPreferences.nonVegDays?.join(', ') || 'none'}. Exclude any dish with meat, fish, or eggs on other days.`;
  }

  return returnString;
}

function getJsonFormat(mealSettings?: { enabledMealTypes: string[] }){
  // Default to all meal types if no settings provided (backward compatibility)
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
  
  // Create meal entries for each enabled meal type
  const mealEntries = enabledMeals.map(mealType => `"${mealType}": "meal name"`).join(', ');
  
  // Create the JSON structure for each day
  const dayStructure = `{ ${mealEntries} }`;
  
  // Create the full JSON format with all days
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayEntries = days.map(day => `"${day}": ${dayStructure}`).join(',\n            ');
  
  return `{
            ${dayEntries}
          }`;
}

function isWeekEmpty(meals: any, enabledMeals: string[]) {
  console.log('meals : ', meals);
  return !Object.keys(meals).every(day => isDayEmpty(meals?.[day], enabledMeals));
}

function isDayEmpty(meals: any, enabledMeals: string[]) {
  return enabledMeals.every(mealType => !meals?.[mealType]?.name);
}

async function generateAISuggestions(history: any[], weekStartDate: string, dietaryPreferences?: any, cuisinePreferences: string[] = [], dishPreferences: { breakfast: string[], lunch_dinner: string[] } = { breakfast: [], lunch_dinner: [] }, ingredients: string[] = [], mealSettings?: { enabledMealTypes: string[] }) {
  // Prepare history for AI
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
  const historyText = history.length > 0 ? history
  .filter((plan: any) => isWeekEmpty(plan.meals, enabledMeals))
  .slice(0, 2)
  .map(plan => {
    const meals = plan.meals;
    const weekInfo = `Week of ${plan.weekStartDate}:\n`;
    const mealsText = Object.entries(meals)
                        .filter(([day, dayMeals]: [string, any]) => !isDayEmpty(dayMeals, enabledMeals))
                        .map(([day, dayMeals]: [string, any]) => {
                          const mealNames = enabledMeals.map(mealType => dayMeals?.[mealType]?.name || 'empty').join(' / ');
                          return `  ${day}: ${mealNames}`;
                        }).join('\n');
    return weekInfo + mealsText;
  }).join('\n\n') : 'No previous meal history available.';

  // Prepare dietary preferences
  const dietaryInfo = getDietaryInfo(dietaryPreferences);

  // Prepare ingredients information
  const ingredientsInfo = ingredients.length > 0 ? 
    `Available Ingredients: ${ingredients.join(', ')}` :
    '';

  // Prepare cuisine preferences and get available dishes
  let cuisineInfo = 'No specific cuisine preferences';
  let availableDishes = '';
  
  // Get JSON format for the prompt (needed regardless of cuisine/dish preferences)
  const jsonFormat = getJsonFormat(mealSettings);
  
  // Check if user has specific dish preferences (from onboarding)
  const hasDishPreferences = dishPreferences.breakfast.length > 0 && dishPreferences.lunch_dinner.length > 0;
  
  if (hasDishPreferences) {
    // Use user's specific dish preferences from onboarding
    cuisineInfo = `Include authentic dishes from: ${cuisinePreferences.join(', ')}`;
    availableDishes = `User's likes following dishes:
      Breakfast: ${dishPreferences.breakfast.join(', ')}
      Lunch/Dinner: ${dishPreferences.lunch_dinner.join(', ')}`;
  }

  const prompt = `Based on the following meal history, dietary preferences, available ingredients, and preferences, suggest meals for the week of ${weekStartDate}.

${dietaryInfo}
${ingredientsInfo}
${cuisineInfo}
${availableDishes}

Meal History:
${historyText}

Please suggest meals for each day (${enabledMeals.join(', ')}) that are:
${history.length > 0 ? '1. Similar to the users meal history but do not repeat the same meals' : '1. Similar to the their dish preferences but do not repeat the same meals'}
2. Respect their dietary restrictions
3. ${ingredients.length > 0 ? 'Use the ingredients listed above for some dishes' : 'Use common ingredients that are easily available'}
4. ${cuisinePreferences.length > 0 ? `Focus on their preferred cuisines: ${cuisinePreferences.join(', ')}` : 'Use any appropriate cuisine'}
5. Easy to prepare
6. Include authentic dishes from: ${cuisinePreferences.join(', ')}
7. Use the dishes provided above as reference for selecting other dishes
7. Do not repeat the suggestions. Provide new suggestions for each day.
8. Do not suggest the options which are present in the meal history provided above.

Return the suggestions in this exact JSON format:
${jsonFormat}`;

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