
import React, { useState, useEffect } from 'react';
import { searchYouTubeVideos, type YouTubeVideo, parseDuration, isValidSongLength } from '../lib/youtube';

interface YouTubeSearchProps {
  onSelectVideo: (video: YouTubeVideo) => void;
  onSearchMade?: () => void; // Callback when user performs a search
  searchQuery?: string; // External search query to set
  onQueryChange?: (query: string) => void; // Callback when query changes
}

const YouTubeSearch: React.FC<YouTubeSearchProps> = ({ onSelectVideo, onSearchMade, searchQuery, onQueryChange }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    onSearchMade?.(); // Notify parent that search was made
    const searchResults = await searchYouTubeVideos(searchQuery);
    setResults(searchResults || []);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSearch(query);
  };

  // Handle external search query changes
  useEffect(() => {
    if (searchQuery && searchQuery !== query) {
      setQuery(searchQuery);
    }
  }, [searchQuery]);

  // Auto-search when user stops typing
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (query.trim()) {
      const timeout = setTimeout(() => {
        performSearch(query);
      }, 500); // Wait 500ms after user stops typing
      setSearchTimeout(timeout);
    } else {
      setResults([]);
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [query]);

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const newQuery = e.target.value;
            setQuery(newQuery);
            onQueryChange?.(newQuery);
          }}
          placeholder="Search for a song on YouTube..."
          className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
        />
      </form>

      {loading && (
        <div className="space-y-3">
          <p className="text-center text-muted-foreground">Searching...</p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg p-4">
                <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted-foreground/20 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && results.length === 0 && query.trim() && (
        <p className="text-center text-muted-foreground">No results found for "{query}".</p>
      )}
      {!loading && results.length === 0 && !query.trim() && (
        <p className="text-center text-muted-foreground text-sm">Start typing to search for songs...</p>
      )}

      <div className="space-y-3">
        {results.map((video) => {
          const isValidLength = isValidSongLength(video.duration);
          const duration = parseDuration(video.duration);
          
          return (
            <div
              key={video.id}
              onClick={() => isValidLength && onSelectVideo(video)}
              className={`bg-card border rounded-lg p-4 transition-colors ${
                isValidLength 
                  ? 'cursor-pointer hover:bg-accent/50' 
                  : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 min-w-0">
                <div className="flex gap-3 flex-1 min-w-0 overflow-hidden">
                  <img src={video.thumbnail} alt={video.title} className="w-16 h-12 object-cover rounded-md flex-shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h4 className={`font-semibold text-sm mb-1 break-words leading-tight ${
                      isValidLength ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {video.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-1 break-words leading-tight">{video.channelTitle}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                        isValidLength 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {duration}
                      </span>
                      {!isValidLength && (
                        <span className="text-xs text-red-500 flex-shrink-0">Too long (max 6 min)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {isValidLength && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectVideo(video);
                    }}
                    className="flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1 rounded text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default YouTubeSearch;
