'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface GoogleAnalyticsProps {
  measurementId: string;
  userId?: string;
}

export default function GoogleAnalytics({ measurementId, userId }: GoogleAnalyticsProps) {
  useEffect(() => {
    if (measurementId) {
      analytics.init(measurementId, userId);
    }
  }, [measurementId, userId]);

  return null; // This component doesn't render anything
}