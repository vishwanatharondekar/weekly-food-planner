// Server-side Analytics wrapper service for tracking user events
// This provides a flexible interface for server-side analytics tracking

import mixpanelServer from 'mixpanel';

export interface AnalyticsEvent {
  action: string;
  category: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface UserProperties {
  user_id?: string;
  user_type?: 'new' | 'returning';
  dietary_preference?: 'vegetarian' | 'non-vegetarian' | 'mixed';
  language?: string;
  has_ai_history?: boolean;
  email?: string;
  name?: string;
}

class AnalyticsServerService {
  private isInitialized = false;
  private mixpanelToken: string | null = null;
  private mixpanelInitialized = false;
  private mixPanelServerInstance: any = null;

  // Initialize analytics service for server
  initServer(mixpanelToken?: string) {
    this.mixpanelToken = mixpanelToken || null;

    // Initialize Mixpanel
    if (mixpanelToken) {
      this.mixPanelServerInstance = mixpanelServer.init(mixpanelToken, {
        debug: process.env.NODE_ENV === 'development',
      });
      this.mixpanelInitialized = true;
    }

    this.isInitialized = true;
  }

  // Track custom events on server
  trackEvent(event: AnalyticsEvent) {
    if (!this.isInitialized) {
      console.log('Analytics event (not sent - not initialized):', event);
      return;
    }

    // Track with Mixpanel
    if (this.mixpanelInitialized) {
      const mixpanelEvent = `${event.category}_${event.action}`;
      const mixpanelProperties: any = {
        distinct_id: event.custom_parameters?.user_id,
        category: event.category,
        label: event.label,
        value: event.value,
      };

      // Add custom parameters
      if (event.custom_parameters) {
        Object.assign(mixpanelProperties, event.custom_parameters);
      }

      this.mixPanelServerInstance.track(mixpanelEvent, mixpanelProperties);
    }
  }

  // Set user properties
  setUserProperties(properties: UserProperties) {
    if (!this.isInitialized) return;

    // Set user properties in Mixpanel
    if (this.mixpanelInitialized && properties.user_id) {
      const mixpanelProperties: any = {};
      
      if (properties.user_type) mixpanelProperties.user_type = properties.user_type;
      if (properties.dietary_preference) mixpanelProperties.dietary_preference = properties.dietary_preference;
      if (properties.language) mixpanelProperties.language = properties.language;
      if (properties.has_ai_history !== undefined) mixpanelProperties.has_ai_history = properties.has_ai_history;
      if (properties.email) mixpanelProperties.$email = properties.email;
      if (properties.name) mixpanelProperties.$name = properties.name;

      if (Object.keys(mixpanelProperties).length > 0) {
        this.mixPanelServerInstance.people.set(properties.user_id, mixpanelProperties);
      }
    }
  }

  // Track user engagement
  trackEngagement(action: string, details?: Record<string, any>) {
    this.trackEvent({
      action,
      category: 'engagement',
      custom_parameters: details,
    });
  }

  // Track feature usage
  trackFeatureUsage(feature: string, action: string, details?: Record<string, any>) {
    this.trackEvent({
      action: `${feature}_${action}`,
      category: 'feature_usage',
      label: feature,
      custom_parameters: details,
    });
  }

  // Track errors
  trackError(error: string, details?: Record<string, any>) {
    this.trackEvent({
      action: 'error',
      category: 'error',
      label: error,
      custom_parameters: details,
    });
  }
}

// Create singleton instance
export const analyticsServer = new AnalyticsServerService();

// Predefined event types for consistency (shared with client)
export const AnalyticsEvents = {
  // Authentication events
  AUTH: {
    LOGIN: 'login',
    REGISTER: 'register',
    LOGOUT: 'logout',
    PROFILE_UPDATE: 'profile_update',
  },
  
  // Meal planning events
  MEAL: {
    ADD: 'meal_add',
    UPDATE: 'meal_update',
    DELETE: 'meal_delete',
    CLEAR_WEEK: 'meal_clear_week',
    COPY_PREVIOUS: 'meal_copy_previous',
  },
  
  // AI events
  AI: {
    GENERATE_MEALS: 'ai_generate_meals',
    SUGGEST_MEAL: 'ai_suggest_meal',
    EXTRACT_INGREDIENTS: 'ai_extract_ingredients',
  },
  
  // PDF events
  PDF: {
    GENERATE_MEAL_PLAN: 'pdf_generate_meal_plan',
    GENERATE_SHOPPING_LIST: 'pdf_generate_shopping_list',
    DOWNLOAD_MEAL_PLAN: 'pdf_download_meal_plan',
    DOWNLOAD_SHOPPING_LIST: 'pdf_download_shopping_list',
  },
  
  // Preference events
  PREFERENCES: {
    UPDATE_DIETARY: 'preferences_update_dietary',
    UPDATE_CUISINE: 'preferences_update_cuisine',
    UPDATE_LANGUAGE: 'preferences_update_language',
    UPDATE_MEAL_SETTINGS: 'preferences_update_meal_settings',
  },
  
  // Navigation events
  NAVIGATION: {
    WEEK_CHANGE: 'navigation_week_change',
    MODE_SWITCH: 'navigation_mode_switch',
    PREFERENCES_OPEN: 'navigation_preferences_open',
  },
  
  // Video events
  VIDEO: {
    ADD_URL: 'video_add_url',
    OPEN_MODAL: 'video_open_modal',
    PLAY_VIDEO: 'video_play',
  },
  
  // Onboarding events
  ONBOARDING: {
    START: 'onboarding_start',
    COMPLETE: 'onboarding_complete',
    SKIP: 'onboarding_skip',
  },
  
  // Email events
  EMAIL: {
    SENT: 'email_sent',
    DELIVERED: 'email_delivered',
    OPEN: 'email_open',
    CLICK: 'email_click',
    BOUNCE: 'email_bounce',
    COMPLAINT: 'email_complaint',
    UNSUBSCRIBE: 'email_unsubscribe',
  },
} as const;

