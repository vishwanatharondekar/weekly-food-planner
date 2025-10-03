import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, orderBy, limit } from 'firebase/firestore';
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

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting weekly meal plan email sending...');

    // Get the next week's start date (Saturday morning, so next week)
    const nextWeekStart = getWeekStartDate(new Date());
    const nextWeekStartStr = formatDate(nextWeekStart);

    console.log(`Sending emails for meal plans for week starting: ${nextWeekStartStr}`);

    // Get all pre-generated meal plans for this week
    const mealPlansRef = collection(db, 'mealPlans');
    const mealPlansQuery = query(
      mealPlansRef,
      where('weekStartDate', '==', nextWeekStartStr)
    );
    const mealPlansSnapshot = await getDocs(mealPlansQuery);

    if (mealPlansSnapshot.empty) {
      console.log('No pre-generated meal plans found for this week');
      return NextResponse.json({ 
        message: 'No meal plans to send emails for',
        processed: 0,
        success: 0,
        failed: 0
      });
    }

    console.log(`Found ${mealPlansSnapshot.docs.length} pre-generated meal plans`);

    const emails: EmailData[] = [];
    let processed = 0;

    // Process each meal plan
    for (const mealPlanDoc of mealPlansSnapshot.docs) {
      try {
        const mealPlanData = mealPlanDoc.data();
        const userId = mealPlanData.userId;
        
        // Get user data
        const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
        if (userDoc.empty) {
          console.log(`User not found for meal plan: ${userId}`);
          continue;
        }

        const userData = userDoc.docs[0].data();
        console.log(`Processing user: ${userData.email}`);

        // Check if user has unsubscribed from emails
        const emailPreferences = userData.emailPreferences;
        if (emailPreferences?.weeklyMealPlans === false) {
          console.log(`User ${userData.email} has unsubscribed from weekly meal plans, skipping`);
          continue;
        }

        // Generate email using pre-generated meal plan
        const emailData: MealPlanEmailData = {
          userName: userData.name || 'Valued User',
          weekStartDate: nextWeekStartStr,
          userEmail: userData.email,
          userId: userId,
          meals: mealPlanData.meals,
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
        console.log(`Prepared email for user: ${userData.email}`);
      } catch (error) {
        console.error(`Error processing meal plan ${mealPlanDoc.id}:`, error);
        continue;
      }
    }

    // Send all emails
    console.log(`Sending ${emails.length} emails...`);
    const emailResults = await sendBulkEmails(emails);

    console.log(`Weekly meal plan email process completed. Processed: ${processed}, Emails sent: ${emailResults.success}, Failed: ${emailResults.failed}`);

    return NextResponse.json({
      message: 'Weekly meal plan emails sent successfully',
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
