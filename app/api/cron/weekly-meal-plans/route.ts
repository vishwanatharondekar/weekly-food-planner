import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, deleteDoc, runTransaction, startAfter, DocumentSnapshot } from 'firebase/firestore';
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

// Batch size for email sending (140 emails per cron execution)
const EMAIL_BATCH_SIZE = 140;
const EMAILS_PER_SECOND = 14;
const LOCK_TIMEOUT_MS = 120000; // 2 minutes
const EXECUTION_TIMEOUT_MS = 55000; // 55 seconds (safety buffer)

export async function GET(request: NextRequest) {
  const cronExecutionId = `cron_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  let lockAcquired = false;
  
  try {
    // Verify this is a cron request (Vercel adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`Starting email cron execution: ${cronExecutionId}`);

    // Get the next week's start date (Saturday morning, so next week)
    const nextWeekStart = getWeekStartDate(new Date());
    const nextWeekStartStr = formatDate(nextWeekStart);

    console.log(`Processing emails for week starting: ${nextWeekStartStr}`);

    // Try to acquire execution lock
    const lockResult = await acquireExecutionLock(nextWeekStartStr, cronExecutionId);
    if (!lockResult.success) {
      console.log(`Lock acquisition failed: ${lockResult.reason}`);
      return NextResponse.json({ 
        message: lockResult.reason,
        skipped: true,
        weekStartDate: nextWeekStartStr
      });
    }
    
    lockAcquired = true;
    console.log(`Lock acquired successfully by ${cronExecutionId}`);

    // Get email progress for this week
    const progress = await getEmailProgress(nextWeekStartStr);
    
    if (progress.status === 'completed') {
      console.log('All emails for this week have already been sent');
      await releaseExecutionLock(nextWeekStartStr);
      lockAcquired = false;
      
      return NextResponse.json({
        message: 'All emails already sent for this week',
        completed: true,
        weekStartDate: nextWeekStartStr
      });
    }

    // Get batch of users to process
    const userBatch = await getUserBatchForEmails(nextWeekStartStr, progress.lastProcessedIndex, EMAIL_BATCH_SIZE);
    
    if (userBatch.length === 0) {
      console.log('No more users to process');
      await updateEmailProgress(nextWeekStartStr, progress.lastProcessedIndex, [], [], 'completed');
      await releaseExecutionLock(nextWeekStartStr);
      lockAcquired = false;
      
      return NextResponse.json({
        message: 'No more users to process - marking as completed',
        completed: true,
        weekStartDate: nextWeekStartStr
      });
    }

    console.log(`Processing batch of ${userBatch.length} users starting from index ${progress.lastProcessedIndex + 1}`);

    // Send emails with rate limiting
    const emailResults = await sendEmailBatchWithRateLimit(userBatch, nextWeekStartStr);

    // Update progress
    const newLastProcessedIndex = progress.lastProcessedIndex + userBatch.length;
    const isCompleted = emailResults.processedUsers.length < EMAIL_BATCH_SIZE; // If we got fewer users than requested, we're done
    
    await updateEmailProgress(
      nextWeekStartStr, 
      newLastProcessedIndex, 
      emailResults.processedUsers, 
      emailResults.failedUsers,
      isCompleted ? 'completed' : 'in_progress'
    );

    // Release lock
    await releaseExecutionLock(nextWeekStartStr);
    lockAcquired = false;

    console.log(`Email batch completed. Processed: ${emailResults.processedUsers.length}, Failed: ${emailResults.failedUsers.length}`);

    return NextResponse.json({
      message: 'Email batch sent successfully',
      processed: emailResults.processedUsers.length,
      failed: emailResults.failedUsers.length,
      emailsSent: emailResults.emailsSent,
      completed: isCompleted,
      weekStartDate: nextWeekStartStr,
      executionId: cronExecutionId
    });

  } catch (error) {
    console.error(`Cron job error (${cronExecutionId}):`, error);
    
    // Release lock if we acquired it
    if (lockAcquired) {
      try {
        await releaseExecutionLock(formatDate(getWeekStartDate(new Date())));
      } catch (lockError) {
        console.error('Error releasing lock:', lockError);
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        executionId: cronExecutionId
      },
      { status: 500 }
    );
  }
}

async function acquireExecutionLock(weekStartDate: string, cronExecutionId: string): Promise<{success: boolean, reason?: string}> {
  try {
    const lockRef = doc(db, 'emailLocks', `emailLock_${weekStartDate}`);
    
    const result = await runTransaction(db, async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      const now = Date.now();
      
      if (lockDoc.exists()) {
        const lockData = lockDoc.data();
        const lockAge = now - lockData.lockedAt;
        
        // Check if lock is still valid (not stale)
        if (lockData.isLocked && lockAge < LOCK_TIMEOUT_MS) {
          throw new Error(`Another cron execution is in progress (locked by: ${lockData.lockedBy})`);
        }
        
        // Lock is stale, we can take over
        if (lockAge >= LOCK_TIMEOUT_MS) {
          console.log(`Taking over stale lock (age: ${lockAge}ms) from ${lockData.lockedBy}`);
        }
      }
      
      // Acquire lock
      transaction.set(lockRef, {
        isLocked: true,
        lockedBy: cronExecutionId,
        lockedAt: now,
        weekStartDate,
        expectedCompletion: now + EXECUTION_TIMEOUT_MS
      });
      
      return { success: true };
    });
    
    return result;
  } catch (error) {
    return { 
      success: false, 
      reason: error instanceof Error ? error.message : 'Lock acquisition failed' 
    };
  }
}

async function releaseExecutionLock(weekStartDate: string): Promise<void> {
  try {
    const lockRef = doc(db, 'emailLocks', `emailLock_${weekStartDate}`);
    await deleteDoc(lockRef);
    console.log(`Lock released for week ${weekStartDate}`);
  } catch (error) {
    console.error('Error releasing lock:', error);
    // Don't throw - this is cleanup, shouldn't fail the main operation
  }
}

async function getEmailProgress(weekStartDate: string): Promise<{
  lastProcessedIndex: number;
  processedUserIds: string[];
  failedUserIds: string[];
  status: 'not_started' | 'in_progress' | 'completed';
}> {
  try {
    const progressRef = doc(db, 'emailProgress', `emailProgress_${weekStartDate}`);
    const progressDoc = await getDoc(progressRef);
    
    if (!progressDoc.exists()) {
      // Initialize progress document
      const initialProgress = {
      weekStartDate,
        lastProcessedIndex: -1,
        processedUserIds: [],
        failedUserIds: [],
        status: 'not_started' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await setDoc(progressRef, initialProgress);
      return {
        lastProcessedIndex: -1,
        processedUserIds: [],
        failedUserIds: [],
        status: 'not_started'
      };
    }
    
    const data = progressDoc.data();
    return {
      lastProcessedIndex: data.lastProcessedIndex || -1,
      processedUserIds: data.processedUserIds || [],
      failedUserIds: data.failedUserIds || [],
      status: data.status || 'not_started'
    };
  } catch (error) {
    console.error('Error getting email progress:', error);
    return {
      lastProcessedIndex: -1,
      processedUserIds: [],
      failedUserIds: [],
      status: 'not_started'
    };
  }
}

async function updateEmailProgress(
  weekStartDate: string, 
  lastProcessedIndex: number, 
  newProcessedUsers: string[], 
  newFailedUsers: string[],
  status: 'not_started' | 'in_progress' | 'completed'
): Promise<void> {
  try {
    const progressRef = doc(db, 'emailProgress', `emailProgress_${weekStartDate}`);
    const currentProgress = await getEmailProgress(weekStartDate);
    
    await setDoc(progressRef, {
      weekStartDate,
      lastProcessedIndex,
      processedUserIds: [...currentProgress.processedUserIds, ...newProcessedUsers],
      failedUserIds: [...currentProgress.failedUserIds, ...newFailedUsers],
      status,
      updatedAt: new Date(),
      ...(status === 'not_started' && { createdAt: new Date() })
    });
    
    console.log(`Updated email progress: index ${lastProcessedIndex}, status: ${status}`);
  } catch (error) {
    console.error('Error updating email progress:', error);
    throw error;
  }
}

async function getUserBatchForEmails(weekStartDate: string, lastProcessedIndex: number, batchSize: number): Promise<any[]> {
  try {
    // Get all pre-generated meal plans for this week
    const mealPlansRef = collection(db, 'mealPlans');
    const mealPlansQuery = query(
      mealPlansRef,
      where('weekStartDate', '==', weekStartDate)
    );
    const mealPlansSnapshot = await getDocs(mealPlansQuery);

    if (mealPlansSnapshot.empty) {
      console.log('No pre-generated meal plans found for this week');
      return [];
    }

    const eligibleUsers: any[] = [];
    let currentIndex = -1;

    // Process meal plans and filter eligible users
    for (const mealPlanDoc of mealPlansSnapshot.docs) {
      currentIndex++;
      
      // Skip users we've already processed
      if (currentIndex <= lastProcessedIndex) {
        continue;
      }
      
      try {
        const mealPlanData = mealPlanDoc.data();
        const userId = mealPlanData.userId;
        
        // Get user data
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          console.log(`User not found for meal plan: ${userId}`);
          continue;
        }

        const userData = userDoc.data();
        
        // Check if user has unsubscribed from emails
        const emailPreferences = userData.emailPreferences;
        if (emailPreferences?.weeklyMealPlans === false) {
          console.log(`User ${userData.email} has unsubscribed from weekly meal plans, skipping`);
          continue;
        }

        eligibleUsers.push({
          userId,
          userData,
          mealPlanData,
          originalIndex: currentIndex
        });

        // Stop when we have enough users for this batch
        if (eligibleUsers.length >= batchSize) {
          break;
        }
      } catch (error) {
        console.error(`Error processing meal plan ${mealPlanDoc.id}:`, error);
        continue;
      }
    }

    return eligibleUsers;
  } catch (error) {
    console.error('Error getting user batch:', error);
    return [];
  }
}

async function sendEmailBatchWithRateLimit(userBatch: any[], weekStartDate: string): Promise<{
  processedUsers: string[];
  failedUsers: string[];
  emailsSent: number;
}> {
  const processedUsers: string[] = [];
  const failedUsers: string[] = [];
  let emailsSent = 0;

  // Prepare all emails first
  const emails: EmailData[] = [];
  
  for (const user of userBatch) {
    try {
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

      emails.push({
        to: user.userData.email,
        subject: `🍽️ Your Weekly Meal Plan - Week of ${weekStartDate}`,
        htmlBody,
        textBody
      });
      
      processedUsers.push(user.userId);
    } catch (error) {
      console.error(`Error preparing email for user ${user.userId}:`, error);
      failedUsers.push(user.userId);
    }
  }

  // Send emails in batches with rate limiting
  const emailBatches = [];
  for (let i = 0; i < emails.length; i += EMAILS_PER_SECOND) {
    emailBatches.push(emails.slice(i, i + EMAILS_PER_SECOND));
  }

  console.log(`Sending ${emails.length} emails in ${emailBatches.length} batches`);

  for (let i = 0; i < emailBatches.length; i++) {
    const batch = emailBatches[i];
    
    try {
      const batchResult = await sendBulkEmails(batch);
      emailsSent += batchResult.success;
      console.log(`Batch ${i + 1}/${emailBatches.length}: sent ${batchResult.success}/${batch.length} emails`);
      
      // Wait 1 second before next batch (except for the last batch)
      if (i < emailBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
      console.error(`Error sending email batch ${i + 1}:`, error);
      // Mark users in this batch as failed
      batch.forEach(email => {
        const user = userBatch.find(u => u.userData.email === email.to);
        if (user && !failedUsers.includes(user.userId)) {
          failedUsers.push(user.userId);
          // Remove from processed if it was there
          const processedIndex = processedUsers.indexOf(user.userId);
          if (processedIndex > -1) {
            processedUsers.splice(processedIndex, 1);
          }
        }
      });
    }
  }

  return { processedUsers, failedUsers, emailsSent };
}
