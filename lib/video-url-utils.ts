import { authAPI } from './api';

// Cache for video URLs to avoid repeated API calls
let videoURLCache: { [recipeName: string]: string } | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all video URLs for the current user
 */
export async function getUserVideoURLs(): Promise<{ [recipeName: string]: string }> {
  const now = Date.now();
  
  // Return cached data if it's still valid
  if (videoURLCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return videoURLCache;
  }

  try {
    const videoURLs = await authAPI.getVideoURLs();
    videoURLCache = videoURLs;
    cacheTimestamp = now;
    return videoURLs;
  } catch (error) {
    console.warn('Failed to fetch video URLs:', error);
    return {};
  }
}

/**
 * Get video URL for a specific recipe
 * Returns stored URL if available, otherwise generates YouTube search URL
 */
export async function getVideoURLForRecipe(recipeName: string): Promise<string> {
  if (!recipeName || !recipeName.trim()) {
    return '';
  }

  const normalizedRecipeName = recipeName.toLowerCase().trim();
  const videoURLs = await getUserVideoURLs();
  
  // Return stored URL if available
  if (videoURLs[normalizedRecipeName]) {
    return videoURLs[normalizedRecipeName];
  }

  // Generate YouTube search URL as fallback
  return generateYouTubeSearchURL(recipeName);
}

/**
 * Save video URL for a recipe
 */
export async function saveVideoURLForRecipe(recipeName: string, videoUrl: string): Promise<void> {
  if (!recipeName || !recipeName.trim() || !videoUrl) {
    throw new Error('Recipe name and video URL are required');
  }

  try {
    await authAPI.saveVideoURL(recipeName.trim(), videoUrl);
    
    // Update cache
    if (videoURLCache) {
      videoURLCache[recipeName.toLowerCase().trim()] = videoUrl;
    }
  } catch (error) {
    console.error('Failed to save video URL:', error);
    throw error;
  }
}

/**
 * Generate YouTube search URL for a recipe
 */
export function generateYouTubeSearchURL(recipeName: string): string {
  if (!recipeName || !recipeName.trim()) {
    return '';
  }

  // Clean the recipe name and create a focused search query
  const cleanRecipeName = recipeName.trim().replace(/[^\w\s]/g, '');
  
  // Create a more specific search that's likely to find recipe videos
  const searchQuery = `${cleanRecipeName} recipe tutorial cooking`;
  const encodedQuery = encodeURIComponent(searchQuery);
  
  // Use YouTube's search with additional parameters for better video results:
  // - sp=EgIQAQ%253D%253D filters for videos only
  // - type=video ensures we get videos
  const url = `https://www.youtube.com/results?search_query=${encodedQuery}&sp=EgIQAQ%253D%253D`;
  
  return url;
}

/**
 * Clear the video URL cache
 */
export function clearVideoURLCache(): void {
  videoURLCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if a URL is a valid YouTube URL
 */
export function isValidYouTubeURL(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Check for YouTube domain
  const youtubeDomains = [
    'youtube.com',
    'www.youtube.com',
    'youtu.be',
    'www.youtu.be'
  ];

  try {
    const urlObj = new URL(url);
    return youtubeDomains.some(domain => urlObj.hostname === domain);
  } catch {
    return false;
  }
}

/**
 * Extract video ID from YouTube URL
 */
export function extractYouTubeVideoID(url: string): string | null {
  if (!isValidYouTubeURL(url)) {
    return null;
  }

  try {
    const urlObj = new URL(url);
    
    // Handle youtu.be URLs
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      return urlObj.pathname.slice(1);
    }
    
    // Handle youtube.com URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      const searchParams = urlObj.searchParams;
      return searchParams.get('v');
    }
    
    return null;
  } catch {
    return null;
  }
} 