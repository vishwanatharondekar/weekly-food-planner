import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, orderBy, limit } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { formatDate, getWeekStartDate } from '@/lib/utils';
import { sendBulkEmails, type EmailData } from '@/lib/ses-service';
import { generateMealPlanEmail, generateMealPlanTextEmail, type MealPlanEmailData } from '@/lib/email-templates';
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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting weekly meal plan generation and email sending...');

    // Get the next week's start date (Saturday morning, so next week)
    const nextWeekStart = getWeekStartDate(new Date());
    const nextWeekStartStr = formatDate(nextWeekStart);

    console.log(`Generating meal plans for week starting: ${nextWeekStartStr}`);

    // Get all users who have completed onboarding and haven't unsubscribed
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef,
      where('onboardingCompleted', '==', true)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      console.log('No users found with completed onboarding');
      return NextResponse.json({ 
        message: 'No users to process',
        processed: 0,
        success: 0,
        failed: 0
      });
    }

    console.log(`Found ${usersSnapshot.docs.length} users to process`);

    const emails: EmailData[] = [];
    let processed = 0;

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        console.log(`Processing user: ${userData.email}`);

        // Check if user has unsubscribed from emails
        const emailPreferences = userData.emailPreferences;
        if (emailPreferences?.weeklyMealPlans === false) {
          console.log(`User ${userData.email} has unsubscribed from weekly meal plans, skipping`);
          continue;
        }

        // Check if meal plan already exists for this week
        const mealPlanRef = doc(db, 'mealPlans', `${userId}_${nextWeekStartStr}`);
        const existingPlan = await getDocs(query(collection(db, 'mealPlans'), where('__name__', '==', `${userId}_${nextWeekStartStr}`)));
        
        if (!existingPlan.empty) {
          console.log(`Meal plan already exists for user ${userData.email}, skipping generation`);
          continue;
        }

        // Generate meal plan for this user
        const mealPlan = await generateMealPlanForUser(userId, userData, nextWeekStartStr);
        
        if (mealPlan) {
          // Store the meal plan
          await setDoc(mealPlanRef, {
            ...mealPlan,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          // Generate email
          const emailData: MealPlanEmailData = {
            userName: userData.name || 'Valued User',
            weekStartDate: nextWeekStartStr,
            userEmail: userData.email,
            userId: userId,
            meals: mealPlan.meals,
            mealSettings: userData.mealSettings
          };

          const htmlBody = generateMealPlanEmail(emailData);
          const textBody = generateMealPlanTextEmail(emailData);

          emails.push({
            to: userData.email,
            subject: `🍽️ Your Weekly Meal Plan - Week of ${nextWeekStartStr}`,
            htmlBody,
            textBody
          });

          processed++;
          console.log(`Generated meal plan for user: ${userData.email}`);
        }
      } catch (error) {
        console.error(`Error processing user ${userDoc.id}:`, error);
        continue;
      }
    }

    // Send all emails
    console.log(`Sending ${emails.length} emails...`);
    const emailResults = await sendBulkEmails(emails);

    console.log(`Weekly meal plan process completed. Processed: ${processed}, Emails sent: ${emailResults.success}, Failed: ${emailResults.failed}`);

    return NextResponse.json({
      message: 'Weekly meal plans generated and sent successfully',
      processed,
      emailsSent: emailResults.success,
      emailsFailed: emailResults.failed,
      weekStartDate: nextWeekStartStr
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function generateMealPlanForUser(userId: string, userData: any, weekStartDate: string) {
  try {
    // Get meal history for the user
    const mealPlansRef = collection(db, 'mealPlans');
    const historyQuery = query(
      mealPlansRef,
      where('userId', '==', userId),
      where('weekStartDate', '<', weekStartDate),
      orderBy('weekStartDate', 'desc'),
      limit(5)
    );

    const historySnapshot = await getDocs(historyQuery);
    const history: any[] = [];

    historySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      });
    });

    const dietaryPreferences = userData.dietaryPreferences;
    const cuisinePreferences = userData.cuisinePreferences || [];
    const dishPreferences = userData.dishPreferences || { breakfast: [], lunch_dinner: [] };
    const mealSettings = userData.mealSettings;

    // If no history and no preferences, skip this user
    if (history.length < 1 && cuisinePreferences.length === 0 && 
        (dishPreferences.breakfast.length === 0 || dishPreferences.lunch_dinner.length === 0)) {
      console.log(`Skipping user ${userData.email} - no history or preferences`);
      return null;
    }

    // Generate AI suggestions
    const suggestions = await generateAISuggestions(
      history,
      weekStartDate,
      dietaryPreferences,
      cuisinePreferences,
      dishPreferences,
      [],
      mealSettings
    );

    if (suggestions && suggestions.meals) {
      return {
        userId,
        weekStartDate,
        meals: suggestions.meals,
        generatedAt: new Date(),
        aiGenerated: true
      };
    }

    return null;
  } catch (error) {
    console.error(`Error generating meal plan for user ${userId}:`, error);
    return null;
  }
}

