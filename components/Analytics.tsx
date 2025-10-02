'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface AnalyticsProps {
  gaMeasurementId?: string;
  mixpanelToken?: string;
  userId?: string;
}

let isInitialized = false;

export default function Analytics({ 
  gaMeasurementId, 
  mixpanelToken, 
  userId 
}: AnalyticsProps) {
  useEffect(() => {
    // Check if analytics is enabled
    const isEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true';
    
    if (!isEnabled) {
      console.log('Analytics component: Analytics disabled - ANALYTICS_ENABLED environment variable not set to true');
      return;
    }

    if ((gaMeasurementId || mixpanelToken) && !isInitialized) {
      isInitialized = true;
      // Initialize analytics with both Google Analytics and Mixpanel
      analytics.init(gaMeasurementId || '', userId, mixpanelToken);
    }
  }, [gaMeasurementId, mixpanelToken, userId]);

  return null; // This component doesn't render anything
}