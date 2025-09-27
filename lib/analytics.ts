// Analytics wrapper service for tracking user events
// This provides a flexible interface that can be easily switched between different analytics providers

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
}

class AnalyticsService {
  private isInitialized = false;
  private userId: string | null = null;
  private measurementId: string | null = null;

  // Initialize analytics service
  init(measurementId: string, userId?: string) {
    if (typeof window === 'undefined') {
      console.log('Analytics: Running on server side, skipping initialization');
      return;
    }

    this.measurementId = measurementId;
    this.userId = userId || null;

    console.log('Analytics: Initializing with measurement ID:', measurementId);

    // Load Google Analytics script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);


    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
        window.dataLayer.push(arguments);
    }

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      user_id: this.userId,
      send_page_view: false, // We'll handle page views manually
    });

    this.isInitialized = true;
    console.log('Analytics: Successfully initialized');
  }

  // Track custom events
  trackEvent(event: AnalyticsEvent) {
    if (!this.isInitialized || typeof window === 'undefined') {
      console.log('Analytics event (not sent - not initialized):', event);
      return;
    }

    const eventData: any = {
      event_category: event.category,
      event_label: event.label,
      value: event.value,
    };

    // Add custom parameters
    if (event.custom_parameters) {
      Object.assign(eventData, event.custom_parameters);
    }

    console.log('Analytics: Sending event:', event.action, eventData);
    window.gtag('event', event.action, eventData);
  }

  // Track page views
  trackPageView(pagePath: string, pageTitle?: string) {
    if (!this.isInitialized || typeof window === 'undefined') return;

    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
    });
  }

  // Set user properties
  setUserProperties(properties: UserProperties) {
    if (!this.isInitialized || typeof window === 'undefined') return;

    window.gtag('config', this.measurementId, {
      user_id: properties.user_id || this.userId,
      custom_map: {
        user_type: properties.user_type,
        dietary_preference: properties.dietary_preference,
        language: properties.language,
        has_ai_history: properties.has_ai_history,
      },
    });
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
export const analytics = new AnalyticsService();

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Predefined event types for consistency
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
} as const;