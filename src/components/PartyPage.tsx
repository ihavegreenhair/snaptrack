import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, type QueueItem } from '../lib/supabase';
import { clearSuggestionsCache, getSongSuggestions, getAISuggestionsBackground, type SuggestedSong } from '../lib/gemini';
import NowPlaying from './NowPlaying';
import QueueList from './QueueList';
import AddSongModal from './AddSongModal';
import PhotoGallery from './PhotoGallery';
import HostAuthModal from './HostAuthModal';
import { Music } from 'lucide-react';
import { useParty } from '../lib/PartyContext';

function PartyPage() {
  const { partyCode } = useParams<{ partyCode: string }>();
  const { isHost, setIsHost } = useParty();
  const [partyId, setPartyId] = useState<string | null>(null);
  const [nowPlayingSong, setNowPlayingSong] = useState<QueueItem | null>(null);
  const nowPlayingRef = useRef<QueueItem | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedSong[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsType, setSuggestionsType] = useState<'instant' | 'personalized'>('instant');
  const [showHostModal, setShowHostModal] = useState(false);

  useEffect(() => {
    const fetchPartyId = async () => {
      const { data, error } = await supabase
        .from('parties')
        .select('id')
        .eq('party_code', partyCode)
        .single();

      if (error || !data) {
        console.error('Error fetching party ID:', error);
        // Handle error, e.g., redirect to home page
        return;
      }
      setPartyId(data.id);
    };

    fetchPartyId();

    clearSuggestionsCache();
    loadQueue();
    loadSuggestions();

    const channel = supabase
      .channel(`party-${partyCode}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `party_id=eq.${partyId}` },
        (payload) => {
          console.log('Queue item changed:', payload);
          loadQueue(); // Reload and re-sort the entire queue
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          console.log('Vote changed:', payload);
          // The vote trigger should update queue_items, which will trigger the above listener
          // But let's add a small delay to ensure the trigger has processed
          setTimeout(() => loadQueue(), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyCode, partyId]);

  // Clean separation: nowPlayingSong managed separately from queue

  const loadQueue = async () => {
    if (!partyId) return;
    const { data, error } = await supabase
      .from('queue_items')
      .select('*')
      .eq('party_id', partyId)
      .order('votes', { ascending: false })
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error("Error loading queue:", error);
      return;
    }

    if (data) {
      const unplayed = data.filter(item => !item.played);
      const played = data.filter(item => item.played);
      
      // SIMPLE APPROACH: Sort all songs, set nowPlaying if needed, remove it from queue
      const allSortedUnplayed = unplayed.sort((a, b) => {
        if (a.votes !== b.votes) {
          return b.votes - a.votes;
        }
        return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      });
      
      // Use ref to prevent nowPlayingSong from changing due to vote updates
      console.log('🎵 QUEUE LOAD - nowPlayingRef.current:', nowPlayingRef.current?.title);
      
      // ONLY change nowPlayingSong in these exact cases:
      if (!nowPlayingRef.current && allSortedUnplayed.length > 0) {
        // CASE 1: No song is playing, start the first one
        const firstSong = allSortedUnplayed[0];
        console.log('🎵 STARTING FIRST SONG:', firstSong.title);
        nowPlayingRef.current = firstSong;
        setNowPlayingSong(firstSong);
      } else if (nowPlayingRef.current && !unplayed.some(item => item.id === nowPlayingRef.current.id)) {
        // CASE 2: Current song was marked as played, move to next
        const nextSong = allSortedUnplayed[0] || null;
        console.log('🎵 SONG ENDED, MOVING TO NEXT:', nextSong?.title || 'none');
        nowPlayingRef.current = nextSong;
        setNowPlayingSong(nextSong);
      } else {
        // CASE 3: Keep current song playing regardless of vote changes
        console.log('🔒 KEEPING NOW PLAYING:', nowPlayingRef.current?.title || 'none');
      }
      
      // Remove nowPlayingSong from queue - queue contains only upcoming songs
      const queueWithoutNowPlaying = nowPlayingRef.current 
        ? allSortedUnplayed.filter(item => item.id !== nowPlayingRef.current!.id)
        : allSortedUnplayed;
      
      console.log('=== CLEAN QUEUE SYSTEM ===');
      console.log('Now playing:', nowPlayingSong?.title || 'none');
      console.log('Queue (upcoming only):', queueWithoutNowPlaying.length, 'songs');
      
      setQueue(queueWithoutNowPlaying);
      setHistory(played.sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime()));
    }
  };

  const loadSuggestions = async () => {
    if (!partyId) return;
    setSuggestionsLoading(true);
    try {
      const { data: fullQueueData } = await supabase
        .from('queue_items')
        .select('*')
        .eq('party_id', partyId)
        .order('votes', { ascending: false })
        .order('submitted_at', { ascending: true });

      const fullQueue = fullQueueData || [];
      const unplayedQueue = fullQueue.filter(item => !item.played);
      const playedHistory = fullQueue.filter(item => item.played);

      const currentSongForSuggestions = nowPlayingSong;
      const recentSongs = playedHistory
        .sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime())
        .slice(0, 10);

      const cachedSuggestions = await getSongSuggestions(currentSongForSuggestions, recentSongs, unplayedQueue);
      
      if (cachedSuggestions.length > 0) {
        setSuggestions(cachedSuggestions);
        setSuggestionsType('personalized');
      } else {
        await getAISuggestionsBackground(currentSongForSuggestions, recentSongs, unplayedQueue, (personalizedSuggestions) => {
          setSuggestions(personalizedSuggestions);
          setSuggestionsType('personalized');
        });
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSongEnd = async () => {
    if (!partyId || !nowPlayingRef.current) return;
    
    console.log('🎵 MANUALLY ENDING SONG:', nowPlayingRef.current.title);
    
    // Mark current song as played
    await supabase
      .from('queue_items')
      .update({ played: true, played_at: new Date().toISOString() })
      .eq('id', nowPlayingRef.current.id)
      .eq('party_id', partyId);
    
    // Clear the ref so loadQueue will pick up the next song
    nowPlayingRef.current = null;
    setNowPlayingSong(null);
    
    // loadQueue will be called by the real-time subscription and will set the next song
  };

  const skipSong = () => {
    handleSongEnd();
  };

  const clearQueue = async () => {
    if (!partyId) return;
    if (confirm('Are you sure you want to clear the entire queue?')) {
      await supabase
        .from('queue_items')
        .update({ played: true })
        .eq('played', false)
        .eq('party_id', partyId);
      
      // Clear both ref and state
      nowPlayingRef.current = null;
      setNowPlayingSong(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between p-4 gap-4 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary">
              <Music className="h-4 w-4 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SnapTrack</h1>
            <span className="text-muted-foreground text-sm sm:text-base">Party: {partyCode}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            {!isHost && (
              <button 
                onClick={() => setShowHostModal(true)}
                className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
              >
                Become Host
              </button>
            )}
            <AddSongModal
              onSongAdded={loadQueue}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              suggestionsType={suggestionsType}
              onRefreshSuggestions={loadSuggestions}
              partyId={partyId!}
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <NowPlaying
              song={nowPlayingSong}
              onEnded={handleSongEnd}
              onSkip={skipSong}
              onClearQueue={clearQueue}
              onSongStartedPlaying={(songId) => console.log('Song started playing:', songId)}
              isHost={isHost}
            />
          </div>
          <div>
            <QueueList title="Up Next" queue={queue} currentSongId={null} isHost={isHost} />
          </div>
        </div>
        
        <div className="mt-4 sm:mt-6">
          <PhotoGallery title="Previously Played" queue={history} />
        </div>
      </main>

      {showHostModal && (
        <HostAuthModal
          partyCode={partyCode!}
          onClose={() => setShowHostModal(false)}
          onSuccess={() => {
            setIsHost(true);
            setShowHostModal(false);
          }}
        />
      )}
    </div>
  );
}

export default PartyPage;