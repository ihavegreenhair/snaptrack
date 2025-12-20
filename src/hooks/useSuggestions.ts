import { useState, useEffect } from 'react';
import { type QueueItem } from '../lib/supabase';
import { getInstantSuggestions, getAISuggestionsBackground, clearSuggestionsCache, type SuggestedSong } from '../lib/gemini';

interface UseSuggestionsProps {
  partyId: string | null;
  nowPlaying: QueueItem | null;
  history: QueueItem[];
  queue: QueueItem[]; // Full queue needed for filtering
  partyMood: string;
  userProfiles: {[key: string]: string};
}

export function useSuggestions({
  partyId,
  nowPlaying,
  history,
  queue,
  partyMood,
  userProfiles
}: UseSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SuggestedSong[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'instant' | 'personalized'>('instant');

  // Load suggestions whenever context changes
  useEffect(() => {
    if (!partyId) return;

    const load = async () => {
      setLoading(true);

      // 1. Initial Instant Load (if empty)
      if (suggestions.length === 0) {
        setSuggestions(getInstantSuggestions());
        setType('instant');
      }

      // 2. Background Personalized Load
      try {
        await getAISuggestionsBackground(
          nowPlaying,
          history, // Pass history correctly
          [...(nowPlaying ? [nowPlaying] : []), ...queue, ...history], // Pass comprehensive list for context if needed, or just follow what original code did. 
          // Original code passed: fullQueue (which was just unplayed queue + played history)
          // Let's match original signature: current, recent, fullQueue, mood...
          partyMood,
          (personalized) => {
            setSuggestions(personalized);
            setType('personalized');
            setLoading(false);
          },
          partyId,
          userProfiles
        );
      } catch (err) {
        console.error("AI Suggestions failed, using instant", err);
        if (suggestions.length === 0) {
             setSuggestions(getInstantSuggestions());
             setType('instant');
        }
        setLoading(false);
      }
    };

    load();
  }, [partyId, nowPlaying?.id, history.length, partyMood]); // deeply dependent on ID changes not just object ref

  const refresh = async () => {
    clearSuggestionsCache();
    // Trigger effect by briefly resetting state or just recalling logic? 
    // Effect dependency array handles it if we just clear cache and maybe toggle something?
    // Easiest is to force a re-run or just manually call the logic.
    // Let's just manually call logic similar to effect.
    setLoading(true);
    try {
        await getAISuggestionsBackground(
          nowPlaying,
          history,
          [...(nowPlaying ? [nowPlaying] : []), ...queue, ...history],
          partyMood,
          (personalized) => {
            setSuggestions(personalized);
            setType('personalized');
            setLoading(false);
          },
          partyId!,
          userProfiles
        );
    } catch {
        setLoading(false);
    }
  };

  return {
    suggestions,
    loading,
    type,
    refresh
  };
}