// Helper functions (copied from the existing generate route)
function getDietaryInfo(dietaryPreferences: any) {
  if (!dietaryPreferences) {
    return 'No specific dietary preferences';
  }

  let returnString = `Dietary Preferences: `;
  
  if (dietaryPreferences.isVegetarian) {
    returnString += `The user is strictly vegetarian. Never suggest non-vegetarian meals.
Exclude any dish with meat, fish, or eggs. 
If uncertain, default to a vegetarian option.`;
  } else {
    returnString += `Non-vegetarian,User can eat non veg only on the days: ${dietaryPreferences.nonVegDays?.join(', ') || 'none'}. Exclude any dish with meat, fish, or eggs on other days.`;
  }

  return returnString;
}

function getJsonFormat(mealSettings?: { enabledMealTypes: string[] }) {
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
  
  const mealEntries = enabledMeals.map(mealType => `"${mealType}": "meal name"`).join(',\n      ');
  
  return `{
    "monday": {
      ${mealEntries}
    },
    "tuesday": {
      ${mealEntries}
    },
    "wednesday": {
      ${mealEntries}
    },
    "thursday": {
      ${mealEntries}
    },
    "friday": {
      ${mealEntries}
    },
    "saturday": {
      ${mealEntries}
    },
    "sunday": {
      ${mealEntries}
    }
  }`;
}

function isWeekEmpty(meals: any, enabledMeals: string[]) {
  if (!meals) return true;
  
  return Object.values(meals).every((dayMeals: any) => {
    if (!dayMeals) return true;
    return enabledMeals.every(mealType => !dayMeals[mealType] || dayMeals[mealType].trim() === '');
  });
}

function isDayEmpty(meals: any, enabledMeals: string[]) {
  if (!meals) return true;
  return enabledMeals.every(mealType => !meals[mealType] || meals[mealType].trim() === '');
}

async function generateAISuggestions(
  history: any[],
  weekStartDate: string,
  dietaryPreferences?: any,
  cuisinePreferences: string[] = [],
  dishPreferences: { breakfast: string[], lunch_dinner: string[] } = { breakfast: [], lunch_dinner: [] },
  ingredients: string[] = [],
  mealSettings?: { enabledMealTypes: string[] }
) {
  const enabledMeals = mealSettings?.enabledMealTypes || ['breakfast', 'morningSnack', 'lunch', 'eveningSnack', 'dinner'];
  const historyText = history.length > 0 ? history
    .filter((plan: any) => !isWeekEmpty(plan.meals, enabledMeals))
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

  const dietaryInfo = getDietaryInfo(dietaryPreferences);
  const ingredientsInfo = ingredients.length > 0 ? 
    `Must use all of the following ingredients in at least one dish: ${ingredients.join(', ')}` :
    '';

  let cuisineInfo = 'No specific cuisine preferences';
  let availableDishes = '';
  
  const jsonFormat = getJsonFormat(mealSettings);
  
  const hasDishPreferences = dishPreferences.breakfast.length > 0 && dishPreferences.lunch_dinner.length > 0;
  
  if (hasDishPreferences) {
    const allDishes = [...dishPreferences.breakfast, ...dishPreferences.lunch_dinner];
    cuisineInfo = `User has specific dish preferences from onboarding.`;
    availableDishes = `Available dishes to choose from: ${allDishes.join(', ')}. You must only suggest dishes from this list.`;
  } else if (cuisinePreferences.length > 0) {
    cuisineInfo = `User prefers these cuisines: ${cuisinePreferences.join(', ')}.`;
    const cuisineDishes = getDishesForCuisines(cuisinePreferences);
    const allDishes = [...cuisineDishes.breakfast, ...cuisineDishes.lunch_dinner, ...cuisineDishes.snacks];
    availableDishes = `Available dishes for these cuisines: ${allDishes.join(', ')}. You must only suggest dishes from this list.`;
  }

  const prompt = `You are a helpful meal planning assistant. Generate a weekly meal plan for the week starting ${weekStartDate}.

${dietaryInfo}

${cuisineInfo}
${availableDishes}

${ingredientsInfo}

Previous meal history:
${historyText}

Instructions:
1. Generate a diverse and balanced weekly meal plan
2. Avoid repeating the same dishes within the week unless specifically requested
3. Consider variety in cooking methods, flavors, and nutrition
4. Ensure meals are practical and achievable for home cooking
5. Respect dietary preferences and restrictions
6. Use only dishes from the available dishes list if provided
7. Generate exactly the JSON format specified below

Required JSON format:
${jsonFormat}

Return only the JSON object, no additional text or formatting.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsed = JSON.parse(jsonStr);
      return { meals: parsed };
    } else {
      throw new Error('No valid JSON found in AI response');
    }
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}