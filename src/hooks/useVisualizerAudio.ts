import { useRef, useState, useEffect, useCallback } from 'react';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';

export interface AudioAnalysis {
  sub: number;
  bass: number;
  mid: number;
  high: number;
  energy: number;
  gradient: number;
  tension: number;
  confidence: number;
  isBeat: boolean;
  isSnare: boolean;
  isBuilding: boolean;
  isBreakdown: boolean;
  bpm: number;
  spectralFlatness: number;
}

interface UseVisualizerAudioProps {
  isPlaying: boolean;
  sensitivity: number;
  videoId?: string;
  songTitle?: string;
  activeMap?: any;
  currentTime?: number;
  onBPMChange?: (bpm: number) => void;
  onBeatTrigger?: () => void;
  onAICue?: () => void;
}

export function useVisualizerAudio({
  isPlaying,
  sensitivity,
  videoId,
  activeMap,
  currentTime,
  onBPMChange,
  onBeatTrigger,
  onAICue
}: UseVisualizerAudioProps) {
  const essentiaRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeBufferRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [analysis, setAnalysis] = useState<AudioAnalysis>({
    sub: 0, bass: 0, mid: 0, high: 0, energy: 0, gradient: 0, tension: 0, confidence: 0,
    isBeat: false, isSnare: false, isBuilding: false, isBreakdown: false, bpm: 128, spectralFlatness: 0
  });

  const confidenceRef = useRef(0);
  const tensionRef = useRef(0);
  const energyHistory = useRef<number[]>([]);
  const beatHistory = useRef<number[]>([]);
  const lastBeatTime = useRef(0);
  const beatInterval = useRef(468);
  const bpmEstimate = useRef(128);
  const framesSinceBeat = useRef(0);
  const subBassAvg = useRef(0);
  const lastLogTime = useRef(0);

  // Initialize Essentia
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        console.log('[Essentia] ⚙️ Initializing WASM Module...');
        const wasmModule = typeof EssentiaWASM === 'function' ? await (EssentiaWASM as any)() : (EssentiaWASM as any).default ? await (EssentiaWASM as any).default() : EssentiaWASM;
        if (!isMounted) return;
        essentiaRef.current = new (Essentia as any)(wasmModule);
        console.log('%c[Essentia] 🧠 NEURAL ENGINE READY', 'color: #00ff00; font-weight: bold;');
      } catch (e) { 
        console.error('[Essentia] ❌ Setup failed:', e); 
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // Reset on song change
  useEffect(() => {
    if (videoId) {
      console.log(`[BPM] 🎵 Song changed: ${videoId}. Resetting confidence.`);
      beatInterval.current = 468;
      lastBeatTime.current = 0;
      confidenceRef.current = 0;
      beatHistory.current = [];
      energyHistory.current = [];
      tensionRef.current = 0;
    }
  }, [videoId]);

  const updateAnalysis = useCallback((now: number) => {
    if (!isPlaying || !analyserRef.current || !dataArrayRef.current) return analysis;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const d = dataArrayRef.current;
    const binCount = analyserRef.current.frequencyBinCount;

    // Time domain for Essentia
    if (!timeBufferRef.current) timeBufferRef.current = new Uint8Array(analyserRef.current.fftSize);
    analyserRef.current.getByteTimeDomainData(timeBufferRef.current);
    
    // AI Predicted Cue reaction
    if (activeMap?.cues && currentTime) {
        const cue = activeMap.cues.find((c: any) => Math.abs(c.time - currentTime) < 0.1);
        if (cue?.type === 'DROP') onAICue?.();
    }

    let sub = 0, bass = 0, mid = 0, high = 0;
    let sSum=0, bSum=0, mSum=0, hSum=0;
    let energySum=0, weightedSum=0, geoMeanSum=0, ariMeanSum=0;

    for(let i=0; i<binCount; i++) {
      const val = d[i];
      energySum += val;
      weightedSum += i * val;
      if (val > 0) { geoMeanSum += Math.log(val); ariMeanSum += val; }
      if (i < 3) sSum += val;
      else if (i < 8) bSum += val;
      else if (i < 64) mSum += val;
      else hSum += val;
    }

    sub = (sSum / 3 / 255) * sensitivity;
    bass = (bSum / 5 / 255) * sensitivity;
    mid = (mSum / 40 / 255) * sensitivity;
    high = (hSum / 192 / 255) * sensitivity;

    const flatness = ariMeanSum > 0 ? Math.exp(geoMeanSum / binCount) / (ariMeanSum / binCount) : 0;
    const currentEnergy = (sub * 0.4) + (bass * 0.3) + (mid * 0.2) + (high * 0.1);
    
    energyHistory.current.push(currentEnergy);
    if (energyHistory.current.length > 30) energyHistory.current.shift();
    const avgEnergy = energyHistory.current.length > 0 ? energyHistory.current.reduce((a,b)=>a+b,0) / energyHistory.current.length : 0.5;
    const gradient = currentEnergy - avgEnergy;
    tensionRef.current = (tensionRef.current * 0.98) + (Math.max(0, gradient) * 2.0);

    // BUILDING & BREAKDOWN DETECTION
    const isBuilding = tensionRef.current > 2.0 && gradient > 0.01;
    const isBreakdown = gradient < -0.05 && currentEnergy < 0.3;

    // Essentia Bridge
    if (essentiaRef.current) {
      const floatBuffer = new Float32Array(timeBufferRef.current.length);
      for(let i=0; i<timeBufferRef.current.length; i++) floatBuffer[i] = (timeBufferRef.current[i] - 128) / 128.0;
      const vector = essentiaRef.current.arrayToVector(floatBuffer);
      const rms = essentiaRef.current.RMS(vector).rms;
      
      // Dynamic Confidence
      if (rms > 0.005) confidenceRef.current = Math.min(confidenceRef.current + 0.01, 1.0);
      else confidenceRef.current = Math.max(confidenceRef.current - 0.005, 0);
      
      if (now - lastLogTime.current > 2000) {
        console.log(`[Neural] RMS: ${rms.toFixed(4)} | Conf: ${Math.round(confidenceRef.current * 100)}% | Engine: ${essentiaRef.current ? 'WASM' : 'OFF'}`);
        lastLogTime.current = now;
      }
      vector.delete();
    } else if (d[0] > 50) {
      confidenceRef.current = Math.min(confidenceRef.current + 0.005, 0.4);
    }

    // Beat Detection
    subBassAvg.current = subBassAvg.current * 0.9 + sub * 0.1;
    const isAudioBeat = sub > subBassAvg.current * 1.4 && sub > 0.4 && framesSinceBeat.current > 15;
    const timeSinceLast = now - lastBeatTime.current;
    const phaseError = Math.abs(timeSinceLast - beatInterval.current);
    
    // Phase Lock Logic
    if (isAudioBeat) {
        if (phaseError < 60) { // Slightly more forgiving threshold
            confidenceRef.current = Math.min(confidenceRef.current + 0.05, 1.0);
            if (now - lastLogTime.current > 500) console.log(`[Phase] Match! Error: ${Math.round(phaseError)}ms`);
        } else {
            confidenceRef.current = Math.max(confidenceRef.current - 0.02, 0);
        }
    }

    const isPhaseBeat = confidenceRef.current > 0.8 && timeSinceLast >= beatInterval.current;
    
    let isBeat = false;
    if (isAudioBeat || isPhaseBeat) {
      isBeat = true;
      framesSinceBeat.current = 0;
      const interval = isPhaseBeat ? beatInterval.current : (now - lastBeatTime.current);
      if (interval > 300 && interval < 1000) {
        lastBeatTime.current = now;
        const lastInt = beatHistory.current[beatHistory.current.length-1] || 0;
        beatHistory.current.push(interval);
        if (beatHistory.current.length > 4) beatHistory.current.shift();
        if (Math.abs(interval - lastInt) < 50 || beatHistory.current.length < 2) {
          beatInterval.current = beatInterval.current * 0.9 + interval * 0.1;
          const currentBPM = Math.round(60000 / beatInterval.current);
          if (Math.abs(currentBPM - bpmEstimate.current) > 1) {
            bpmEstimate.current = currentBPM;
            onBPMChange?.(currentBPM);
          }
        }
      }
      onBeatTrigger?.();
    } else {
      framesSinceBeat.current++;
    }

    const result = {
      sub, bass, mid, high, 
      energy: currentEnergy, 
      gradient, 
      tension: tensionRef.current, 
      confidence: confidenceRef.current,
      isBeat, 
      isSnare: (mid > 0.6 && sub < 0.3),
      isBuilding,
      isBreakdown,
      bpm: bpmEstimate.current,
      spectralFlatness: flatness
    };

    // Update state occasionally for UI (every 10th frame approx)
    if (now % 10 === 0) setAnalysis(result);

    return result;
  }, [isPlaying, sensitivity, onBPMChange, onBeatTrigger, activeMap, currentTime, onAICue]);

  return { analysis, updateAnalysis, audioContextRef, analyserRef, dataArrayRef };
}
