// Guest user utilities for device identification and management

interface DeviceInfo {
  userAgent: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  platform: string;
}

/**
 * Generate a unique guest device ID based on device characteristics
 * This creates a consistent ID for the same device without storing personal data
 */
export function generateGuestDeviceId(): string {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  try {
    const deviceInfo: DeviceInfo = {
      userAgent: navigator.userAgent || '',
      language: navigator.language || 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth || 24,
      platform: navigator.platform || 'unknown'
    };

    // Create a hash-like string from device characteristics
    const deviceString = JSON.stringify(deviceInfo);
    let hash = 0;
    
    for (let i = 0; i < deviceString.length; i++) {
      const char = deviceString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to positive number and add timestamp for uniqueness
    const deviceHash = Math.abs(hash).toString(36);
    const timestamp = Date.now().toString(36);
    
    return `guest_${deviceHash}_${timestamp}`;
  } catch (error) {
    console.error('Error generating guest device ID:', error);
    // Fallback to random ID
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Check if a user ID represents a guest user
 */
export function isGuestUser(userId: string): boolean {
  return userId.startsWith('guest_');
}

/**
 * Get or create guest device ID from localStorage
 */
export function getGuestDeviceId(): string {
  if (typeof window === 'undefined') {
    return generateGuestDeviceId();
  }

  const existingId = localStorage.getItem('guest_device_id');
  if (existingId && isGuestUser(existingId)) {
    return existingId;
  }

  const newId = generateGuestDeviceId();
  localStorage.setItem('guest_device_id', newId);
  return newId;
}

/**
 * Clear guest data from localStorage
 */
export function clearGuestData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('guest_device_id');
  localStorage.removeItem('guest_usage_count');
  localStorage.removeItem('guest_ai_usage');
  localStorage.removeItem('guest_shopping_list_usage');
}

/**
 * Get guest usage limits from environment or defaults
 */
export function getGuestUsageLimits() {
  const defaultLimits = {
    aiGeneration: 3,
    shoppingList: 3
  };

  if (typeof window === 'undefined') {
    // Server-side: use environment variables
    return {
      aiGeneration: parseInt(process.env.GUEST_AI_LIMIT || '3'),
      shoppingList: parseInt(process.env.GUEST_SHOPPING_LIST_LIMIT || '3')
    };
  }

  // Client-side: use defaults (limits will be enforced server-side)
  return defaultLimits;
}

/**
 * Track guest usage for a specific feature (deprecated - now handled by backend)
 * @deprecated Use backend tracking instead
 */
export function trackGuestUsage(feature: 'ai' | 'shopping_list'): number {
  if (typeof window === 'undefined') return 0;

  const key = `guest_${feature}_usage`;
  const currentUsage = parseInt(localStorage.getItem(key) || '0');
  const newUsage = currentUsage + 1;
  
  localStorage.setItem(key, newUsage.toString());
  return newUsage;
}

/**
 * Get current guest usage for a specific feature from user data
 */
export function getGuestUsage(feature: 'ai' | 'shopping_list', user?: any): number {
  if (!user || !isGuestUser(user.id)) return 0;
  
  if (feature === 'ai') {
    return user.aiUsageCount || 0;
  } else {
    return user.shoppingListUsageCount || 0;
  }
}

/**
 * Check if guest user has exceeded usage limits
 */
export function hasExceededGuestLimit(feature: 'ai' | 'shopping_list', user?: any): boolean {
  if (!user || !isGuestUser(user.id)) return false;
  
  const usage = getGuestUsage(feature, user);
  const limits = user.guestUsageLimits || getGuestUsageLimits();
  
  const limit = feature === 'ai' ? limits.aiGeneration : limits.shoppingList;
  return usage >= limit;
}

/**
 * Get remaining guest usage for a feature
 */
export function getRemainingGuestUsage(feature: 'ai' | 'shopping_list', user?: any): number {
  if (!user || !isGuestUser(user.id)) return 0;
  
  const usage = getGuestUsage(feature, user);
  const limits = user.guestUsageLimits || getGuestUsageLimits();
  
  const limit = feature === 'ai' ? limits.aiGeneration : limits.shoppingList;
  return Math.max(0, limit - usage);
}
