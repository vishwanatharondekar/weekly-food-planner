import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { createHash } from 'crypto';

// Initialize Gemini AI (we'll import the extraction function)
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    return payload.userId;
  } catch (error) {
    return null;
  }
}

// Create a hash from meal plan data
function createMealPlanHash(
  meals: string[],
  dayWiseMeals: { [day: string]: { [mealType: string]: string } },
  portions: number
): string {
  // Normalize the meal plan data for consistent hashing
  const normalizedData = {
    meals: meals.sort(),
    dayWiseMeals: Object.keys(dayWiseMeals).sort().reduce((acc, day) => {
      acc[day] = Object.keys(dayWiseMeals[day]).sort().reduce((dayAcc, mealType) => {
        dayAcc[mealType] = dayWiseMeals[day][mealType];
        return dayAcc;
      }, {} as { [mealType: string]: string });
      return acc;
    }, {} as { [day: string]: { [mealType: string]: string } }),
    portions
  };

  const dataString = JSON.stringify(normalizedData);
  return createHash('sha256').update(dataString).digest('hex');
}

// Extract ingredients using AI
async function extractIngredientsWithAI(
  meals: string[],
  portions: number = 1,
  dayWiseMeals: { [day: string]: { [mealType: string]: string } }
): Promise<{
  categorized: { [category: string]: { name: string, amount: number, unit: string }[] };
  dayWise?: { [day: string]: { [mealType: string]: { name: string, ingredients: { name: string, amount: number, unit: string }[] } } };
}> {
  let prompt = `
You are a helpful cooking assistant. Given a list of meal names and the number of portions, extract the main ingredients needed to cook these dishes with their quantities.

Number of portions: ${portions}`;

  // Add day-wise information
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  prompt += `\n\nDay-wise meals:\n`;
  dayOrder.forEach(day => {
    if (dayWiseMeals[day]) {
      const mealsByDay = Object.entries(dayWiseMeals[day]);
      if (mealsByDay.length > 0) {
        prompt += `${day.charAt(0).toUpperCase() + day.slice(1)}:\n`;
        mealsByDay.forEach(([mealType, mealName]) => {
          prompt += `  - ${mealType}: ${mealName}\n`;
        });
      }
    }
  });

  prompt += `\n\nPlease return a JSON object with the following properties:
1. "dayWise": An object where each day contains meals with their ingredients
   For example: {
     "monday": {
       "breakfast": {
         "name": "Dosa",
         "ingredients": [
           {"name": "rice", "amount": 500, "unit": "g"},
           {"name": "urad dal", "amount": 150, "unit": "g"}
         ]
       }
     }
   }
2. "categorized": An object where ingredients are grouped by type with their quantities

For each ingredient, provide realistic quantities based on the number of portions. Use appropriate units (grams, kilograms, pieces, cups, etc.).

Focus on the main ingredients that would be needed for shopping. Avoid secondary ingredients. Add packed spices as separate ingredients.

Categorize ingredients into these types: "Vegetables", "Fruits", "Dairy & Eggs", "Meat & Seafood", "Grains & Pulses", "Spices & Herbs", "Pantry Items", "Other"

Example response format:
{
  "dayWise": {
    "monday": {
      "breakfast": {
        "name": "Dosa",
        "ingredients": [
          {"name": "rice", "amount": 500, "unit": "g"},
          {"name": "urad dal", "amount": 150, "unit": "g"},
          {"name": "pickle", "amount": 1, "unit": "serving"}
        ]
      }
    }
  },
  "categorized": {
    "Vegetables": [
      {"name": "brinjal", "amount": 500, "unit": "g"},
      {"name": "onions", "amount": 600, "unit": "g"},
      {"name": "tomatoes", "amount": 900, "unit": "g"}
    ],
    "Dairy & Eggs": [
      {"name": "paneer", "amount": 250, "unit": "g"},
      {"name": "eggs", "amount": 6, "unit": "pieces"}
    ]
  }
}

Return only the JSON object, nothing else.
`;

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    // Try to extract JSON object from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (result.categorized) {
        return {
          categorized: result.categorized && typeof result.categorized === 'object' ? result.categorized : {},
          dayWise: result.dayWise && typeof result.dayWise === 'object' ? result.dayWise : undefined
        };
      }
    }
    
    // If no valid JSON object found, try to parse the entire response
    const result = JSON.parse(text);

    if (result.categorized) {
      return {
        categorized: result.categorized && typeof result.categorized === 'object' ? result.categorized : {},
        dayWise: result.dayWise && typeof result.dayWise === 'object' ? result.dayWise : undefined
      };
    }
    
    // Fallback: if structure is not as expected, return empty
    return { categorized: {}, dayWise: undefined };
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    console.error('Raw AI response:', text);
    // Fallback: return empty structure, the client will use basic extraction
    return { categorized: {}, dayWise: undefined };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { meals, dayWiseMeals, portions = 1, weekStartDate } = await request.json();

    // Validate required fields
    if (!meals || !Array.isArray(meals)) {
      return NextResponse.json({ error: 'Invalid meals data' }, { status: 400 });
    }

    if (!dayWiseMeals || typeof dayWiseMeals !== 'object') {
      return NextResponse.json({ error: 'dayWiseMeals is required' }, { status: 400 });
    }

    if (!weekStartDate) {
      return NextResponse.json({ error: 'weekStartDate is required' }, { status: 400 });
    }

    // Initialize Firebase
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    };

    if (!getApps().length) {
      initializeApp(firebaseConfig);
    }

    const db = getFirestore();
    const shoppingListsCollection = 'shoppingLists';

    // Create hash from meal plan
    const mealPlanHash = createMealPlanHash(meals, dayWiseMeals, portions);

    // Check if shopping list exists in DB for this user and week
    const shoppingListRef = doc(db, shoppingListsCollection, `${userId}_${weekStartDate}`);
    const shoppingListDoc = await getDoc(shoppingListRef);

    let existingShoppingList: any = null;
    if (shoppingListDoc.exists()) {
      existingShoppingList = { id: shoppingListDoc.id, ...shoppingListDoc.data() };
    }

    // If shopping list exists and hash matches, return cached result
    if (existingShoppingList && existingShoppingList.mealPlanHash === mealPlanHash) {
      return NextResponse.json({
        categorized: existingShoppingList.categorized || {},
        dayWise: existingShoppingList.dayWise,
        cached: true
      });
    }

    // If shopping list exists but hash doesn't match, delete the old one
    if (existingShoppingList && existingShoppingList.mealPlanHash !== mealPlanHash) {
      await deleteDoc(shoppingListRef);
    }

    // Check if this is a guest user and enforce usage limits for shopping list generation
    if (userId.startsWith('guest_')) {
      const usersRef = collection(db, 'users');
      const userQuery = query(usersRef, where('__name__', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      const userData = userSnapshot.docs[0]?.data();
      
      if (userData) {
        const currentUsage = userData.shoppingListUsageCount || 0;
        const usageLimit = userData.guestUsageLimits?.shoppingList || parseInt(process.env.GUEST_SHOPPING_LIST_LIMIT || '3');
        
        if (currentUsage >= usageLimit) {
          return NextResponse.json(
            { 
              error: `Guest users are limited to ${usageLimit} shopping list generations. Please create an account for unlimited access.`,
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
          shoppingListUsageCount: currentUsage + 1 
        }, { merge: true });
      }
    }

    // Extract ingredients using AI
    const result = await extractIngredientsWithAI(meals, portions, dayWiseMeals);

    // Save shopping list to DB
    const newShoppingListRef = doc(db, shoppingListsCollection, `${userId}_${weekStartDate}`);
    const now = new Date();
    await setDoc(newShoppingListRef, {
      userId,
      weekStartDate,
      mealPlanHash,
      categorized: result.categorized,
      dayWise: result.dayWise,
      portions,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now)
    });

    return NextResponse.json({
      ...result,
      cached: false
    });
  } catch (error: any) {
    console.error('Shopping list generation error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get shopping list',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

