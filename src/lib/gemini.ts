import { supabase } from './supabase';
import { type QueueItem } from './supabase';

export interface SuggestedSong {
  title: string;
  artist: string;
  reason: string;
}

export interface SuggestionsResult {
  suggestions: SuggestedSong[];
  isPersonalized: boolean;
  isLoading: boolean;
}


// Cache management
const CACHE_KEY = 'snaptrack_suggestions';
const SESSION_KEY = 'snaptrack_session';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface CachedSuggestions {
  suggestions: SuggestedSong[];
  timestamp: number;
  context: string;
  version: string;
  sessionId: string; // Track page sessions
}

const CACHE_VERSION = '1.0';

// Generate unique session ID on page load
function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem(SESSION_KEY, sessionId);
    console.log('New session started:', sessionId);
  }
  return sessionId;
}

function getCacheKey(currentSong: QueueItem | null, recentSongs: QueueItem[], fullQueue: QueueItem[], mood: string = ''): string {
  const current = currentSong?.title || 'none';
  const recent = recentSongs.slice(0, 5).map(s => s.title).join(',');
  const queueCount = fullQueue.length;
  
  // Add time context for different party phases
  const now = new Date();
  const hour = now.getHours();
  const timePhase = getTimePhase(hour);
  const moodKey = mood ? mood.substring(0, 50) : 'none'; // Limit mood length for cache key
  
  return `${current}|${recent}|${queueCount}|${timePhase}|${moodKey}`;
}

// Determine party phase based on time of day
function getTimePhase(hour: number): string {
  if (hour >= 6 && hour < 12) return 'morning'; // 6am-12pm
  if (hour >= 12 && hour < 17) return 'afternoon'; // 12pm-5pm
  if (hour >= 17 && hour < 21) return 'early-evening'; // 5pm-9pm
  if (hour >= 21 && hour < 24) return 'prime-time'; // 9pm-12am
  if (hour >= 0 && hour < 3) return 'late-night'; // 12am-3am
  return 'after-hours'; // 3am-6am
}

