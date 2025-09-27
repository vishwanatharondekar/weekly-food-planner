'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface GoogleAnalyticsProps {
  measurementId: string;
  userId?: string;
}

let isInitialized = false;

export default function GoogleAnalytics({ measurementId, userId }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (measurementId && !isInitialized) {
      isInitialized = true;
      analytics.init(measurementId, userId);
    }
  }, [measurementId, userId]);

  return null; // This component doesn't render anything
}