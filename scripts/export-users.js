/**
 * Script to export all users from Firestore to a CSV file
 * 
 * Usage:
 * node scripts/export-users.js
 * 
 * This will create a file called users-export-[timestamp].csv in the current directory
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { writeFileSync } = require('fs');
const { join } = require('path');

// Initialize Firebase with existing config from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Convert objects and arrays to JSON strings
  if (typeof value === 'object') {
    if (value.toDate && typeof value.toDate === 'function') {
      // Firestore Timestamp
      value = value.toDate().toISOString();
    } else {
      value = JSON.stringify(value);
    }
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, quote, or newline, wrap it in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}

/**
 * Converts user data to CSV row
 */
function userToCsvRow(user) {
  console.log(user.dietaryPreferences);
  const fields = [
    user.id,
    user.email || '',
    user.name || '',
    user.isGuest ? 'true' : 'false',
    user.onboardingCompleted ? 'true' : 'false',
    // user.aiUsageCount || 0,
    // user.shoppingListUsageCount || 0,
    user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toISOString() : user.createdAt) : '',
    user.updatedAt ? (user.updatedAt.toDate ? user.updatedAt.toDate().toISOString() : user.updatedAt) : '',
    user.emailPreferences?.weeklyMealPlans !== false ? 'true' : 'false',
    // user.mealSettings?.mealsPerDay || '',
    // user.mealSettings?.daysPerWeek || '',
    // user.cuisinePreferences?.join(';') || '',
    // user.dietaryPreferences?.join(';') || '',
    // user.dishPreferences?.breakfast?.join(';') || '',
    // user.dishPreferences?.lunch_dinner?.join(';') || '',
    user.preferredLanguage || '',
  ];
  
  return fields.map(escapeCsvField).join(',');
}

/**
 * Main function to export users to CSV
 */
async function exportUsersToCSV() {
  try {
    console.log('🚀 Starting user export...');
    
    // Get all users from Firestore
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    if (snapshot.empty) {
      console.log('⚠️  No users found in the database.');
      process.exit(0);
    }
    
    console.log(`📊 Found ${snapshot.size} users. Processing...`);
    
    // CSV header
    const headers = [
      'User ID',
      'Email',
      'Name',
      'Is Guest',
      'Onboarding Completed',
      'AI Usage Count',
      'Shopping List Usage Count',
      'Created At',
      'Updated At',
      'Email Subscribed',
      'Meals Per Day',
      'Days Per Week',
      'Cuisine Preferences',
      'Dietary Preferences',
      'Breakfast Preferences',
      'Lunch/Dinner Preferences',
      'Preferred Language',
    ];
    
    // Build CSV content
    const csvLines = [headers.join(',')];
    
    snapshot.forEach((doc) => {
      const userData = { id: doc.id, ...doc.data() };
      csvLines.push(userToCsvRow(userData));
    });
    
    const csvContent = csvLines.join('\n');
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `users-export-${timestamp}.csv`;
    const filepath = join(process.cwd(), filename);
    
    // Write to file
    writeFileSync(filepath, csvContent, 'utf8');
    
    console.log(`\n✅ Successfully exported ${snapshot.size} users!`);
    console.log(`📁 File saved: ${filename}`);
    console.log(`📍 Full path: ${filepath}`);
    
    // Show file stats
    const stats = require('fs').statSync(filepath);
    const fileSizeKB = (stats.size / 1024).toFixed(2);
    console.log(`📦 File size: ${fileSizeKB} KB`);
    
  } catch (error) {
    console.error('❌ Error exporting users:', error);
    throw error;
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the export
exportUsersToCSV();

