import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SongCue {
  time: number;
  type: 'DROP' | 'BUILD' | 'BREAKDOWN';
}

export interface SongMap {
  video_id: string;
  bpm: number;
  cues: SongCue[];
  energy_profile: number[];
  is_ai_guess?: boolean;
}

export function useSongMapper(videoId: string | undefined, songTitle?: string) {
  const [activeMap, setActiveMap] = useState<SongMap | null>(null);
  const recordedCues = useRef<SongCue[]>([]);
  const lastSaveTime = useRef(0);

  // 1. Load existing map or Predict via AI
  useEffect(() => {
    if (!videoId) {
      setActiveMap(null);
      recordedCues.current = [];
      return;
    }

    const loadMap = async () => {
      // Try DB first
      const { data, error } = await supabase
        .from('song_maps')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (!error && data) {
        setActiveMap(data as SongMap);
      } else if (songTitle) {
        // Option 3: AI Metadata Bridge
        // If we don't have a map, we "predict" one based on common song structures
        // In a real app, this would be a call to a music metadata API
        console.log(`[Mapper] No map for ${songTitle}, generating AI estimate...`);
        
        // Basic AI Guessing logic (Mocking the AI bridge)
        const isHighEnergy = songTitle.toLowerCase().includes('remix') || 
                             songTitle.toLowerCase().includes('edit') ||
                             songTitle.toLowerCase().includes('dubstep');
                             
        const estimatedBPM = isHighEnergy ? 128 : 120;
        const estimatedCues: SongCue[] = [
          { time: 30, type: 'BUILD' },
          { time: 45, type: 'DROP' },
          { time: 90, type: 'BREAKDOWN' },
          { time: 105, type: 'DROP' }
        ];

        setActiveMap({
          video_id: videoId,
          bpm: estimatedBPM,
          cues: estimatedCues,
          energy_profile: [],
          is_ai_guess: true
        });
      }
    };

    loadMap();
  }, [videoId, songTitle]);

  // 2. Record a cue live
  const recordCue = useCallback((time: number, type: SongCue['type']) => {
    // If it was an AI guess, we start overwriting with real data
    if (activeMap?.is_ai_guess) {
        recordedCues.current = []; // Clear the guess
        setActiveMap(prev => prev ? { ...prev, is_ai_guess: false, cues: [] } : null);
    }

    if (recordedCues.current.some(c => Math.abs(c.time - time) < 2)) return; // Prevent double recording
    
    recordedCues.current.push({ time, type });
    console.log(`[Mapper] Recorded ${type} at ${time.toFixed(1)}s`);
  }, [activeMap]);

  // 3. Save the map to Supabase
  const saveMap = useCallback(async (bpm: number) => {
    if (!videoId || (recordedCues.current.length === 0 && !activeMap?.is_ai_guess)) return;

    // Debounce saves
    const now = Date.now();
    if (now - lastSaveTime.current < 10000) return;
    lastSaveTime.current = now;

    try {
      const cuesToSave = recordedCues.current.length > 0 ? recordedCues.current : (activeMap?.cues || []);
      
      const { error } = await supabase
        .from('song_maps')
        .upsert({
          video_id: videoId,
          bpm: bpm,
          cues: cuesToSave,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        console.log(`[Mapper] Successfully saved map for ${videoId}`);
      }
    } catch (err) {
      console.error("[Mapper] Failed to save map", err);
    }
  }, [videoId, activeMap]);

  return {
    activeMap,
    recordCue,
    saveMap,
    isRecording: !activeMap || activeMap.is_ai_guess
  };
}
