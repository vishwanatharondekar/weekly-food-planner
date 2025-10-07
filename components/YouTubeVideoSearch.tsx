import React, { useState, useEffect, useCallback } from 'react';
import { Search, Play, ExternalLink, Loader2 } from 'lucide-react';
import { searchYouTubeVideos, YouTubeVideo, formatPublishedDate, formatDuration } from '@/lib/youtube-search';
import toast from 'react-hot-toast';

interface YouTubeVideoSearchProps {
  onVideoSelect: (video: YouTubeVideo) => void;
  initialQuery?: string;
}

export default function YouTubeVideoSearch({ onVideoSelect, initialQuery = '' }: YouTubeVideoSearchProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setVideos([]);
        setHasSearched(false);
        return;
      }

      try {
        setLoading(true);
        const response = await searchYouTubeVideos(query, 10);
        setVideos(response.items);
        setNextPageToken(response.nextPageToken);
        setHasSearched(true);
      } catch (error) {
        console.error('Search error:', error);
        toast.error('Failed to search videos. Please try again.');
        setVideos([]);
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    }, 500),
    []
  );

  // Search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    }
  };

  const loadMoreVideos = async () => {
    if (!nextPageToken || loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await searchYouTubeVideos(searchQuery, 10, nextPageToken);
      setVideos(prev => [...prev, ...response.items]);
      setNextPageToken(response.nextPageToken);
    } catch (error) {
      console.error('Load more error:', error);
      toast.error('Failed to load more videos');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVideoSelect = (video: YouTubeVideo) => {
    onVideoSelect(video);
  };

  const extractVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const handleCardClick = (video: YouTubeVideo) => {
    const videoId = extractVideoId(video.url);
    if (videoId) {
      setExpandedVideoId(expandedVideoId === videoId ? null : videoId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for cooking videos..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !searchQuery.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:w-auto w-full"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>
      </form>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Searching videos...</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No videos found for "{searchQuery}"</p>
              <p className="text-sm">Try a different search term</p>
            </div>
          ) : (
            <>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {videos.map((video) => {
                  const videoId = extractVideoId(video.url);
                  const isExpanded = expandedVideoId === videoId;
                  
                  return (
                    <div
                      key={video.id}
                      className="border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      {/* Thumbnail or Video Preview */}
                      <div className="relative">
                        {isExpanded ? (
                          <div className="aspect-video bg-gray-100 rounded-t-lg">
                            <iframe
                              width="100%"
                              height="100%"
                              src={`https://www.youtube.com/embed/${videoId}`}
                              title="YouTube video player"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              className="rounded-t-lg"
                            ></iframe>
                          </div>
                        ) : (
                          <>
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-full h-40 object-cover rounded-t-lg cursor-pointer"
                              onClick={() => handleCardClick(video)}
                            />
                            {video.duration && (
                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-1.5 py-0.5 rounded">
                                {formatDuration(video.duration)}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center cursor-pointer"
                                 onClick={() => handleCardClick(video)}>
                              <div className="opacity-0 hover:opacity-100 transition-opacity duration-200">
                                <Play className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="p-3">
                        <h4 className="font-medium text-gray-900 line-clamp-2 mb-2 text-sm">
                          {video.title}
                        </h4>
                        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                          {video.description}
                        </p>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {video.duration && (
                              <>
                                <span className="font-medium">{formatDuration(video.duration)}</span>
                                <span>•</span>
                              </>
                            )}
                            <span className="truncate">{video.channelTitle}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            {isExpanded && (
                              <button
                                onClick={() => setExpandedVideoId(null)}
                                className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 sm:order-1"
                              >
                                Collapse
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVideoSelect(video);
                              }}
                              className="w-full sm:w-auto px-3 py-2 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center justify-center gap-1 sm:order-2"
                              title="Select this video"
                            >
                              <Play className="w-3 h-3" />
                              Select
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