// Format time for display in context
function formatPlayTime(dateString: string | null): string {
  if (!dateString) return 'recently';
  
  const playTime = new Date(dateString);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - playTime.getTime()) / (1000 * 60));
  
  if (diffMinutes < 5) return 'just now';
  if (diffMinutes < 30) return `${diffMinutes}m ago`;
  if (diffMinutes < 120) return `${Math.floor(diffMinutes / 60)}h ago`;
  
  const hour = playTime.getHours();
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${playTime.getMinutes().toString().padStart(2, '0')} ${period}`;
}

function getCachedSuggestions(context: string): SuggestedSuggestions | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }
    
    const data: CachedSuggestions = JSON.parse(cached);
    const currentSessionId = getSessionId();
    
    // Check version compatibility
    if (data.version !== CACHE_VERSION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    // Check session ID
    if (data.sessionId !== currentSessionId) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    const isExpired = Date.now() - data.timestamp > CACHE_DURATION;
    const isWrongContext = data.context !== context;
    
    if (isExpired || isWrongContext) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return {
      suggestions: data.suggestions,
      isCached: true
    };
  } catch (error) {
    console.warn('Error reading cached suggestions:', error);
    localStorage.removeItem(CACHE_KEY); // Clear corrupted cache
    return null;
  }
}

interface SuggestedSuggestions {
  suggestions: SuggestedSong[];
  isCached: boolean;
}

function setCachedSuggestions(suggestions: SuggestedSong[], context: string): void {
  try {
    const data: CachedSuggestions = {
      suggestions,
      timestamp: Date.now(),
      context,
      version: CACHE_VERSION,
      sessionId: getSessionId()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache suggestions:', error);
  }
}

// Vibe-aware instant suggestions with subtle time consideration
export function getInstantSuggestions(): SuggestedSong[] {
  const hour = new Date().getHours();
  const timePhase = getTimePhase(hour);
  
  const suggestionsByPhase = {
    'morning': [
      { title: "Good as Hell", artist: "Lizzo", reason: "Uplifting pop with strong vocals" },
      { title: "Can't Stop the Feeling!", artist: "Justin Timberlake", reason: "Feel-good funk-pop energy" },
      { title: "Sunflower", artist: "Post Malone & Swae Lee", reason: "Melodic hip-hop with chill vibes" },
      { title: "Walking on Sunshine", artist: "Katrina and the Waves", reason: "Classic upbeat rock-pop" }
    ],
    'afternoon': [
      { title: "As It Was", artist: "Harry Styles", reason: "Smooth pop-rock with nostalgic feel" },
      { title: "Heat Waves", artist: "Glass Animals", reason: "Dreamy indie-pop with steady groove" },
      { title: "Levitating", artist: "Dua Lipa", reason: "Disco-influenced dance-pop" },
      { title: "Shape of You", artist: "Ed Sheeran", reason: "Acoustic-pop with tropical house elements" }
    ],
    'early-evening': [
      { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", reason: "Funk-pop with retro energy" },
      { title: "Good 4 U", artist: "Olivia Rodrigo", reason: "Pop-punk with driving guitar" },
      { title: "Anti-Hero", artist: "Taylor Swift", reason: "Alternative pop with synth elements" },
      { title: "Flowers", artist: "Miley Cyrus", reason: "Pop-rock with empowering lyrics" }
    ],
    'prime-time': [
      { title: "Blinding Lights", artist: "The Weeknd", reason: "Synthwave-pop with 80s influences" },
      { title: "Don't Start Now", artist: "Dua Lipa", reason: "Dance-pop with disco bassline" },
      { title: "Bad Habit", artist: "Steve Lacy", reason: "Funk-R&B with groovy guitar" },
      { title: "Industry Baby", artist: "Lil Nas X & Jack Harlow", reason: "Hip-hop with bold production" }
    ],
    'late-night': [
      { title: "Cruel Summer", artist: "Taylor Swift", reason: "Synth-pop with emotional depth" },
      { title: "Watermelon Sugar", artist: "Harry Styles", reason: "Rock-pop with summery groove" },
      { title: "Physical", artist: "Dua Lipa", reason: "High-energy dance-pop" },
      { title: "Save Your Tears", artist: "The Weeknd", reason: "Synth-pop with melodic hooks" }
    ],
    'after-hours': [
      { title: "Midnight Rain", artist: "Taylor Swift", reason: "Atmospheric pop with moody synths" },
      { title: "golden hour", artist: "JVKE", reason: "Dreamy pop with ambient textures" },
      { title: "Something In The Way You Move", artist: "Ellie Goulding", reason: "Electronic-pop with ethereal vocals" },
      { title: "Adore You", artist: "Harry Styles", reason: "Soft rock-pop with warm production" }
    ]
  };
  
  const baseSuggestions = suggestionsByPhase[timePhase as keyof typeof suggestionsByPhase] || suggestionsByPhase['prime-time'];
  
  // Add a few universal favorites regardless of time
  const universalFavorites = [
    { title: "Mr. Brightside", artist: "The Killers", reason: "Always works at any time" },
    { title: "Dancing Queen", artist: "ABBA", reason: "Timeless party classic" }
  ];
  
  return [...baseSuggestions, ...universalFavorites.slice(0, 2)];
}

// Get song suggestions - only from cache or request fresh ones
export async function getSongSuggestions(
  currentSong: QueueItem | null,
  recentSongs: QueueItem[],
  fullQueue: QueueItem[]
): Promise<SuggestedSong[]> {
  const context = getCacheKey(currentSong, recentSongs, fullQueue);
  
  // Try cache first
  const cachedResult = getCachedSuggestions(context);
  if (cachedResult) {
    return cachedResult.suggestions;
  }
  
  // No cache available - return empty array to indicate we need fresh suggestions
  return [];
}

// Clear cache when song context changes significantly
export function clearSuggestionsCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}

// Filter out recently played songs from suggestions
function filterRecentlyPlayed(
  suggestions: SuggestedSong[],
  currentSong: QueueItem | null,
  fullQueue: QueueItem[]
): SuggestedSong[] {
  const recentTitles = new Set(fullQueue.map(s => s.title.toLowerCase()));
  if (currentSong) {
    recentTitles.add(currentSong.title.toLowerCase());
  }

  return suggestions.filter(suggestion => {
    const suggestionTitle = suggestion.title.toLowerCase();
    if (recentTitles.has(suggestionTitle)) {
      console.log(`Filtered duplicate song (from queue or recent history): ${suggestion.title}`);
      return false;
    }
    return true;
  });
}

// Analyze user behavior patterns for AI suggestions
async function analyzeUserBehavior(partyId: string, userProfiles: {[fingerprint: string]: string}) {
  try {
    // Get all queue items with votes for this party
    const { data: queueData, error: queueError } = await supabase
      .from('queue_items')
      .select('*')
      .eq('party_id', partyId);

    if (queueError) {
      console.error('Error fetching queue data for behavior analysis:', queueError);
      return null;
    }

    // Get all votes for this party
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('*')
      .in('queue_id', queueData?.map(item => item.id) || []);

    if (votesError) {
      console.error('Error fetching votes data for behavior analysis:', votesError);
      return null;
    }

    // Analyze top contributors
    const contributorStats: {[fingerprint: string]: {count: number, songs: string[]}} = {};
    queueData?.forEach(song => {
      if (!contributorStats[song.submitted_by]) {
        contributorStats[song.submitted_by] = {count: 0, songs: []};
      }
      contributorStats[song.submitted_by].count++;
      contributorStats[song.submitted_by].songs.push(song.title);
    });

    const topContributors = Object.entries(contributorStats)
      .map(([fingerprint, stats]) => ({
        name: userProfiles[fingerprint] || 'Anonymous',
        songCount: stats.count,
        songs: stats.songs
      }))
      .sort((a, b) => b.songCount - a.songCount)
      .slice(0, 5);

    // Analyze highest voted songs
    const highestVotedSongs = queueData
      ?.map(song => ({
        title: song.title,
        votes: song.votes,
        submitter: userProfiles[song.submitted_by] || 'Anonymous'
      }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 10) || [];

    // Simple genre analysis based on song patterns
    const genrePatterns = {
      'Pop/Mainstream': ['pop', 'taylor swift', 'dua lipa', 'harry styles', 'olivia rodrigo', 'the weeknd'],
      'Hip-Hop/Rap': ['hip hop', 'rap', 'drake', 'kendrick', 'travis scott', 'lil nas x'],
      'Rock/Alternative': ['rock', 'alternative', 'indie', 'killers', 'arctic monkeys', 'foo fighters'],
      'Electronic/Dance': ['electronic', 'edm', 'house', 'techno', 'calvin harris', 'marshmello'],
      'R&B/Soul': ['r&b', 'soul', 'sza', 'frank ocean', 'daniel caesar', 'the weeknd']
    };

    const popularGenres = Object.entries(genrePatterns)
      .map(([genre, keywords]) => {
        const matchingSongs = queueData?.filter(song => 
          keywords.some(keyword => 
            song.title.toLowerCase().includes(keyword) ||
            (song.title + ' ' + (userProfiles[song.submitted_by] || '')).toLowerCase().includes(keyword)
          )
        ) || [];
        
        return {
          genre,
          count: matchingSongs.length,
          songs: matchingSongs.map(s => s.title)
        };
      })
      .filter(genre => genre.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      topContributors,
      popularGenres,
      highestVotedSongs,
      userVotingPatterns: [] // Could be expanded later
    };
  } catch (error) {
    console.error('Error analyzing user behavior:', error);
    return null;
  }
}

// Get AI suggestions in background (non-blocking)
export async function getAISuggestionsBackground(
  currentSong: QueueItem | null,
  recentSongs: QueueItem[],
  fullQueue: QueueItem[], // Pass full queue
  mood: string = '', // Add mood parameter
  onUpdate: (suggestions: SuggestedSong[]) => void,
  partyId?: string, // Add partyId for behavior analysis
  userProfiles?: {[fingerprint: string]: string} // Add user profiles
): Promise<void> {
  const context = getCacheKey(currentSong, recentSongs, fullQueue, mood);
  
  // Check cache first - only use if we have cached data
  const cachedResult = getCachedSuggestions(context);
  if (cachedResult) {
    onUpdate(cachedResult.suggestions);
    return;
  }
  
  
  try {
    // Set shorter timeout for faster fallback
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    // Prepare enhanced context with timing
    const now = new Date();
    const hour = now.getHours();
    const timePhase = getTimePhase(hour);
    
    // Analyze user behavior patterns if party data is available
    let behaviorData = null;
    if (partyId && userProfiles && Object.keys(userProfiles).length > 0) {
      behaviorData = await analyzeUserBehavior(partyId, userProfiles);
    }
    
    // Build context with timing information and mood/style preferences
    const contextData = {
      currentSong: currentSong?.title,
      recentSongs: recentSongs.map(song => ({
        title: song.title,
        playedAt: formatPlayTime(song.played_at || null)
      })),
      timeContext: {
        hour: hour,
        phase: timePhase,
        timestamp: now.toISOString()
      },
      fullQueue: fullQueue.map(s => s.title), // Pass full queue titles
      musicStyle: mood || '', // Add music style/mood preference
      stylePreference: mood ? `User wants music that is: ${mood}` : '',
      userBehaviorData: behaviorData
    };
    
    const { data, error } = await supabase.functions.invoke('get-song-suggestions', {
      body: contextData,
      // signal: controller.signal // Remove signal option as it may not be supported
    });
    
    clearTimeout(timeout);
    
    if (error) {
      throw error;
    }
    
    const rawSuggestions = data.suggestions || [];
    
    if (rawSuggestions.length > 0) {
      // Filter out already queued songs
      const filteredSuggestions = filterRecentlyPlayed(rawSuggestions, currentSong, fullQueue);
      
      if (filteredSuggestions.length > 0) {
        setCachedSuggestions(filteredSuggestions, context);
        onUpdate(filteredSuggestions);
      }
    }
    
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.warn('AI suggestions failed:', error);
    }
    throw error;
  }
}