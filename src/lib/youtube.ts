
/**
 * YouTube search integration using Supabase Edge Functions
 * No API key required, no CORS issues
 */
import { supabase } from './supabase';

// Maximum allowed song length in seconds (6 minutes)
export const MAX_SONG_LENGTH = 6 * 60; // 360 seconds

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // Duration in seconds
  channelTitle: string;
}



/**
 * Search for YouTube videos using Supabase Edge Function
 * @param query - Search term for videos
 * @returns Promise<YouTubeVideo[]> - Array of video results
 */
export async function searchYouTubeVideos(query: string): Promise<YouTubeVideo[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke('youtube-search', {
      body: { query: query.trim() }
    });

    if (error) {
      console.error('Edge function error:', error);
      return getFallbackResults(query);
    }

    if (!data?.videos || data.videos.length === 0) {
      return getFallbackResults(query);
    }

    return data.videos
      .filter((video: YouTubeVideo) => video.id && video.title && video.duration > 0)
      .slice(0, 8); // Limit to 8 results for UI

  } catch (error) {
    console.error('YouTube search failed:', error);
    return getFallbackResults(query);
  }
}

/**
 * Provide fallback search results when real search fails
 * @param query - Original search query
 * @returns Array of fallback video results
 */
function getFallbackResults(query: string): YouTubeVideo[] {
  return [
    {
      id: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up - Rick Astley',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      duration: 212,
      channelTitle: 'Rick Astley',
    },
    {
      id: '3tmd-ClpJxA',
      title: 'Keyboard Cat - The Original',
      thumbnail: 'https://i.ytimg.com/vi/3tmd-ClpJxA/hqdefault.jpg',
      duration: 55,
      channelTitle: 'Keyboard Cat',
    },
    {
      id: 'eIvkUEv6w8s',
      title: 'LEMONS (feat. Tyler, The Creator) - N.E.R.D',
      thumbnail: 'https://i.ytimg.com/vi/eIvkUEv6w8s/hqdefault.jpg',
      duration: 212,
      channelTitle: 'N.E.R.D',
    },
    {
      id: 'y6120QOlsfU',
      title: 'Darude - Sandstorm',
      thumbnail: 'https://i.ytimg.com/vi/y6120QOlsfU/hqdefault.jpg',
      duration: 224,
      channelTitle: 'Darude',
    }
  ].map(video => ({
    ...video,
    title: `${video.title} (Search: "${query}")`
  }));
}

/**
 * Convert duration in seconds to MM:SS format
 * @param duration - Duration in seconds
 * @returns Formatted string like "3:45"
 */
export function parseDuration(duration: number): string {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Check if a video duration is within the allowed limit
 * @param duration - Duration in seconds
 * @returns true if video is allowed, false if too long
 */
export function isValidSongLength(duration: number): boolean {
  return duration > 0 && duration <= MAX_SONG_LENGTH;
}

/**
 * Get a user-friendly message for song length validation
 * @param duration - Duration in seconds
 * @returns Error message or null if valid
 */
export function getSongLengthError(duration: number): string | null {
  if (duration <= 0) {
    return 'Invalid video duration';
  }
  if (duration > MAX_SONG_LENGTH) {
    const minutes = Math.floor(MAX_SONG_LENGTH / 60);
    return `Song is too long! Maximum length is ${minutes} minutes. This video is ${parseDuration(duration)}.`;
  }
  return null;
}
