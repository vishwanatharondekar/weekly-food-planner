import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const maxResults = searchParams.get('maxResults') || '10';
    const pageToken = searchParams.get('pageToken');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }

    // Enhance the search query for cooking videos
    const enhancedQuery = `${query.trim()} recipe cooking tutorial`;
    
    const params = new URLSearchParams({
      part: 'snippet',
      q: enhancedQuery,
      type: 'video',
      maxResults: maxResults,
      key: apiKey,
      order: 'relevance', // Most relevant videos first
      videoCategoryId: '26', // Howto & Style category (includes cooking)
      safeSearch: 'moderate'
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `YouTube API error: ${errorData.error?.message || 'Unknown error'}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform the response
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    return NextResponse.json({
      items: videos,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults || 0
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube videos' },
      { status: 500 }
    );
  }
}
