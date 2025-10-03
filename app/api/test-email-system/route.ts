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
      testUserEmails = [], 
      maxUsers = 5, 
      weekStartDate = null,
      testMode = true 
    } = body;

    console.log('Starting email system test...');
    console.log(`Test mode: ${testMode}, Max users: ${maxUsers}`);
    
    // Safety check - prevent accidental mass emails
    if (maxUsers > 20) {
      return NextResponse.json({
        error: 'Safety limit: Cannot test with more than 20 users at once',
        maxAllowed: 20
      }, { status: 400 });
    }

    // Get week start date
    const targetWeekStart = weekStartDate ? new Date(weekStartDate) : getWeekStartDate(new Date());
    const targetWeekStartStr = formatDate(targetWeekStart);

    console.log(`Testing emails for week starting: ${targetWeekStartStr}`);

    // Get test users
    const testUsers = await getTestUsers(targetWeekStartStr, testUserEmails, maxUsers);
    
    if (testUsers.length === 0) {
      return NextResponse.json({
        message: 'No eligible test users found',
        criteria: {
          weekStartDate: targetWeekStartStr,
          requestedEmails: testUserEmails,
          maxUsers
        }
      });
    }

    console.log(`Found ${testUsers.length} test users`);

    // Send test emails
    const emailResults = await sendTestEmails(testUsers, targetWeekStartStr, testMode);

    console.log(`Test completed. Sent: ${emailResults.sent}, Failed: ${emailResults.failed}`);

    return NextResponse.json({
      message: 'Email system test completed',
      results: {
        usersProcessed: testUsers.length,
        emailsSent: emailResults.sent,
        emailsFailed: emailResults.failed,
        weekStartDate: targetWeekStartStr,
        testMode,
        testUsers: testUsers.map(u => ({
          email: u.userData.email,
          userId: u.userId,
          hasMealPlan: !!u.mealPlanData
        }))
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

async function getTestUsers(weekStartDate: string, testUserEmails: string[], maxUsers: number) {
  try {
    const testUsers: any[] = [];

    // If specific emails are provided, get those users first
    if (testUserEmails.length > 0) {
      console.log(`Looking for specific test users: ${testUserEmails.join(', ')}`);
      
      for (const email of testUserEmails) {
        try {
          // Find user by email
          const usersQuery = query(
            collection(db, 'users'),
            where('email', '==', email),
            limit(1)
          );
          const userSnapshot = await getDocs(usersQuery);
          
          if (userSnapshot.empty) {
            console.log(`User not found: ${email}`);
            continue;
          }

          const userDoc = userSnapshot.docs[0];
          const userData = userDoc.data();
          const userId = userDoc.id;

          // Check if user has unsubscribed
          if (userData.emailPreferences?.weeklyMealPlans === false) {
            console.log(`User ${email} has unsubscribed, skipping`);
            continue;
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
          
          testUsers.push({
            userId,
            userData,
            mealPlanData
          });

          console.log(`Added test user: ${email} (meal plan: ${mealPlanData ? 'yes' : 'no'})`);
        } catch (error) {
          console.error(`Error processing test user ${email}:`, error);
        }
      }
    }

    // If we need more users, get random ones
    const remainingSlots = maxUsers - testUsers.length;
    if (remainingSlots > 0) {
      console.log(`Getting ${remainingSlots} additional random test users`);
      
      // Get meal plans for this week
      const mealPlansQuery = query(
        collection(db, 'mealPlans'),
        where('weekStartDate', '==', weekStartDate),
        limit(remainingSlots * 2) // Get more than needed to account for filtering
      );
      const mealPlansSnapshot = await getDocs(mealPlansQuery);

      for (const mealPlanDoc of mealPlansSnapshot.docs) {
        if (testUsers.length >= maxUsers) break;

        try {
          const mealPlanData = mealPlanDoc.data();
          const userId = mealPlanData.userId;

          // Skip if we already have this user
          if (testUsers.some(u => u.userId === userId)) {
            continue;
          }

          // Get user data
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (!userDoc.exists()) {
            continue;
          }

          const userData = userDoc.data();

          // Check if user has unsubscribed
          if (userData.emailPreferences?.weeklyMealPlans === false) {
            continue;
          }

          testUsers.push({
            userId,
            userData,
            mealPlanData
          });

          console.log(`Added random test user: ${userData.email}`);
        } catch (error) {
          console.error(`Error processing random user:`, error);
        }
      }
    }

    return testUsers;
  } catch (error) {
    console.error('Error getting test users:', error);
    return [];
  }
}

async function sendTestEmails(testUsers: any[], weekStartDate: string, testMode: boolean) {
  let sent = 0;
  let failed = 0;

  const emails: EmailData[] = [];

  // Prepare emails
  for (const user of testUsers) {
    try {
      if (!user.mealPlanData) {
        console.log(`Skipping user ${user.userData.email} - no meal plan available`);
        failed++;
        continue;
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

      emails.push({
        to: user.userData.email,
        subject,
        htmlBody,
        textBody
      });

      console.log(`Prepared email for: ${user.userData.email}`);
    } catch (error) {
      console.error(`Error preparing email for user ${user.userId}:`, error);
      failed++;
    }
  }

  // Send emails
  if (emails.length > 0) {
    try {
      console.log(`Sending ${emails.length} test emails...`);
      const results = await sendBulkEmails(emails);
      sent = results.success;
      failed += results.failed;
      
      console.log(`Email sending completed: ${results.success} sent, ${results.failed} failed`);
    } catch (error) {
      console.error('Error sending test emails:', error);
      failed += emails.length;
    }
  }

  return { sent, failed };
}

// GET endpoint for testing without request body
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const maxUsers = parseInt(url.searchParams.get('maxUsers') || '3');
  const weekStartDate = url.searchParams.get('weekStartDate') || null;
  
  // Convert to POST request format
  const body = {
    testUserEmails: [],
    maxUsers,
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
