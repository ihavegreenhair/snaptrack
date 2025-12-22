import { useState, useEffect, useRef } from 'react';
import { supabase, type QueueItem } from '../lib/supabase';

interface UseQueueProps {
  partyId: string | null;
  fingerprint: string | null;
}

export function useQueue({ partyId, fingerprint }: UseQueueProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [nowPlaying, setNowPlaying] = useState<QueueItem | null>(null);
  const nowPlayingRef = useRef<QueueItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [userVotes, setUserVotes] = useState<{[key: string]: number}>({});

  const loadQueue = async () => {
    if (!partyId) return;
    
    // Don't set loading to true on background refreshes to avoid UI flicker
    if (queue.length === 0) setLoading(true);

    try {
      const { data, error } = await supabase
        .from('queue_items')
        .select('*')
        .eq('party_id', partyId)
        .order('votes', { ascending: false })
        .order('submitted_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const unplayed = data.filter(item => !item.played);
        const played = data.filter(item => item.played);
        
        // Sort unplayed: Pinned first, then Votes desc, then time asc
        const allSortedUnplayed = unplayed.sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) {
            return a.is_pinned ? -1 : 1;
          }
          if (a.votes !== b.votes) {
            return b.votes - a.votes;
          }
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        });
        
        // Determine Now Playing
        let nextNowPlaying: QueueItem | null = null;
        
        // Keep current song if it's still unplayed and in the list
        if (nowPlayingRef.current && unplayed.some(item => item.id === nowPlayingRef.current!.id)) {
           nextNowPlaying = unplayed.find(item => item.id === nowPlayingRef.current!.id) || null;
        } 
        // Otherwise pick the top of the list
        else if (allSortedUnplayed.length > 0) {
           nextNowPlaying = allSortedUnplayed[0];
        }

        nowPlayingRef.current = nextNowPlaying;
        setNowPlaying(nextNowPlaying);

        // Queue is everything unplayed EXCEPT the current song
        const queueWithoutNowPlaying = nextNowPlaying 
          ? allSortedUnplayed.filter(item => item.id !== nextNowPlaying!.id)
          : allSortedUnplayed;
        
        setQueue(queueWithoutNowPlaying);
        
        // History sorted by played_at desc
        setHistory(played.sort((a, b) => new Date(b.played_at || 0).getTime() - new Date(a.played_at || 0).getTime()));
      }
    } catch (error) {
      console.error("Error loading queue:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserVotes = async () => {
    if (!partyId || !fingerprint) return;
    
    // Get IDs of all active items (queue + now playing)
    const activeIds = [...queue.map(i => i.id)];
    if (nowPlaying) activeIds.push(nowPlaying.id);
    
    if (activeIds.length === 0) return;

    const { data } = await supabase
      .from('votes')
      .select('queue_id, vote')
      .eq('fingerprint', fingerprint)
      .in('queue_id', activeIds);

    if (data) {
      const votesMap: {[key: string]: number} = {};
      data.forEach(v => votesMap[v.queue_id] = v.vote);
      setUserVotes(votesMap);
    }
  };

  // Initial load and Realtime subscription
  useEffect(() => {
    if (!partyId) return;

    loadQueue();

    const channel = supabase
      .channel(`party-queue-${partyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_items', filter: `party_id=eq.${partyId}` },
        () => loadQueue()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `party_id=eq.${partyId}` },
        () => {
          // Debounce slightly to allow triggers to update counts
          setTimeout(loadQueue, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partyId]);

  // Load votes when queue or fingerprint changes
  useEffect(() => {
    loadUserVotes();
  }, [queue.length, nowPlaying?.id, fingerprint]);

  const handleVote = async (queueId: string, voteValue: number) => {
    if (!fingerprint || !partyId) return;

    // Optimistic Update
    const currentVote = userVotes[queueId] || 0;
    const newVote = currentVote === voteValue ? 0 : voteValue; // Toggle off if same
    
    // Update local state immediately
    setUserVotes(prev => {
        const next = { ...prev };
        if (newVote === 0) delete next[queueId];
        else next[queueId] = newVote;
        return next;
    });

    try {
      if (newVote === 0) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('queue_id', queueId)
          .eq('fingerprint', fingerprint);
      } else {
        // Upsert vote
        await supabase
          .from('votes')
          .upsert({ 
            queue_id: queueId, 
            fingerprint, 
            vote: newVote,
            party_id: partyId 
          }, { onConflict: 'queue_id,fingerprint' });
      }
    } catch (error) {
      console.error('Vote failed, reverting:', error);
      // Revert on error
      setUserVotes(prev => ({...prev, [queueId]: currentVote}));
      loadQueue(); // Reload true state
    }
  };

  const markAsPlayed = async (songId: string) => {
     if (!partyId) return;
     await supabase
      .from('queue_items')
      .update({ played: true, played_at: new Date().toISOString() })
      .eq('id', songId)
      .eq('party_id', partyId);
      
     // Optimistically update local state for speed
     if (nowPlaying?.id === songId) {
         setNowPlaying(null);
         nowPlayingRef.current = null;
         // Trigger reload to fetch next song
         loadQueue();
     }
  };

  const removeSong = async (songId: string) => {
    if (!partyId) return;
    try {
        await supabase.from('queue_items').delete().eq('id', songId);
        // Optimistic update
        setQueue(prev => prev.filter(item => item.id !== songId));
    } catch (error) {
        console.error('Error removing song:', error);
        loadQueue();
    }
  };

  const pinSong = async (songId: string, isPinned: boolean) => {
    if (!partyId) return;
    try {
      await supabase
        .from('queue_items')
        .update({ is_pinned: isPinned })
        .eq('id', songId)
        .eq('party_id', partyId);
    } catch (error) {
      console.error('Error pinning song:', error);
    }
  };

  const blacklistSong = async (song: QueueItem) => {
    if (!partyId) return;
    try {
      // 1. Add to blacklist
      await supabase.from('blacklisted_songs').insert({
        video_id: song.video_id,
        title: song.title,
        party_id: partyId
      });

      // 2. Remove from queue
      await removeSong(song.id);
    } catch (error) {
      console.error('Error blacklisting song:', error);
    }
  };

  return {
    queue,
    history,
    nowPlaying,
    loading,
    userVotes,
    handleVote,
    markAsPlayed,
    removeSong,
    pinSong,
    blacklistSong,
    refreshQueue: loadQueue
  };
}
