# Analytics Events Documentation

This document outlines all the custom analytics events implemented in the Weekly Food Planner application.

## Analytics Wrapper

The application uses a flexible analytics wrapper (`lib/analytics.ts`) that can be easily switched between different analytics providers. Currently configured for Google Analytics 4.

### Configuration

- **Environment Variable**: `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- **Component**: `components/GoogleAnalytics.tsx`
- **Integration**: Added to `app/layout.tsx`

## Event Categories

### 1. Authentication Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| User Registration | `login` | `authentication` | `user_id`, `method` |
| User Login | `register` | `authentication` | `user_id`, `method` |
| User Logout | `logout` | `authentication` | `user_id` |
| Authentication Error | `auth_{mode}_error` | `error` | `error_message`, `method` |

**Files Modified:**
- `components/AuthForm.tsx`
- `app/app/page.tsx`

### 2. Onboarding Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Onboarding Complete | `onboarding_complete` | `onboarding` | `user_id`, `cuisine_count`, `selected_cuisines`, `dietary_preference`, `non_veg_days`, `breakfast_dishes`, `lunch_dinner_dishes` |

**Files Modified:**
- `app/app/page.tsx`

### 3. Meal Planning Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Add Meal | `meal_add` | `meal_planning` | `day`, `meal_type`, `meal_name`, `is_new_meal`, `week_start` |
| Update Meal | `meal_update` | `meal_planning` | `day`, `meal_type`, `meal_name`, `is_new_meal`, `week_start` |
| Clear Week | `meal_clear_week` | `meal_planning` | `week_start`, `user_id` |

**Files Modified:**
- `components/MealPlanner.tsx`

### 4. AI Features Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Generate Meals | `ai_generate_meals` | `ai_features` | `week_start`, `has_ingredients`, `ingredient_count`, `user_id` |

**Files Modified:**
- `components/MealPlanner.tsx`

### 5. PDF Generation Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Generate Meal Plan PDF | `pdf_generate_meal_plan` | `pdf_generation` | `week_start`, `language`, `meal_count`, `user_id` |
| Generate Shopping List PDF | `pdf_generate_shopping_list` | `pdf_generation` | `week_start`, `language`, `meal_count`, `user_id` |

**Files Modified:**
- `components/MealPlanner.tsx`

### 6. Preference Update Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Update Dietary Preferences | `preferences_update_dietary` | `preferences` | `is_vegetarian`, `non_veg_days`, `non_veg_days_count`, `user_id` |
| Update Language Preferences | `preferences_update_language` | `preferences` | `language_code`, `language_name`, `user_id` |
| Update Meal Settings | `preferences_update_meal_settings` | `preferences` | `enabled_meal_types`, `meal_types_count`, `user_id` |

**Files Modified:**
- `components/DietaryPreferences.tsx`
- `components/LanguagePreferences.tsx`
- `components/MealSettings.tsx`

### 7. Navigation Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Week Navigation | `navigation_week_change` | `navigation` | `direction`, `from_week`, `to_week`, `user_id` |
| Mode Switch | `navigation_mode_switch` | `navigation` | `from_mode`, `to_mode`, `user_id` |

**Files Modified:**
- `components/MealPlanner.tsx`

### 8. Video Management Events

| Event | Action | Category | Custom Parameters |
|-------|--------|----------|-------------------|
| Open Video Modal | `video_open_modal` | `video_management` | `day`, `meal_type`, `meal_name`, `week_start`, `user_id` |
| Add Video URL | `video_add_url` | `video_management` | `meal_name`, `day`, `meal_type`, `video_url`, `week_start` |

**Files Modified:**
- `components/MealPlanner.tsx`

## Analytics Service Features

### Core Methods

- `init(measurementId, userId)` - Initialize analytics with measurement ID and user ID
- `trackEvent(event)` - Track custom events with category, action, and parameters
- `trackPageView(pagePath, pageTitle)` - Track page views
- `setUserProperties(properties)` - Set user properties for segmentation
- `trackEngagement(action, details)` - Track user engagement
- `trackFeatureUsage(feature, action, details)` - Track feature usage
- `trackError(error, details)` - Track errors

### User Properties

- `user_id` - Unique user identifier
- `user_type` - 'new' or 'returning'
- `dietary_preference` - 'vegetarian', 'non-vegetarian', or 'mixed'
- `language` - User's preferred language
- `has_ai_history` - Whether user has meal history for AI

## Implementation Notes

1. **Privacy Compliant**: All analytics tracking respects user privacy and only collects necessary data
2. **Error Handling**: Analytics failures don't break the application functionality
3. **Flexible**: Easy to switch analytics providers by updating the wrapper
4. **Comprehensive**: Covers all major user interactions and feature usage
5. **Consistent**: Uses standardized event naming and parameter structure

## Usage Examples

```typescript
import { analytics, AnalyticsEvents } from '@/lib/analytics';

// Track a custom event
analytics.trackEvent({
  action: AnalyticsEvents.MEAL.ADD,
  category: 'meal_planning',
  custom_parameters: {
    day: 'monday',
    meal_type: 'breakfast',
    meal_name: 'Pancakes',
    user_id: 'user123'
  }
});

// Track user engagement
analytics.trackEngagement('button_click', {
  button_name: 'generate_ai_meals',
  page: 'meal_planner'
});

// Track feature usage
analytics.trackFeatureUsage('ai_generation', 'success', {
  meals_generated: 5,
  time_taken: 2000
});
```

## Future Enhancements

1. **Conversion Tracking**: Add conversion events for key user actions
2. **Funnel Analysis**: Track user journey through the application
3. **A/B Testing**: Support for A/B test event tracking
4. **Performance Metrics**: Track page load times and performance
5. **Error Monitoring**: Enhanced error tracking and reporting