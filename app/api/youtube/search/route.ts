import { NextRequest, NextResponse } from 'next/server';

// In-memory cache for YouTube search results
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const searchCache = new Map<string, CacheEntry>();

// Cache TTL: 24 hours
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to generate cache key
function generateCacheKey(query: string, maxResults: string, pageToken?: string): string {
  return `${query.toLowerCase().trim()}_${maxResults}_${pageToken || 'first'}`;
}

// Helper function to check if cache entry is valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

// Helper function to get cached data
function getCachedData(key: string): any | null {
  const entry = searchCache.get(key);
  if (entry && isCacheValid(entry)) {
    return entry.data;
  }
  // Remove expired entry
  if (entry) {
    searchCache.delete(key);
  }
  return null;
}

// Helper function to set cached data
function setCachedData(key: string, data: any): void {
  searchCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl: CACHE_TTL
  });
}

// Helper function to clean up expired cache entries
function cleanupExpiredCache(): void {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  searchCache.forEach((entry, key) => {
    if (now - entry.timestamp >= entry.ttl) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => searchCache.delete(key));
}

// Clean up expired cache entries periodically (every 10 minutes)
setInterval(cleanupExpiredCache, 10 * 60 * 1000);

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

    // Generate cache key
    const cacheKey = generateCacheKey(query, maxResults, pageToken || undefined);
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for query: ${query} (Cache size: ${searchCache.size})`);
      return NextResponse.json(cachedData);
    }

    console.log(`Cache miss for query: ${query}, fetching from YouTube API (Cache size: ${searchCache.size})`);

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
      videoDuration: 'short',
      maxResults: maxResults,
      key: apiKey,
      order: 'relevance', // Most relevant videos first
      videoCategoryId: '26', // Howto & Style category (includes cooking)
      safeSearch: 'moderate'
    });

    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const videosResponse = [
      {
        "id": "VMXp9sf7AFk",
        "title": "Stuffed Brinjal Curry | Bharwa Baingan | Badanekayi Ennegayi | भरवां बैंगन",
        "description": "stuffedbrinjal     In this video we are going to see a recipe with small ...",
        "thumbnail": "https://i.ytimg.com/vi/VMXp9sf7AFk/mqdefault.jpg",
        "channelTitle": "Our Orange Kitchen",
        "publishedAt": "2020-07-01T16:15:36Z",
        "duration": "PT3M30S",
        "url": "https://www.youtube.com/watch?v=VMXp9sf7AFk"
      },
      {
        "id": "PdsGDOEoLEA",
        "title": "Stuffed Brinjal Masala - Chef Aadharsh Tatpati",
        "description": "For more videos visit – http://www.rasoismart.com Please subscribe to my channel - youtube.com/c/RasoiSmart Video URL ...",
        "thumbnail": "https://i.ytimg.com/vi/PdsGDOEoLEA/mqdefault.jpg",
        "channelTitle": "RASOI SMART - INDIAN RECIPES",
        "publishedAt": "2016-02-16T13:10:10Z",
        "duration": "PT2M40S",
        "url": "https://www.youtube.com/watch?v=PdsGDOEoLEA"
      },
      {
        "id": "hQlontBC3DU",
        "title": "mouth watering stuffed brinjal curry easy method |grand mothers recipe",
        "description": "stuffed brinjal curry ,stuffed brinjal curry royal daks , royal daks stuffed brinjal curry .",
        "thumbnail": "https://i.ytimg.com/vi/hQlontBC3DU/mqdefault.jpg",
        "channelTitle": "Royal Daks",
        "publishedAt": "2021-05-04T09:18:16Z",
        "duration": "PT57S",
        "url": "https://www.youtube.com/watch?v=hQlontBC3DU"
      },
      {
        "id": "FCICNFoGtpk",
        "title": "khandeshi vangyache bharit &amp; jwarichi bhakri",
        "description": "khandeshi vangyache bharit & jwarichi bhakri     Vangyache bharit is a popular ...",
        "thumbnail": "https://i.ytimg.com/vi/FCICNFoGtpk/mqdefault.jpg",
        "channelTitle": "cook with manisha",
        "publishedAt": "2021-02-01T07:32:54Z",
        "duration": "PT16S",
        "url": "https://www.youtube.com/watch?v=FCICNFoGtpk"
      },
      {
        "id": "H2sn2aa0Yww",
        "title": "Bhaingan Chatni/Badanekayi Chatni/Bhaingan ka bharta/egg plant chatni perfect for jowar roti/chapati",
        "description": "Badanekayi chatni is the most famous dish from north karnataka.. This makes the perfect breakfast or lunch or even dinner with ...",
        "thumbnail": "https://i.ytimg.com/vi/H2sn2aa0Yww/mqdefault.jpg",
        "channelTitle": "Megha's Style-File",
        "publishedAt": "2017-12-06T17:36:00Z",
        "duration": "PT3M36S",
        "url": "https://www.youtube.com/watch?v=H2sn2aa0Yww"
      },
      {
        "id": "0ho3FaA9Lgc",
        "title": "ennegayi recipe | stuffed brinjal recipe | badanekai yennegai |",
        "description": "",
        "thumbnail": "https://i.ytimg.com/vi/0ho3FaA9Lgc/mqdefault.jpg",
        "channelTitle": "Shobha Nijagal",
        "publishedAt": "2020-07-05T13:43:36Z",
        "duration": "PT2M58S",
        "url": "https://www.youtube.com/watch?v=0ho3FaA9Lgc"
      },
      {
        "id": "unROGwMigBE",
        "title": "Ennegayi palya- Stuffed Brinjal Curry- baingan masala recipe- Uttarakarnataka badanekayi ennegayi",
        "description": "How-to make Badanekayi Ennegayi palya is popular north Karnataka or uttarakarnataka recipe. badanekayi ennegayi well suits ...",
        "thumbnail": "https://i.ytimg.com/vi/unROGwMigBE/mqdefault.jpg",
        "channelTitle": "ARK_ ಪ್ರಪಂಚ(world)",
        "publishedAt": "2017-10-07T02:25:21Z",
        "duration": "PT2M32S",
        "url": "https://www.youtube.com/watch?v=unROGwMigBE"
      },
      {
        "id": "KBN5mIJJMMA",
        "title": "Brinjal/Eggplant/Aubergine Masala Recipe | ಬದನೇಕಾಯಿ ಎಣ್ಣೆಗಾಯಿ | भरवां बैंगन | Uttara karnataka style",
        "description": "ಬದನೇಕಾಯಿ ಎಣ್ಣೆಗಾಯಿ | Brinjal/Eggplant/Aubergine Masala Recipe | भरवां बैंगन | Uttara karnataka ...",
        "thumbnail": "https://i.ytimg.com/vi/KBN5mIJJMMA/mqdefault.jpg",
        "channelTitle": "Raykar's Rasoi",
        "publishedAt": "2020-06-28T11:54:43Z",
        "duration": "PT2M52S",
        "url": "https://www.youtube.com/watch?v=KBN5mIJJMMA"
      },
      {
        "id": "QQMQlIbMlqY",
        "title": "Zatpat Vangyache Bharit || चंपाषष्टी स्पेशल झटपट वांग्याचे भरीत || instant vangyache bharit",
        "description": "1.how to make zatpat vangyache bharit 2.how to make instant vangyache bharit 3.how to make instant brinjal vegetable recipe ...",
        "thumbnail": "https://i.ytimg.com/vi/QQMQlIbMlqY/mqdefault.jpg",
        "channelTitle": "Shital Wagh",
        "publishedAt": "2017-11-24T18:29:27Z",
        "duration": "PT3M25S",
        "url": "https://www.youtube.com/watch?v=QQMQlIbMlqY"
      },
      {
        "id": "1-YgvL1aPJk",
        "title": "PavakaiPitla-7",
        "description": "Pavakai Pitla.",
        "thumbnail": "https://i.ytimg.com/vi/1-YgvL1aPJk/mqdefault.jpg",
        "channelTitle": "shruthiaravind",
        "publishedAt": "2008-06-26T18:10:38Z",
        "duration": "PT7S",
        "url": "https://www.youtube.com/watch?v=1-YgvL1aPJk"
      }
    ]

    // Uncomment this to use the mock data
    // return NextResponse.json({
    //   items: videosResponse,
    // });
    

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
    
    // Get video IDs for duration lookup
    const videoIds = data.items.map((item: any) => item.id.videoId).join(',');
    
    // Fetch video details including duration
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${apiKey}`
    );
    
    let videoDetails: { [key: string]: string } = {};
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();

      console.log('Details Data : ', JSON.stringify(detailsData, null, 2));
      videoDetails = detailsData.items.reduce((acc: { [key: string]: string }, item: any) => {
        acc[item.id] = item.contentDetails.duration;
        return acc;
      }, {});
    }
    
    // Transform the response
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title.replace(/#\w+/g, '').trim(),
      description: item.snippet.description.replace(/#\w+/g, '').trim(),
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      duration: videoDetails[item.id.videoId] || null,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    const responseData = {
      items: videos,
      nextPageToken: data.nextPageToken,
      totalResults: data.pageInfo?.totalResults || 0
    };

    // Cache the response
    setCachedData(cacheKey, responseData);
    console.log(`Cached response for query: ${query}`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('YouTube search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube videos' },
      { status: 500 }
    );
  }
}
