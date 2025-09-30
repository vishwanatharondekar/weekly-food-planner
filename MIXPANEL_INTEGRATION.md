# Analytics Integration

This document explains how both Google Analytics and Mixpanel analytics are integrated into the unified analytics framework.

## Overview

The analytics system supports both Google Analytics and Mixpanel simultaneously through a unified `Analytics` component. All events are tracked to both providers when both are configured.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Google Analytics
GA_MEASUREMENT_ID=your_ga_measurement_id_here

# Mixpanel Analytics
MIXPANEL_TOKEN=your_mixpanel_token_here
```

## Configuration

The Mixpanel integration is configured with the following settings:

- **Debug mode**: Enabled in development environment
- **Page view tracking**: Automatically enabled
- **Persistence**: Uses localStorage
- **Session recording**: 1% of all sessions
- **Heatmap data**: Enabled

## Usage

The existing analytics API remains unchanged. All events are automatically sent to both Google Analytics and Mixpanel:

```typescript
import { analytics, AnalyticsEvents } from '@/lib/analytics';

// Track events (sent to both GA and Mixpanel)
analytics.trackEvent({
  action: AnalyticsEvents.MEAL.ADD,
  category: 'meal_planning',
  label: 'dinner',
  custom_parameters: { meal_type: 'vegetarian' }
});

// Track page views (sent to both GA and Mixpanel)
analytics.trackPageView('/meal-planner', 'Meal Planner');

// Set user properties (sent to both GA and Mixpanel)
analytics.setUserProperties({
  user_id: 'user123',
  dietary_preference: 'vegetarian',
  language: 'en'
});
```

## Event Naming Convention

- **Google Analytics**: Events use the original format (e.g., `meal_add`)
- **Mixpanel**: Events use the format `{category}_{action}` (e.g., `meal_planning_meal_add`)

## Components

- `Analytics.tsx`: Unified component that initializes both Google Analytics and Mixpanel
- The component is included in `layout.tsx` and handles initialization of both providers

## Testing

To test the integration:

1. Set up your environment variables
2. Start the development server: `npm run dev`
3. Open browser developer tools and check the console for Mixpanel debug messages
4. Verify events are being sent to both analytics providers

## Troubleshooting

- Ensure environment variables are set correctly in your `.env.local` file
- Check browser console for any initialization errors
- Verify both GA measurement ID and Mixpanel token are valid and have proper permissions
- The unified component will initialize both providers if their respective tokens are provided