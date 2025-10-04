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

    const { meals } = await request.json();

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

    const result = await extractIngredientsWithAI(meals);
    
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

async function extractIngredientsWithAI(meals: string[]): Promise<{ grouped: any[], consolidated: string[] }> {
  const prompt = `
You are a helpful cooking assistant. Given a list of meal names, extract the main ingredients needed to cook these dishes.

Meal names: ${meals.join(', ')}

Please return a JSON object with two properties:
1. "grouped": An array of objects where each object has the meal name as key and an array of ingredients as value
2. "consolidated": An array of all unique ingredients needed for all meals

Focus on the main ingredients that would be needed for shopping. Avoid secondary ingredients like spices, herbs, etc.

Example response format:
{
  "grouped": [
    {"Baigan Fry": ["brinjal", "onions", "tomatoes"]},
    {"Paneer Sabji": ["paneer", "onions", "tomatoes"]},
    {"Egg Curry": ["eggs", "onions", "tomatoes"]}
  ],
  "consolidated": ["brinjal", "paneer", "eggs", "onions", "tomatoes"]
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
          consolidated: Array.isArray(result.consolidated) ? result.consolidated : []
        };
      }
    }
    
    // If no valid JSON object found, try to parse the entire response
    const result = JSON.parse(text);
    
    if (result.grouped && result.consolidated) {
      return {
        grouped: Array.isArray(result.grouped) ? result.grouped : [],
        consolidated: Array.isArray(result.consolidated) ? result.consolidated : []
      };
    }
    
    // Fallback: if structure is not as expected, return empty
    return { grouped: [], consolidated: [] };
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    // Fallback: return empty structure, the client will use basic extraction
    return { grouped: [], consolidated: [] };
  }
} 