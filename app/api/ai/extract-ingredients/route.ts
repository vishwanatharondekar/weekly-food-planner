import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

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

    const { meals, portions = 1 } = await request.json();

    if (!meals || !Array.isArray(meals)) {
      return NextResponse.json({ error: 'Invalid meals data' }, { status: 400 });
    }

    // Check if this is a guest user and enforce usage limits for shopping list generation
    if (userId.startsWith('guest_')) {
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

    const result = await extractIngredientsWithAI(meals, portions);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Ingredient extraction error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to extract ingredients',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

async function extractIngredientsWithAI(meals: string[], portions: number = 1): Promise<{ grouped: any[], consolidated: string[], weights: { [ingredient: string]: { amount: number, unit: string } } }> {
  const prompt = `
You are a helpful cooking assistant. Given a list of meal names and the number of portions, extract the main ingredients needed to cook these dishes with their quantities.

Meal names: ${meals.join(', ')}
Number of portions: ${portions}

Please return a JSON object with three properties:
1. "grouped": An array of objects where each object has the meal name as key and an array of ingredients with quantities as value
2. "consolidated": An array of all unique ingredients needed for all meals
3. "weights": An object where each ingredient is mapped to its total quantity needed (amount and unit)

For each ingredient, provide realistic quantities based on the number of portions. Use appropriate units (grams, kilograms, pieces, cups, etc.).

Focus on the main ingredients that would be needed for shopping. Avoid secondary ingredients. Add packed spices as separate ingredients.

Example response format:
{
  "grouped": [
    {"Baigan Fry": ["brinjal 500g", "onions 200g", "tomatoes 300g"]},
    {"Paneer Sabji": ["paneer 250g", "onions 200g", "tomatoes 300g"]},
    {"Egg Curry": ["eggs 6 pieces", "onions 200g", "tomatoes 300g"]}
  ],
  "consolidated": ["brinjal", "paneer", "eggs", "onions", "tomatoes"],
  "weights": {
    "brinjal": {"amount": 500, "unit": "g"},
    "paneer": {"amount": 250, "unit": "g"},
    "eggs": {"amount": 6, "unit": "pieces"},
    "onions": {"amount": 600, "unit": "g"},
    "tomatoes": {"amount": 900, "unit": "g"}
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
      if (result.grouped && result.consolidated) {
        return {
          grouped: Array.isArray(result.grouped) ? result.grouped : [],
          consolidated: Array.isArray(result.consolidated) ? result.consolidated : [],
          weights: result.weights && typeof result.weights === 'object' ? result.weights : {}
        };
      }
    }
    
    // If no valid JSON object found, try to parse the entire response
    const result = JSON.parse(text);
    
    if (result.grouped && result.consolidated) {
      return {
        grouped: Array.isArray(result.grouped) ? result.grouped : [],
        consolidated: Array.isArray(result.consolidated) ? result.consolidated : [],
        weights: result.weights && typeof result.weights === 'object' ? result.weights : {}
      };
    }
    
    // Fallback: if structure is not as expected, return empty
    return { grouped: [], consolidated: [], weights: {} };
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    // Fallback: return empty structure, the client will use basic extraction
    return { grouped: [], consolidated: [], weights: {} };
  }
} 