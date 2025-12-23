import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { useSongMapper } from '@/hooks/useSongMapper';

export type VisualizerMode = 
  | 'menger' | 'columns' | 'blob' | 'lattice' | 'city' | 'landmass' | 'gyroid' | 'tunnel' | 'lava' | 'matrix' | 'rooms' | 'bulb' 
  | 'shapes' | 'vortex' | 'neural' | 'rings' | 'core3d' | 'cloud' | 'trees' | 'platonic' | 'helix' | 'flower' | 'starfield'
  | 'crystal' | 'voxels' | 'fibonacci' | 'galaxy' | 'ribbons' | 'swarm' | 'rubik' | 'islands' | 'circuit' | 'rain' | 'pulse'
  | 'pong' | 'invaders' | 'pacman' | 'snake' | 'tetris'
  | 'vj' | 'none';

interface VJState {
  mode: VisualizerMode;
  pColor: THREE.Color;
  sColor: THREE.Color;
  primaryHue: number;
  secondaryHue: number;
  complexity: number;
  objectCount: number;
  rotationSpeed: number;
  motionIntensity: number;
  distortionScale: number;
  individualDamping: number;
  wireframe: boolean;
  shapeType: 'box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron';
  fov: number;
}

const PALETTES = [
  { p: '#ff00ff', s: '#00ffff', ph: 300, sh: 180 }, // Cyberpunk
  { p: '#39ff14', s: '#bcff00', ph: 110, sh: 80 },  // Toxic
  { p: '#ff4500', s: '#ff8c00', ph: 15, sh: 30 },   // Inferno
  { p: '#710193', s: '#00ffcc', ph: 280, sh: 160 }, // Galactic
  { p: '#ffffff', s: '#555555', ph: 0, sh: 0 },    // Mono
  { p: '#ff0055', s: '#ffcc00', ph: 340, sh: 45 }   // Sunset
];

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
  onBPMChange?: (bpm: number) => void;
  videoId?: string;
  currentTime?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5, onBPMChange, videoId, currentTime }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeMap, recordCue } = useSongMapper(videoId);
  
  // v8.1 Weighted Agent State
  const [vj, setVj] = useState<VJState>({
    mode: 'shapes',
    pColor: new THREE.Color(PALETTES[0].p),
    sColor: new THREE.Color(PALETTES[0].s),
    primaryHue: PALETTES[0].ph,
    secondaryHue: PALETTES[0].sh,
    complexity: 1,
    objectCount: 60,
    rotationSpeed: 1.0, 
    motionIntensity: 1.0,
    distortionScale: 1.0,
    individualDamping: 0.1,
    wireframe: true,
    shapeType: 'box',
    fov: 75
  });

  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('shapes');
  const [vibeFlash, setVibeFlash] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Brain State
  const beatCount = useRef(0);
  const blackoutCounter = useRef(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? currentVibe : mode;

  // Audio cortex
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;
    const init = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 512;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }
        if (!sourceRef.current && analyserRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyserRef.current);
          setHasAudioAccess(true);
        }
      } catch (e) { setHasAudioAccess(false); }
    };
    init();
  }, [mode, isPlaying]);

  // VJ Brain (Deep Randomization)
  const rollVJ = useCallback(() => {
    const shaderModes: VisualizerMode[] = ['city', 'columns', 'menger', 'tunnel', 'bulb'];
    const meshModes: VisualizerMode[] = ['shapes', 'neural', 'rings', 'core3d', 'trees', 'platonic', 'helix', 'flower', 'starfield'];
    const gameModes: VisualizerMode[] = ['pong', 'invaders', 'pacman', 'snake', 'tetris'];
    
    // 20% Chance for Game Mode in VJ Mode
    const useGame = Math.random() < 0.2;
    const modes = useGame ? gameModes : [...shaderModes, ...meshModes];
    
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron')[] = ['box', 'sphere', 'pyramid', 'torus', 'icosahedron'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    // Determine counts based on mode
    let count = Math.floor(20 + Math.pow(Math.random(), 2) * 180);
    if (nextMode === 'pong') count = 3; // L-Paddle, R-Paddle, Ball
    if (nextMode === 'invaders') count = 55; // 5x11 grid
    if (nextMode === 'pacman') count = 50; // Pac + 4 Ghosts + 45 dots
    if (nextMode === 'snake') count = 20; // 20 segments
    if (nextMode === 'tetris') count = 40; // ~10 blocks * 4 cubes

    setCurrentVibe(nextMode);
    setVj(prev => ({
      ...prev,
      pColor: new THREE.Color(p.p),
      sColor: new THREE.Color(p.s),
      primaryHue: p.ph,
      secondaryHue: p.sh,
      complexity: 0.5 + Math.random() * 2.5,
      objectCount: count,
      rotationSpeed: 0.2 + Math.random() * 2.0,
      motionIntensity: 0.5 + Math.random() * 2.0,
      distortionScale: 0.5 + Math.random() * 3.0,
      individualDamping: 0.02 + Math.random() * 0.2,
      wireframe: Math.random() > 0.3,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)],
      fov: nextMode === 'pong' ? 60 : 50 + Math.random() * 60
    }));

    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 300);
  }, []);

  // Sync with Map
  useEffect(() => {
    if (!activeMap || !currentTime) return;
    const cue = activeMap.cues.find(c => Math.abs(c.time - currentTime) < 0.5);
    if (cue) rollVJ();
  }, [activeMap, currentTime, rollVJ]);

  // Watchdog
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;
    const checkVisibility = () => {
      if (!rendererRef.current) return;
      const gl = rendererRef.current.getContext();
      const pixel = new Uint8Array(4);
      gl.readPixels(gl.drawingBufferWidth / 2, gl.drawingBufferHeight / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      if ((pixel[0] + pixel[1] + pixel[2]) / 3 < 2) {
        blackoutCounter.current++;
        if (blackoutCounter.current >= 3) { rollVJ(); blackoutCounter.current = 0; }
      } else { blackoutCounter.current = 0; }
    };
    const interval = setInterval(checkVisibility, 2000);
    return () => clearInterval(interval);
  }, [mode, isPlaying, rollVJ]);

  // Three Lifecycle
  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
    }

    const group = meshGroupRef.current!;
    const camera = cameraRef.current!;
    group.clear();

    const pMat = new THREE.MeshBasicMaterial({ color: vj.pColor, wireframe: vj.wireframe, transparent: true, opacity: 0.7 });
    const aMat = new THREE.MeshBasicMaterial({ color: vj.sColor, wireframe: true, transparent: true, opacity: 0.4 });

    const getGeo = (size = 1, type = vj.shapeType) => {
      if (type === 'box') return new THREE.BoxGeometry(size, size, size);
      if (type === 'sphere') return new THREE.SphereGeometry(size * 0.6, 12, 12);
      if (type === 'pyramid') return new THREE.ConeGeometry(size * 0.6, size, 4);
      if (type === 'icosahedron') return new THREE.IcosahedronGeometry(size, 0);
      return new THREE.TorusGeometry(size * 0.5, size * 0.2, 8, 24);
    };

    // --- Autonomous Agent Factory ---
    const count = vj.objectCount;
    for (let i = 0; i < count; i++) {
      let mesh;
      let userData: any = {
         phase: Math.random() * Math.PI * 2,
         speed: 0.5 + Math.random() * 2.0,
         freqIndex: Math.floor(Math.random() * 128),
         driftVec: new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1))
      };

      // --- Game Mode Initializers ---
      if (activeMode === 'pong') {
         if (i === 0) { // Left Paddle
             mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), pMat.clone());
             mesh.position.set(-15, 0, 0);
             userData.role = 'paddle_L';
         } else if (i === 1) { // Right Paddle
             mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), pMat.clone());
             mesh.position.set(15, 0, 0);
             userData.role = 'paddle_R';
         } else { // Ball
             mesh = new THREE.Mesh(new THREE.SphereGeometry(0.8), aMat.clone());
             userData.role = 'ball';
             userData.vel = new THREE.Vector3(0.4, 0.2, 0);
         }
      } 
      else if (activeMode === 'invaders') {
         // Grid 5 rows x 11 cols
         const row = Math.floor(i / 11);
         const col = i % 11;
         mesh = new THREE.Mesh(getGeo(0.8, 'box'), row % 2 === 0 ? pMat.clone() : aMat.clone());
         mesh.position.set((col - 5) * 2, (row - 2) * 2 + 5, 0);
         userData.role = 'invader';
         userData.gridPos = { x: col, y: row };
      }
      else if (activeMode === 'pacman') {
         if (i === 0) { // Pacman
             mesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: vj.wireframe }));
             mesh.position.set(0, 0, 0);
             userData.role = 'pacman';
             userData.dir = new THREE.Vector3(1, 0, 0);
         } else if (i < 5) { // Ghosts
             const colors = [0xff0000, 0x00ffff, 0xffb8ff, 0xffb852];
             mesh = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 4, 8), new THREE.MeshBasicMaterial({ color: colors[i-1], wireframe: true }));
             mesh.position.set((i-2.5)*3, 0, 0);
             userData.role = 'ghost';
         } else { // Dots
             mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2), pMat.clone());
             const angle = (i / 45) * Math.PI * 2;
             const r = 15;
             mesh.position.set(Math.cos(angle)*r, Math.sin(angle)*r, 0);
             userData.role = 'dot';
         }
      }
      else if (activeMode === 'snake') {
         mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), i === 0 ? aMat.clone() : pMat.clone());
         mesh.position.set(-i, 0, 0);
         userData.role = i === 0 ? 'head' : 'body';
         userData.index = i;
         userData.history = [];
      }
      else if (activeMode === 'tetris') {
         // Random tetromino shapes falling
         mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), i % 2 === 0 ? pMat.clone() : aMat.clone());
         mesh.position.set(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(30), 0);
         userData.role = 'block';
      }
      else {
        // Standard Swarm Generation
        mesh = new THREE.Mesh(getGeo(0.5 + Math.random() * 1.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
        if (activeMode === 'fibonacci') {
            const t = i * 0.1;
            const r = 2 * Math.sqrt(i) * vj.complexity;
            mesh.position.set(Math.cos(t) * r, Math.sin(t) * r, i * 0.1 - 10);
        } else if (activeMode === 'voxels') {
            const x = (i % 10) - 5;
            const z = Math.floor(i / 10) - 5;
            mesh.position.set(x * 4, -10, z * 4);
        } else if (activeMode === 'rings') {
            const ringGeo = new THREE.TorusGeometry(i * 2, 0.1, 8, 64);
            mesh.geometry = ringGeo;
            mesh.position.set(0,0,0);
        } else {
            mesh.position.set(THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60));
        }
      }
      
      if (mesh) {
        mesh.userData = userData;
        group.add(mesh);
      }
    }

    camera.fov = vj.fov;
    camera.updateProjectionMatrix();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rendererRef.current?.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe, vj.fov, vj.complexity, vj.objectCount]);


  // Audio Analysis & Animation Engine
  const analysisRef = useRef({
    subBassAvg: 0,
    longTermAvg: 0,
    buildUpScore: 0,
    timeSinceLastDrop: 0,
    framesSinceBeat: 0,
    spectralFlatness: 0,
    // Phase Engine
    bpmEstimate: 128,
    beatInterval: 468, // 128bpm start
    lastBeatTime: 0,
    beatCounter: 0,   // Total beats
    barPhase: 0,      // 0-3 (Beat 1-4)
    phrasePhase: 0,   // 0-15 (Bar 1-16)
    phraseEnergy: [] as number[], // Avg energy per bar
    predictedState: 'FLOW'
  });

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      let sub = 0, bass = 0, mid = 0, high = 0;
      let isBeat = false;
      let isSnare = false;
      let spectralCentroid = 0;
      let energySum = 0;
      let weightedSum = 0;
      
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        const binCount = analyserRef.current.frequencyBinCount; 

        // 1. Precise Band Division
        let sSum=0, bSum=0, mSum=0, hSum=0;
        let geometricMeanNum = 0;
        let arithmeticMeanSum = 0;

        // Calculate Bands & Spectral Features
        for(let i=0; i<binCount; i++) {
          const val = d[i];
          
          // Spectral Centroid
          energySum += val;
          weightedSum += i * val;
          
          // Spectral Flatness components
          if (val > 0) {
            geometricMeanNum += Math.log(val);
            arithmeticMeanSum += val;
          }

          // Bands
          if (i < 3) sSum += val;       // Sub-bass (~0-170Hz)
          else if (i < 8) bSum += val;  // Bass (~170-680Hz)
          else if (i < 64) mSum += val; // Mids (~2k-5kHz)
          else hSum += val;             // Highs (5kHz+)
        }

        sub = (sSum / 3 / 255) * sensitivity;
        bass = (bSum / 5 / 255) * sensitivity;
        mid = (mSum / 40 / 255) * sensitivity;
        high = (hSum / 192 / 255) * sensitivity;

        // Spectral Centroid (Brightness) 0-1
        spectralCentroid = energySum > 0 ? (weightedSum / energySum) / binCount : 0;
        
        // Spectral Flatness
        const gMean = Math.exp(geometricMeanNum / binCount);
        const aMean = arithmeticMeanSum / binCount;
        const flatness = aMean > 0 ? gMean / aMean : 0;
        analysisRef.current.spectralFlatness = flatness; 

        // 2. Advanced Beat Detection & Phase Locking
        analysisRef.current.subBassAvg = analysisRef.current.subBassAvg * 0.9 + sub * 0.1;
        
        // Beat Threshold
        if (sub > analysisRef.current.subBassAvg * 1.4 && sub > 0.4 && analysisRef.current.framesSinceBeat > 15) {
          isBeat = true;
          analysisRef.current.framesSinceBeat = 0;
          
          // BPM & Phase Logic
          const interval = now - analysisRef.current.lastBeatTime;
          analysisRef.current.lastBeatTime = now;
          analysisRef.current.beatCounter++;
          
          // Filter crazy intervals (valid: 60-200 BPM -> 300ms to 1000ms)
          if (interval > 300 && interval < 1000) {
            // Soft Lock BPM
            analysisRef.current.beatInterval = analysisRef.current.beatInterval * 0.9 + interval * 0.1;
            const currentBPM = Math.round(60000 / analysisRef.current.beatInterval);
            analysisRef.current.bpmEstimate = currentBPM;
            onBPMChange?.(currentBPM);
          }

          // Phase Increment
          analysisRef.current.barPhase = (analysisRef.current.barPhase + 1) % 4;
          
          // Bar Complete (Every 4 beats)
          if (analysisRef.current.barPhase === 0) {
             analysisRef.current.phrasePhase = (analysisRef.current.phrasePhase + 1) % 16;
             
             // Energy Analysis for this Bar
             const barEnergy = (sub + bass + mid) / 3;
             analysisRef.current.phraseEnergy.push(barEnergy);
             if (analysisRef.current.phraseEnergy.length > 16) analysisRef.current.phraseEnergy.shift();
             
             // Prediction Logic
             const avgPhraseEnergy = analysisRef.current.phraseEnergy.reduce((a,b)=>a+b,0) / analysisRef.current.phraseEnergy.length;
             let state = 'FLOW';
             if (barEnergy > avgPhraseEnergy * 1.3 && high > 0.5) state = 'BUILD';
             if (sub > 0.8 && analysisRef.current.buildUpScore > 0.5) state = 'DROP';
             analysisRef.current.predictedState = state;

             // Console Report
             console.log(
               `%c🔊 [VJ CORE] Bar: ${analysisRef.current.phrasePhase + 1}/16 | BPM: ${analysisRef.current.bpmEstimate} | Energy: ${barEnergy.toFixed(2)} | State: ${state}`,
               `color: ${state === 'DROP' ? '#ff0055' : state === 'BUILD' ? '#ffcc00' : '#00ffff'}; font-weight: bold;`
             );

             // Change Visual Mode on Phrase Change (every 16 bars)
             if (analysisRef.current.phrasePhase === 0 && mode === 'vj') {
                rollVJ();
             }
          }

          if (mode === 'vj' && beatCount.current % 16 === 0) {
             // Redundant backup trigger
          }
        } else {
          analysisRef.current.framesSinceBeat++;
        }
        
        if (mid > 0.6 && sub < 0.3) {
          isSnare = true;
        }

        // 3. Build-up & Drop Engine
        
        if (high > 0.4 && sub < 0.5 && spectralCentroid > 0.4) {
           analysisRef.current.buildUpScore += 0.05;
        } else {
           analysisRef.current.buildUpScore *= 0.95; 
        }

        if (analysisRef.current.buildUpScore > 1.0 && sub > 0.8 && (now - analysisRef.current.timeSinceLastDrop > 5000)) {
           rollVJ(); 
           if (currentTime) recordCue(currentTime, 'DROP');
           analysisRef.current.timeSinceLastDrop = now;
           analysisRef.current.buildUpScore = 0; 
        }
      }

      // --- VISUAL RENDERING ---
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const cam = cameraRef.current;
        const hueShift = (now * 0.05) % 360;
        
        const isBuildUp = analysisRef.current.buildUpScore > 1.5;
        const buildupFactor = Math.min(analysisRef.current.buildUpScore / 5, 1); 
        const flatness = analysisRef.current.spectralFlatness;

        // 1. Global Scene Movement
        const rotSpeed = vj.rotationSpeed * (isBuildUp ? (1 + buildupFactor * 4) : 1);
        
        // Disable global rotation for 2D-like games to keep them playable/viewable
        const isGame = ['pong', 'invaders', 'pacman', 'snake', 'tetris'].includes(activeMode);
        if (!isGame) {
           group.rotation.y += 0.002 * rotSpeed;
        } else {
           // Gentle sway for games
           group.rotation.y = Math.sin(now * 0.0002) * 0.1; 
           group.rotation.x = Math.sin(now * 0.0001) * 0.05;
        }

        if (isBuildUp) {
            group.position.x = (Math.random() - 0.5) * buildupFactor * 0.5;
            group.position.y = (Math.random() - 0.5) * buildupFactor * 0.5;
        } else {
            group.position.x = 0;
            group.position.y = 0;
        }

        // 2. Camera Physics
        const targetFov = isBeat ? vj.fov + (sub * 15) : vj.fov + (isBuildUp ? -20 : 0); 
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 0.2);
        cam.updateProjectionMatrix();

        // 3. Object Modulation
        group.children.forEach((obj, i) => {
          const mesh = obj as THREE.Mesh;
          const agent = mesh.userData;
          
          let localIntensity = 0;
          if (agent.freqIndex < 10) localIntensity = sub;
          else if (agent.freqIndex < 30) localIntensity = bass;
          else if (agent.freqIndex < 80) localIntensity = mid;
          else localIntensity = high;

          // GAME PHYSICS ENGINE
          if (activeMode === 'pong') {
             if (agent.role === 'ball') {
                 // Move
                 mesh.position.add(agent.vel);
                 // Bounce Y
                 if (mesh.position.y > 10 || mesh.position.y < -10) agent.vel.y *= -1;
                 // Bounce X (Paddles)
                 if (mesh.position.x > 14 || mesh.position.x < -14) {
                     agent.vel.x *= -1;
                     // Speed up on hit
                     agent.vel.multiplyScalar(1.05);
                     // Clamp speed
                     agent.vel.clampLength(0.2, 0.8);
                 }
                 // Beat Kick
                 if (isBeat) {
                     agent.vel.multiplyScalar(1.2);
                     mesh.scale.setScalar(1.5);
                 } else {
                     mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
                 }
             } else if (agent.role?.startsWith('paddle')) {
                 // AI Tracking
                 // Find ball
                 const ball = group.children.find(c => c.userData.role === 'ball');
                 if (ball) {
                     // Lerp towards ball Y
                     const targetY = ball.position.y;
                     // Add delay/error based on frequency
                     const lag = 0.05 + (localIntensity * 0.1); 
                     mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, lag);
                     // Clamp paddle to field
                     mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, -8, 8);
                 }
             }
          }
          else if (activeMode === 'invaders') {
              // Grid Movement
              const time = now * 0.001;
              const xOffset = Math.sin(time) * 5;
              
              mesh.position.x = ((agent.gridPos.x - 5) * 2) + xOffset;
              
              // Drop on beat
              if (isBeat) {
                  mesh.position.y -= 0.5;
              }
              // Reset height if too low
              if (mesh.position.y < -15) mesh.position.y = 15;
              
              // Alien bob
              mesh.position.y += Math.sin(time * 5 + agent.gridPos.x) * 0.2;
              
              // Scale on shoot
              if (isSnare && Math.random() > 0.8) {
                  mesh.scale.y = 2;
              } else {
                  mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
              }
          }
          else if (activeMode === 'snake') {
              const time = now * 0.002;
              if (agent.role === 'head') {
                  mesh.position.x = Math.sin(time) * 10;
                  mesh.position.y = Math.cos(time * 0.5) * 8;
                  mesh.position.z = Math.sin(time * 1.5) * 5;
                  
                  // Store history for body
                  agent.history.unshift(mesh.position.clone());
                  if (agent.history.length > 50) agent.history.pop();
              } else {
                  // Body follows head
                  const head = group.children[0];
                  if (head && head.userData.history[agent.index]) {
                      mesh.position.copy(head.userData.history[agent.index]);
                  }
              }
              // Pulse on beat
              if (isBeat) mesh.scale.setScalar(1.2);
              else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (activeMode === 'pacman') {
              const time = now * 0.002;
              if (agent.role === 'pacman') {
                  mesh.position.x = Math.sin(time) * 12;
                  mesh.position.z = Math.cos(time) * 12;
                  mesh.lookAt(mesh.position.clone().add(agent.dir));
                  // Chomp
                  mesh.scale.y = 1 - Math.abs(Math.sin(now * 0.01)) * 0.5;
              } else if (agent.role === 'ghost') {
                  // Chase Pacman
                  const pacman = group.children[0];
                  if (pacman) {
                      const dir = new THREE.Vector3().subVectors(pacman.position, mesh.position).normalize();
                      mesh.position.addScaledVector(dir, 0.15); // Slower than pacman?
                      mesh.lookAt(pacman.position);
                  }
              }
          }
          else if (activeMode === 'tetris') {
              // Fall
              mesh.position.y -= 0.05 + (sub * 0.2); // Faster with bass
              if (mesh.position.y < -20) {
                  mesh.position.y = 20;
                  mesh.position.x = THREE.MathUtils.randFloatSpread(20);
              }
              // Rotate
              if (isBeat) {
                  mesh.rotation.z += Math.PI / 2;
              }
          }
          else {
              // SWARM PHYSICS (Original Logic)
              let targetScaleX = 1 + localIntensity * vj.distortionScale;
              let targetScaleY = 1 + localIntensity * vj.distortionScale;
              let targetScaleZ = 1 + localIntensity * vj.distortionScale;

              if (isBeat && agent.freqIndex < 20) {
                 targetScaleX *= 1.5;
                 targetScaleY *= 1.5;
                 targetScaleZ *= 1.5;
              }

              if (isSnare && agent.freqIndex > 80) {
                 targetScaleX *= 2.0;
              }

              mesh.scale.lerp(new THREE.Vector3(targetScaleX, targetScaleY, targetScaleZ), 0.2);

              // POSITION: Drift + Noise
              const time = now * 0.001 * agent.speed;
              const jitter = (high * 0.5) + (buildupFactor * 0.5);
              
              mesh.position.addScaledVector(agent.driftVec, Math.sin(time + agent.phase) * 0.02 * vj.motionIntensity);
              
              if (jitter > 0.1) {
                 mesh.position.x += (Math.random() - 0.5) * jitter;
                 mesh.position.y += (Math.random() - 0.5) * jitter;
                 mesh.position.z += (Math.random() - 0.5) * jitter;
              }
          }

          // MATERIAL: Tonality vs Noise (Shared across all modes)
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            const baseHue = i % 2 === 0 ? vj.primaryHue : vj.secondaryHue;
            const activeHue = isBuildUp ? THREE.MathUtils.lerp(baseHue, 0, buildupFactor) : (baseHue + hueShift) % 360;
            const saturation = isBuildUp ? 1.0 : 0.8;
            const lightness = isBeat ? 0.7 : (0.4 + localIntensity * 0.4);

            mesh.material.color.setHSL(activeHue / 360, saturation, lightness);
            
            if (flatness > 0.6) {
                mesh.material.opacity = 0.2 + (Math.random() * 0.5);
            } else {
                mesh.material.opacity = 0.7; 
            }
          }
        });

        rendererRef.current.render(sceneRef.current, cam);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, hasAudioAccess, sensitivity, vj, rollVJ, mode, isPlaying, onBPMChange, currentTime]);

  if (mode === 'none') return null;

  return (
    <div ref={containerRef} className={cn(
      "fixed inset-0 w-full h-full pointer-events-none transition-all duration-1000",
      isDashboard ? "opacity-100 z-0 bg-black" : "opacity-30 z-0"
    )}>
      {vibeFlash && <div className="absolute inset-0 bg-white/20 z-50 animate-out fade-out duration-500" />}
    </div>
  );
};

export default Visualizer;
