import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, orderBy, limit, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { formatDate, getNextWeekStartDate, getWeekStartDate, isValidEmailForSending } from '@/lib/utils';
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

// Batch size for processing users (12 per minute to stay under rate limit)
const BATCH_SIZE = 12;

export async function GET(request: NextRequest) {
  try {
    console.log('Starting AI meal plan generation cron job...');
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting AI meal plan generation batch...');

    // Get the next week's start date (Saturday morning, so next week)
    const nextWeekStart = getNextWeekStartDate(new Date());
    const nextWeekStartStr = formatDate(nextWeekStart);

    console.log(`Generating meal plans for week starting: ${nextWeekStartStr}`);

    // Get users who need meal plan generation
    const { users: usersToProcess, skippedInvalidEmails: totalSkippedInvalidEmails } = await getUsersForGeneration(nextWeekStartStr);

    if (usersToProcess.length === 0) {
      console.log('No users found that need meal plan generation');
      return NextResponse.json({ 
        message: 'No users to process',
        processed: 0,
        success: 0,
        failed: 0,
        skippedInvalidEmails: totalSkippedInvalidEmails,
        weekStartDate: nextWeekStartStr
      });
    }

    console.log(`Found ${usersToProcess.length} users to process in this batch (skipped ${totalSkippedInvalidEmails} invalid emails)`);

    let processed = 0;
    let success = 0;
    let failed = 0;
    let skippedInvalidEmails = 0;

    // Process users in batch
    for (const userDoc of usersToProcess) {
      try {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        console.log(`Processing user: ${userData.email}`);

        // Generate meal plan for this user
        const mealPlan = await generateMealPlanForUser(userId, userData, nextWeekStartStr);
        
        if (mealPlan) {
          // Store the meal plan
          const mealPlanRef = doc(db, 'mealPlans', `${userId}_${nextWeekStartStr}`);
          await setDoc(mealPlanRef, {
            ...mealPlan,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          success++;
          console.log(`Generated meal plan for user: ${userData.email}`);
        } else {
          failed++;
          console.log(`Failed to generate meal plan for user: ${userData.email}`);
        }

        processed++;
      } catch (error) {
        console.error(`Error processing user ${userDoc.id}:`, error);
        failed++;
        processed++;
        continue;
      }
    }

    console.log(`AI generation batch completed. Processed: ${processed}, Success: ${success}, Failed: ${failed}, Total Skipped Invalid Emails: ${totalSkippedInvalidEmails}`);

    return NextResponse.json({
      message: 'AI meal plan generation batch completed',
      processed,
      success,
      failed,
      skippedInvalidEmails: totalSkippedInvalidEmails,
      weekStartDate: nextWeekStartStr
    });

  } catch (error) {
    console.error('AI generation cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function getUsersForGeneration(weekStartDate: string): Promise<{users: any[], skippedInvalidEmails: number}> {
  try {
    // TODO : Instead of taking users directly from the users collection, take users from the audited users collection
    const maxUsers = 1000;
    // Get all users who have completed onboarding and haven't unsubscribed
    const usersRef = collection(db, 'users');
    const usersQuery = query(
      usersRef,
      where('onboardingCompleted', '==', true),
      orderBy('email'), // Consistent ordering for pagination
      limit(maxUsers) // Get more than needed to account for filtering
    );

    const usersSnapshot = await getDocs(usersQuery);
    const eligibleUsers: any[] = [];
    let skippedInvalidEmails = 0;

    console.log('usersSnapshot.docs : ', usersSnapshot.docs.length);

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // Check if user has a valid email address
      if (!isValidEmailForSending(userData.email)) {
        console.log(`User ${userData.email} has invalid email address, skipping meal plan generation`);
        skippedInvalidEmails++;
        continue;
      }

      // Check if user has unsubscribed from emails
      const emailPreferences = userData.emailPreferences;
      if (emailPreferences?.weeklyMealPlans === false) {
        console.log(`User ${userData.email} has unsubscribed from weekly meal plans, skipping`);
        continue;
      }

      // Check if meal plan already exists for this week
      const existingPlanQuery = query(
        collection(db, 'mealPlans'), 
        where('__name__', '==', `${userId}_${weekStartDate}`)
      );
      const existingPlan = await getDocs(existingPlanQuery);
      
      if (!existingPlan.empty) {
        console.log(`Meal plan already exists for user ${userData.email}, skipping`);
        continue;
      }

      // Check if user has sufficient preferences/history
      const dietaryPreferences = userData.dietaryPreferences;
      const cuisinePreferences = userData.cuisinePreferences || [];
      const dishPreferences = userData.dishPreferences || { breakfast: [], lunch_dinner: [] };

      // Get meal history for validation
      const mealPlansRef = collection(db, 'mealPlans');
      const historyQuery = query(
        mealPlansRef,
        where('userId', '==', userId),
        where('weekStartDate', '<', weekStartDate),
        limit(1)
      );
      const historySnapshot = await getDocs(historyQuery);
      const hasHistory = !historySnapshot.empty;

      // Skip if no history and no preferences
      if (!hasHistory && cuisinePreferences.length === 0 && 
          (dishPreferences.breakfast.length === 0 || dishPreferences.lunch_dinner.length === 0)) {
        console.log(`Skipping user ${userData.email} - no history or preferences`);
        continue;
      }

      eligibleUsers.push(userDoc);

      // Stop when we have enough users for this batch
      if (eligibleUsers.length >= BATCH_SIZE) {
        break;
      }
    }

    return { users: eligibleUsers, skippedInvalidEmails };
  } catch (error) {
    console.error('Error getting users for generation:', error);
    return { users: [], skippedInvalidEmails: 0 };
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

    const dietaryPreferences = {
      ...userData.dietaryPreferences,
      showCalories: userData.showCalories === undefined ? true : userData.showCalories,
    };
    const cuisinePreferences = userData.cuisinePreferences || [];
    const dishPreferences = userData.dishPreferences || { breakfast: [], lunch_dinner: [] };
    const mealSettings = userData.mealSettings;

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

