// YouTube Data API v3 integration for video search
// This module handles searching for cooking videos on YouTube

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string | null;
  url: string;
}

export interface YouTubeSearchResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

/**
 * Search for cooking videos on YouTube using our API route
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<YouTubeSearchResponse> {
  if (!query || !query.trim()) {
    throw new Error('Search query is required');
  }

  const params = new URLSearchParams({
    q: query.trim(),
    maxResults: maxResults.toString()
  });

  if (pageToken) {
    params.append('pageToken', pageToken);
  }

  const url = `/api/youtube/search?${params.toString()}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to search videos');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    throw error;
  }
}


/**
 * Format the published date for display
 */
export function formatPublishedDate(publishedAt: string): string {
  const date = new Date(publishedAt);
  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    return 'Today';
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffInDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
}

/**
 * Convert YouTube ISO 8601 duration to readable format
 */
export function formatDuration(duration: string | null): string {
  if (!duration) return '';
  
  // Parse ISO 8601 duration (e.g., PT4M13S, PT1H30M15S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
