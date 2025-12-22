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
}

export function useSongMapper(videoId: string | undefined) {
  const [activeMap, setActiveMap] = useState<SongMap | null>(null);
  const recordedCues = useRef<SongCue[]>([]);
  const lastSaveTime = useRef(0);

  // 1. Load existing map on song start
  useEffect(() => {
    if (!videoId) {
      setActiveMap(null);
      recordedCues.current = [];
      return;
    }

    const loadMap = async () => {
      const { data, error } = await supabase
        .from('song_maps')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (!error && data) {
        setActiveMap(data as SongMap);
      } else {
        setActiveMap(null);
      }
    };

    loadMap();
  }, [videoId]);

  // 2. Record a cue live
  const recordCue = useCallback((time: number, type: SongCue['type']) => {
    // Only record if we don't have a solid map or are refining
    if (recordedCues.current.some(c => Math.abs(c.time - time) < 2)) return; // Prevent double recording
    
    recordedCues.current.push({ time, type });
    console.log(`[Mapper] Recorded ${type} at ${time.toFixed(1)}s`);
  }, []);

  // 3. Save the map to Supabase
  const saveMap = useCallback(async (bpm: number) => {
    if (!videoId || recordedCues.current.length === 0) return;

    // Debounce saves
    const now = Date.now();
    if (now - lastSaveTime.current < 10000) return;
    lastSaveTime.current = now;

    try {
      const { error } = await supabase
        .from('song_maps')
        .upsert({
          video_id: videoId,
          bpm: bpm,
          cues: recordedCues.current,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        console.log(`[Mapper] Successfully saved map for ${videoId}`);
      }
    } catch (err) {
      console.error("[Mapper] Failed to save map", err);
    }
  }, [videoId]);

  return {
    activeMap,
    recordCue,
    saveMap,
    isRecording: !activeMap
  };
}
