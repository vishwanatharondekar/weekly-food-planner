/**
 * Email tracking utilities for generating tracking URLs and pixels
 */

export interface EmailTrackingData {
  userId: string;
  userEmail: string;
  weekStartDate: string;
  linkType?: string;
}

/**
 * Generate a tracking pixel URL for email opens
 */
export function generateTrackingPixelUrl(data: EmailTrackingData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.khanakyabanau.in';
  const params = new URLSearchParams({
    event: 'open',
    userId: data.userId,
    userEmail: data.userEmail,
    weekStartDate: data.weekStartDate,
  });

  return `${baseUrl}/api/email-tracking?${params.toString()}`;
}

/**
 * Generate a tracked link URL that redirects through our tracking endpoint
 */
export function generateTrackedLinkUrl(originalUrl: string, data: EmailTrackingData): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.khanakyabanau.in';
  const params = new URLSearchParams({
    event: 'click',
    userId: data.userId,
    userEmail: data.userEmail,
    weekStartDate: data.weekStartDate,
    linkType: data.linkType || 'unknown',
    redirect: encodeURIComponent(originalUrl),
  });

  return `${baseUrl}/api/email-tracking?${params.toString()}`;
}

/**
 * Generate UTM parameters for email links
 */
export function generateEmailUTMParams(linkType: string, weekStartDate: string): string {
  const params = new URLSearchParams({
    utm_source: 'email',
    utm_medium: 'weekly_meal_plan',
    utm_campaign: `meal_plan_${linkType}`,
    utm_content: weekStartDate,
  });

  return params.toString();
}

/**
 * Generate a complete tracked URL with UTM parameters
 */
export function generateCompleteTrackedUrl(
  originalUrl: string, 
  data: EmailTrackingData
): string {
  // Add UTM parameters to the original URL
  const urlWithUTM = addUTMToUrl(originalUrl, data.linkType || 'unknown', data.weekStartDate);
  
  // Generate tracked link that redirects through our endpoint
  return generateTrackedLinkUrl(urlWithUTM, data);
}

/**
 * Add UTM parameters to a URL
 */
function addUTMToUrl(url: string, linkType: string, weekStartDate: string): string {
  const urlObj = new URL(url);
  const utmParams = generateEmailUTMParams(linkType, weekStartDate);
  
  // Add UTM parameters to existing query string
  const existingParams = urlObj.search ? urlObj.search.substring(1) : '';
  const allParams = existingParams ? `${existingParams}&${utmParams}` : utmParams;
  
  urlObj.search = allParams;
  return urlObj.toString();
}

/**
 * Generate tracking data for email templates
 */
export function createEmailTrackingData(
  userId: string,
  userEmail: string,
  weekStartDate: string
): EmailTrackingData {
  return {
    userId,
    userEmail,
    weekStartDate,
  };
}

/**
 * Generate all tracking URLs for an email
 */
export function generateEmailTrackingUrls(data: EmailTrackingData) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.khanakyabanau.in';
  const weekUrl = `${appUrl}/plan/${data.weekStartDate}`;
  
  return {
    // Tracking pixel for email opens
    trackingPixel: generateTrackingPixelUrl(data),
    
    // Main app links with tracking
    mainAppLink: generateCompleteTrackedUrl(appUrl, { ...data, linkType: 'main_app' }),
    footerAppLink: generateCompleteTrackedUrl(appUrl, { ...data, linkType: 'footer_app' }),
    
    // Week-specific app link with tracking
    weekStartDateLink: generateCompleteTrackedUrl(weekUrl, { ...data, linkType: 'week_plan' }),
    
    // Unsubscribe link (no tracking needed as it has its own system)
    // This will be handled by the existing unsubscribe system
  };
}
