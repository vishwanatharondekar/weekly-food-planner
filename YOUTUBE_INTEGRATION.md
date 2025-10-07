# YouTube Video Search Integration

This document explains how to set up and use the YouTube video search feature in the meal planner.

## Overview

The meal planner now includes a YouTube video search feature that allows users to:
- Search for cooking videos directly within the video modal
- Select videos from search results
- Still manually enter specific video URLs if needed

## Setup Instructions

### 1. Get YouTube Data API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the YouTube Data API v3:
   - Go to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click on it and press "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Configure Environment Variables

Add the YouTube API key to your environment variables:

```bash
# Add this to your .env.local file
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 3. API Quota Considerations

The YouTube Data API has usage quotas:
- **Free tier**: 10,000 units per day
- **Search requests**: 100 units per request
- **Video details**: 1 unit per request

This means you can make approximately 100 search requests per day on the free tier.

## How It Works

### User Experience

1. **Opening Video Modal**: When a user clicks the video icon (📹) next to a meal, the video modal opens
2. **Search Tab**: By default, users see the "Search Videos" tab
3. **Searching**: Users can search for cooking videos using the meal name or any other terms
4. **Selecting**: Users can click "Select" on any video to choose it
5. **Manual Entry**: Users can switch to the "Enter URL Manually" tab to paste a specific URL
6. **Preview**: The selected video shows a preview before saving

### Technical Implementation

#### API Route (`/api/youtube/search`)
- Handles YouTube API requests server-side to keep API key secure
- Enhances search queries with "recipe cooking tutorial" for better results
- Filters results to cooking-related content (category 26: Howto & Style)
- Returns video metadata including title, description, thumbnail, and URL

#### Components

**YouTubeVideoSearch Component**:
- Provides search interface with debounced input
- Displays search results with thumbnails and metadata
- Handles pagination for loading more results
- Allows video selection and preview

**Enhanced VideoModal**:
- Tabbed interface for search vs manual entry
- Integrates YouTube search functionality
- Maintains existing manual URL entry capability
- Shows video preview for selected videos

#### Search Features

- **Debounced Search**: Reduces API calls by waiting 500ms after user stops typing
- **Enhanced Queries**: Automatically adds "recipe cooking tutorial" to search terms
- **Category Filtering**: Focuses on cooking-related videos
- **Pagination**: Supports loading more results
- **Error Handling**: Graceful handling of API errors and network issues

## Usage Examples

### Basic Search
1. User enters "pasta" in the search box
2. System searches for "pasta recipe cooking tutorial"
3. Returns relevant cooking videos with thumbnails
4. User selects a video and it's attached to the meal

### Manual URL Entry
1. User switches to "Enter URL Manually" tab
2. Pastes a specific YouTube URL
3. System validates and shows preview
4. User saves the video

## Error Handling

The system handles various error scenarios:
- **API Key Missing**: Shows appropriate error message
- **Network Errors**: Displays user-friendly error messages
- **Invalid URLs**: Validates YouTube URLs before saving
- **Rate Limiting**: Handles API quota exceeded scenarios

## Security Considerations

- API key is stored server-side only
- Client-side requests go through our API route
- No sensitive data is exposed to the client
- Input validation prevents malicious URLs

## Future Enhancements

Potential improvements for the future:
- **Caching**: Cache search results to reduce API calls
- **User Preferences**: Remember user's preferred cooking channels
- **Video Categories**: Filter by specific cooking types (vegetarian, quick meals, etc.)
- **Offline Support**: Cache popular videos for offline access
- **Analytics**: Track which videos are most popular among users

## Troubleshooting

### Common Issues

1. **"YouTube API key is not configured"**
   - Ensure `YOUTUBE_API_KEY` is set in your environment variables
   - Restart your development server after adding the key

2. **"Failed to search videos"**
   - Check if the YouTube Data API v3 is enabled in Google Cloud Console
   - Verify your API key has the correct permissions
   - Check if you've exceeded your daily quota

3. **No search results**
   - Try different search terms
   - Check if the search query is too specific or too broad
   - Verify your internet connection

### API Quota Monitoring

Monitor your API usage in the Google Cloud Console:
1. Go to "APIs & Services" > "Quotas"
2. Search for "YouTube Data API v3"
3. Monitor your daily usage against the 10,000 unit limit

## Support

If you encounter issues with the YouTube integration:
1. Check the browser console for error messages
2. Verify your API key configuration
3. Test the API key directly with a simple curl request
4. Check the Google Cloud Console for quota and billing information
