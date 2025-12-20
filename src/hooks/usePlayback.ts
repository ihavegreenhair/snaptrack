import { useState, useEffect, useCallback } from 'react';
import { supabase, type QueueItem } from '../lib/supabase';
import { searchYouTubeVideos, getSongLengthError } from '../lib/youtube';
import { type SuggestedSong } from '../lib/gemini';

interface UsePlaybackProps {
  partyId: string | null;
  isHost: boolean;
  nowPlaying: QueueItem | null;
  queue: QueueItem[];
  history: QueueItem[];
  suggestions: SuggestedSong[];
  userFingerprint: string | null;
  markAsPlayed: (id: string) => Promise<void>;
}

export function usePlayback({ 
  partyId, 
  isHost, 
  nowPlaying, 
  queue, 
  history, 
  suggestions, 
  userFingerprint,
  markAsPlayed 
}: UsePlaybackProps) {
  
  const [autoAddInProgress, setAutoAddInProgress] = useState(false);
  const [skipVoteCount, setSkipVoteCount] = useState(0);
  const [hasSkipVoted, setHasSkipVoted] = useState(false);
  const [skipVoting, setSkipVoting] = useState(false);

  // Auto-add suggestion when queue is empty (host only)
  useEffect(() => {
    if (!isHost || !partyId || queue.length > 0 || suggestions.length === 0 || history.length === 0 || autoAddInProgress) {
      return;
    }

    const timer = setTimeout(() => {
      autoAddSuggestion();
    }, 2000); 
    
    return () => clearTimeout(timer);
  }, [isHost, queue.length, suggestions.length, history.length, autoAddInProgress, partyId]);

  // Skip Votes Logic
  useEffect(() => {
    if (!nowPlaying || !userFingerprint) {
      setHasSkipVoted(false);
      setSkipVoteCount(0);
      return;
    }

    const loadSkipVotes = async () => {
      const { count } = await supabase
        .from('skip_votes')
        .select('*', { count: 'exact', head: true })
        .eq('queue_id', nowPlaying.id);

      setSkipVoteCount(count || 0);

      const { data } = await supabase
        .from('skip_votes')
        .select('id')
        .eq('queue_id', nowPlaying.id)
        .eq('fingerprint', userFingerprint)
        .single();

      setHasSkipVoted(!!data);
    };

    loadSkipVotes();

    const channel = supabase
      .channel(`skip-votes-${nowPlaying.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'skip_votes', filter: `queue_id=eq.${nowPlaying.id}` },
        () => loadSkipVotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [nowPlaying?.id, userFingerprint]);


  const autoAddSuggestion = async () => {
    if (!isHost || !partyId || autoAddInProgress) return;
    
    setAutoAddInProgress(true);
    try {
      const firstSuggestion = suggestions[0];
      const query = `${firstSuggestion.title} ${firstSuggestion.artist}`;
      
      const searchResults = await searchYouTubeVideos(query);
      if (searchResults.length === 0) return;
      
      const validResults = searchResults.filter(result => !getSongLengthError(result.duration));
      if (validResults.length === 0) return;
      
      const selectedResult = validResults[0];
      
      await supabase.from('queue_items').insert({
        party_id: partyId,
        video_id: selectedResult.id,
        title: selectedResult.title,
        thumbnail_url: selectedResult.thumbnail,
        submitted_by: userFingerprint || 'system',
        photo_url: selectedResult.thumbnail,
        played: false,
      });
      
    } catch (error) {
      console.error('Auto-add error:', error);
    } finally {
      setAutoAddInProgress(false);
    }
  };

  const handleSkipVote = async () => {
    if (!nowPlaying || !userFingerprint || skipVoting) return;

    setSkipVoting(true);
    try {
      if (hasSkipVoted) {
        await supabase
          .from('skip_votes')
          .delete()
          .eq('queue_id', nowPlaying.id)
          .eq('fingerprint', userFingerprint);
          setHasSkipVoted(false);
      } else {
        await supabase
          .from('skip_votes')
          .insert({ queue_id: nowPlaying.id, fingerprint: userFingerprint, party_id: partyId });
          setHasSkipVoted(true);
      }
    } catch (error) {
      console.error('Error handling skip vote:', error);
    } finally {
      setSkipVoting(false);
    }
  };

  const clearQueue = async () => {
    if (!partyId) return;
    if (confirm('Are you sure you want to clear the entire queue?')) {
      await supabase
        .from('queue_items')
        .update({ played: true })
        .eq('played', false)
        .eq('party_id', partyId);
    }
  };

  return {
    autoAddInProgress,
    skipVoteCount,
    hasSkipVoted,
    skipVoting,
    handleSkipVote,
    clearQueue
  };
}
