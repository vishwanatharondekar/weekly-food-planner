import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getWeekStartDate, formatDate } from '@/lib/utils';

// Initialize Firebase on server side
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

// Helper function to get user ID from token
function getUserIdFromToken(request: NextRequest): string | null {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
    return tokenData.userId;
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const targetWeek = searchParams.get('targetWeek');
    const limitCount = parseInt(searchParams.get('limit') || '10');

    // Use target week if provided, otherwise use current week
    const referenceWeekStart = targetWeek ? new Date(targetWeek) : getWeekStartDate(new Date());
    const referenceWeekStartStr = formatDate(referenceWeekStart);

    // Query for meal plans that are before the reference week
    const mealPlansRef = collection(db, 'mealPlans');
    const q = query(
      mealPlansRef,
      where('userId', '==', userId),
      where('weekStartDate', '<', referenceWeekStartStr),
      orderBy('weekStartDate', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const mealPlans: any[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      mealPlans.push({
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      });
    });

    return NextResponse.json(mealPlans);
  } catch (error) {
    console.error('Get meal history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 