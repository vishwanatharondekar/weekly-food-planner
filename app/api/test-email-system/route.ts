import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';
import { formatDate, getWeekStartDate } from '@/lib/utils';
import { sendBulkEmails, type EmailData } from '@/lib/ses-service';
import { generateMealPlanEmail, generateMealPlanTextEmail, type MealPlanEmailData } from '@/lib/email-templates';

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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { 
      email,
      weekStartDate = null,
      testMode = true 
    } = body;

    if (!email) {
      return NextResponse.json({
        error: 'Email is required',
        usage: 'POST /api/test-email-system with body: { "email": "user@example.com", "weekStartDate": "2024-01-15", "testMode": true }'
      }, { status: 400 });
    }

    console.log('Starting email system test...');
    console.log(`Test mode: ${testMode}, Email: ${email}`);

    // Get week start date
    const targetWeekStart = weekStartDate ? new Date(weekStartDate) : getWeekStartDate(new Date());
    const targetWeekStartStr = formatDate(targetWeekStart);

    console.log(`Testing email for week starting: ${targetWeekStartStr}`);

    // Get test user
    const testUser = await getTestUser(targetWeekStartStr, email);
    
    if (!testUser) {
      return NextResponse.json({
        message: 'No eligible test user found',
        criteria: {
          weekStartDate: targetWeekStartStr,
          email: email
        }
      });
    }

    console.log(`Found test user: ${email}`);

    // Send test email
    const emailResult = await sendTestEmail(testUser, targetWeekStartStr, testMode);

    console.log(`Test completed. Success: ${emailResult.success}`);

    return NextResponse.json({
      message: 'Email system test completed',
      results: {
        email: testUser.userData.email,
        userId: testUser.userId,
        emailSent: emailResult.success,
        weekStartDate: targetWeekStartStr,
        testMode,
        hasMealPlan: !!testUser.mealPlanData,
        error: emailResult.error
      }
    });

  } catch (error) {
    console.error('Test email system error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

async function getTestUser(weekStartDate: string, email: string) {
  try {
    console.log(`Looking for test user: ${email}`);
    
    // Find user by email
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email),
      limit(1)
    );
    const userSnapshot = await getDocs(usersQuery);
    
    if (userSnapshot.empty) {
      console.log(`User not found: ${email}`);
      return null;
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    // Check if user has unsubscribed
    if (userData.emailPreferences?.weeklyMealPlans === false) {
      console.log(`User ${email} has unsubscribed, skipping`);
      return null;
    }

    // Get meal plan for this user
    const mealPlanQuery = query(
      collection(db, 'mealPlans'),
      where('userId', '==', userId),
      where('weekStartDate', '==', weekStartDate),
      limit(1)
    );
    const mealPlanSnapshot = await getDocs(mealPlanQuery);
    
    const mealPlanData = mealPlanSnapshot.empty ? null : mealPlanSnapshot.docs[0].data();
    
    console.log(`Found test user: ${email} (meal plan: ${mealPlanData ? 'yes' : 'no'})`);
    
    return {
      userId,
      userData,
      mealPlanData
    };
  } catch (error) {
    console.error(`Error getting test user ${email}:`, error);
    return null;
  }
}

async function sendTestEmail(user: any, weekStartDate: string, testMode: boolean) {
  try {
    if (!user.mealPlanData) {
      console.log(`Skipping user ${user.userData.email} - no meal plan available`);
      return { success: false, error: 'No meal plan available' };
    }

    const emailData: MealPlanEmailData = {
      userName: user.userData.name || 'Valued User',
      weekStartDate: weekStartDate,
      userEmail: user.userData.email,
      userId: user.userId,
      meals: user.mealPlanData.meals,
      mealSettings: user.userData.mealSettings
    };

    const htmlBody = generateMealPlanEmail(emailData);
    const textBody = generateMealPlanTextEmail(emailData);

    const subject = testMode 
      ? `🧪 TEST - Your Weekly Meal Plan - Week of ${weekStartDate}`
      : `🍽️ Your Weekly Meal Plan - Week of ${weekStartDate}`;

    console.log(`Preparing email for: ${user.userData.email}`);

    // Send single email
    const results = await sendBulkEmails([{
      to: user.userData.email,
      subject,
      htmlBody,
      textBody
    }]);
    
    const success = results.success > 0;
    console.log(`Email sending completed: ${success ? 'success' : 'failed'}`);
    
    return { 
      success, 
      error: success ? null : 'Failed to send email' 
    };
  } catch (error) {
    console.error(`Error sending test email for user ${user.userId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// GET endpoint for testing without request body
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const weekStartDate = url.searchParams.get('weekStartDate') || null;
  
  if (!email) {
    return NextResponse.json({
      error: 'Email parameter is required',
      usage: 'GET /api/test-email-system?email=user@example.com&weekStartDate=2024-01-15'
    }, { status: 400 });
  }
  
  // Convert to POST request format
  const body = {
    email,
    weekStartDate,
    testMode: true
  };

  // Create a new request with the body
  const postRequest = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(body)
  });

  return POST(postRequest);
}
