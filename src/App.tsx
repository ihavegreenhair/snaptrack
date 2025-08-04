import { useState, useEffect } from 'react';
import { supabase, type QueueItem } from './lib/supabase';
import { clearSuggestionsCache, getSongSuggestions, getAISuggestionsBackground, type SuggestedSong } from './lib/gemini';
import NowPlaying from './components/NowPlaying';
import QueueList from './components/QueueList';
import AddSongModal from './components/AddSongModal';
import PhotoGallery from './components/PhotoGallery';
import { Music } from 'lucide-react';

function App() {
  const [currentSong, setCurrentSong] = useState<QueueItem | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedSong[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsType, setSuggestionsType] = useState<'instant' | 'personalized'>('instant');

  useEffect(() => {
    // Clear suggestions cache on page load to ensure fresh suggestions
    clearSuggestionsCache();
    console.log('Page loaded - suggestions cache cleared');
    
    // Initial load of the queue and history
    loadQueue();
    
    // Load fresh suggestions
    loadSuggestions();

    // Set up the real-time subscription
    const channel = supabase
      .channel('queue_updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'queue_items' },
        (payload) => {
          console.log('New song added:', payload.new);
          const newSong = payload.new as QueueItem;
          // Add to queue if it's not played and not already in queue
          if (!newSong.played) {
            setQueue(prevQueue => {
              // Check if song already exists in queue
              const existsInQueue = prevQueue.some(song => song.id === newSong.id);
              if (existsInQueue) {
                console.log('Song already in queue, skipping duplicate');
                return prevQueue;
              }
              return [...prevQueue, newSong];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'queue_items' },
        (payload) => {
          console.log('Song updated:', payload.new);
          const updatedSong = payload.new as QueueItem;

          // If the song was marked as played, remove it from the queue and add to history
          if (updatedSong.played) {
            setQueue(prevQueue => prevQueue.filter(song => song.id !== updatedSong.id));
            setHistory(prevHistory => [updatedSong, ...prevHistory].sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime()));
          } else {
            // Otherwise, update the song in the queue (e.g., for vote changes)
            setQueue(prevQueue =>
              prevQueue.map(song => song.id === updatedSong.id ? updatedSong : song)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'queue_items' },
        (payload) => {
          console.log('Song removed:', payload.old);
          // Remove from either queue or history
          setQueue(prevQueue => prevQueue.filter(song => song.id !== (payload.old as QueueItem).id));
          setHistory(prevHistory => prevHistory.filter(song => song.id !== (payload.old as QueueItem).id));
        }
      )
      .subscribe();

    // Cleanup function to remove the channel subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    console.log('Queue/currentSong effect:', {
      queueLength: queue.length,
      currentSongId: currentSong?.id,
    });

    // If there's no current song and the queue has items, set the first one.
    if (!currentSong && queue.length > 0) {
      console.log('No current song, setting first in queue:', queue[0].title);
      setCurrentSong(queue[0]);
      return;
    }

    // If there is a current song, check its status.
    if (currentSong) {
      const isCurrentSongInQueue = queue.some(item => item.id === currentSong.id);

      // If the current song is no longer in the (unplayed) queue,
      // it means it has been played or removed.
      if (!isCurrentSongInQueue) {
        console.log('Current song is no longer in the queue. Moving to the next one.');
        // The queue is already sorted by votes/time. The new "first" item is the next song.
        setCurrentSong(queue[0] || null);
      }
    }
    
    // If the queue is empty, ensure there's no current song.
    if (queue.length === 0) {
      setCurrentSong(null);
    }
  }, [queue, currentSong]);

  const loadQueue = async () => {
    console.log('Loading initial data...');
    const { data, error } = await supabase
      .from('queue_items')
      .select('*')
      .order('votes', { ascending: false })
      .order('submitted_at', { ascending: true });

    if (error) {
      console.error("Error loading queue:", error);
      return;
    }

    if (data) {
      const unplayed = data.filter(item => !item.played);
      const played = data.filter(item => item.played);
      
      console.log('Loaded queue data (unplayed):', unplayed.map(s => ({ id: s.id, title: s.title })));
      setQueue(unplayed);

      console.log('Loaded history data (played):', played.map(s => ({ id: s.id, title: s.title })));
      setHistory(played.sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime()));
    }
  };

  // Load suggestions based on current queue state
  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    console.log('🔄 SUGGESTIONS REFRESH: Loading fresh suggestions based on current queue state');
    
    try {
      // Get current queue state for suggestions
      const { data: fullQueueData } = await supabase
        .from('queue_items')
        .select('*')
        .order('votes', { ascending: false })
        .order('submitted_at', { ascending: true });

      const fullQueue = fullQueueData || [];
      const unplayedQueue = fullQueue.filter(item => !item.played);
      const playedHistory = fullQueue.filter(item => item.played);

      const currentSongForSuggestions = unplayedQueue[0] || null;
      const recentSongs = playedHistory
        .sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime())
        .slice(0, 10);

      // Check if we have cached suggestions first
      const cachedSuggestions = await getSongSuggestions(currentSongForSuggestions, recentSongs, unplayedQueue);
      
      if (cachedSuggestions.length > 0) {
        console.log('✅ Using cached suggestions:', cachedSuggestions.length);
        setSuggestions(cachedSuggestions);
        setSuggestionsType('personalized');
      } else {
        console.log('🎯 No cache found - requesting fresh AI suggestions');
        // No cache, request fresh personalized suggestions
        try {
          await getAISuggestionsBackground(currentSongForSuggestions, recentSongs, unplayedQueue, (personalizedSuggestions) => {
            console.log('🎵 Fresh AI suggestions received:', personalizedSuggestions.length);
            setSuggestions(personalizedSuggestions);
            setSuggestionsType('personalized');
          });
        } catch (error) {
          console.log('❌ Failed to get personalized suggestions:', error);
          setSuggestions([]);
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading suggestions:', error);
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
      console.log('🏁 Suggestions loading complete');
    }
  };

  const handleSongStartedPlaying = async (songId: string) => {
    console.log('handleSongStartedPlaying: Song started playing (not marking as played yet):', songId);
    // Don't mark as played immediately - only when song actually ends
    // This prevents the song from being immediately removed from queue
  };

  const handleSongEnd = async () => {
    if (currentSong) {
      console.log('handleSongEnd: Marking song as played in DB:', currentSong.title);
      const { error } = await supabase
        .from('queue_items')
        .update({ played: true, played_at: new Date().toISOString() })
        .eq('id', currentSong.id);

      if (error) {
        console.error('Error marking song as played:', error);
      }
    } else {
      console.log('handleSongEnd called but no currentSong');
    }
  };

  const skipSong = () => {
    // This can be improved later, for now, just advance the queue
    handleSongEnd();
  };

  const clearQueue = async () => {
    if (confirm('Are you sure you want to clear the entire queue? This cannot be undone.')) {
      try {
        // Mark all unplayed songs as played to effectively clear the queue
        await supabase
          .from('queue_items')
          .update({ played: true })
          .eq('played', false);
        
        // Stop current song and clear it
        setCurrentSong(null);
      } catch (error) {
        console.error('Error clearing queue:', error);
        alert('Failed to clear queue. Please try again.');
      }
    }
  };


  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Music className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">SnapTrack</h1>
          </div>
          <AddSongModal 
            onSongAdded={() => {
              // Reload queue (suggestions will be refreshed by SubmitSong immediately)
              loadQueue();
            }}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            suggestionsType={suggestionsType}
            onRefreshSuggestions={loadSuggestions}
          />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <NowPlaying
              song={currentSong}
              onEnded={handleSongEnd}
              onSkip={skipSong}
              onClearQueue={clearQueue}
              onSongStartedPlaying={handleSongStartedPlaying}
            />
          </div>
          <div>
            <QueueList title="Upcoming Queue" queue={queue} currentSongId={currentSong?.id} />
          </div>
        </div>
        
        <div className="mt-6">
          <PhotoGallery title="Previously Played" queue={history} />
        </div>
      </main>
    </div>
  );
}

export default App;