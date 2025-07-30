import { NextRequest, NextResponse } from 'next/server';
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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
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