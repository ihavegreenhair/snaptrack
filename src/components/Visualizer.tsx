import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
import { cn } from '@/lib/utils';
import { useSongMapper } from '@/hooks/useSongMapper';

export type VisualizerMode = 
  // Original Modes
  | 'menger' | 'city' | 'tunnel' | 'matrix' | 'shapes' | 'rings' | 'starfield' | 'fibonacci' | 'voxels' 
  | 'pong' | 'invaders' | 'pacman' | 'snake' | 'tetris' | 'puzzle' | 'population'
  // Catalog Type A: Geometry Versions
  | 'menger_sponge' | 'neon_pillars' | 'liquid_blob' | 'the_matrix_v2' | 'fractal_landmass' 
  | 'hyper_torus' | 'recursive_rooms' | 'gyroid_membrane' | 'neon_ribbons' | 'crystal_growth'
  | 'void_vortex' | 'digital_clouds' | 'hexagonal_hive' | 'mandelbulb' | 'lava_sea'
  // Catalog Type B: Geometry & Mesh
  | 'shape_storm' | 'neural_web' | 'vinyl_rain' | 'boids_swarm' | 'audio_rings_v2'
  | 'jellyfish' | 'voxelizer' | 'spring_field' | 'particle_fountain' | 'floating_islands'
  | 'light_trails' | 'physics_pile' | 'string_theory' | 'geometric_core' | 'mirror_prism'
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

const catalogA: VisualizerMode[] = [
  'menger_sponge', 'neon_pillars', 'liquid_blob', 'the_matrix_v2', 'fractal_landmass',
  'hyper_torus', 'recursive_rooms', 'gyroid_membrane', 'neon_ribbons', 'crystal_growth',
  'void_vortex', 'digital_clouds', 'hexagonal_hive', 'mandelbulb', 'lava_sea'
];

const catalogB: VisualizerMode[] = [
  'shape_storm', 'neural_web', 'vinyl_rain', 'boids_swarm', 'audio_rings_v2',
  'jellyfish', 'voxelizer', 'spring_field', 'particle_fountain', 'floating_islands',
  'light_trails', 'physics_pile', 'string_theory', 'geometric_core', 'mirror_prism'
];

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
  onBPMChange?: (bpm: number) => void;
  onBeatConfidenceChange?: (confidence: number) => void;
  videoId?: string;
  songTitle?: string;
  photoUrl?: string;
  currentTime?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5, onBPMChange, onBeatConfidenceChange, videoId, songTitle, photoUrl, currentTime }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { activeMap, recordCue, saveMap } = useSongMapper(videoId, songTitle);
  
  const essentiaRef = useRef<any>(null);
  const confidenceRef = useRef(0);

  // Sync state for UI periodically (every 500ms) to avoid 60fps React overhead
  useEffect(() => {
    const interval = setInterval(() => {
      onBeatConfidenceChange?.(confidenceRef.current);
    }, 500);
    return () => clearInterval(interval);
  }, [onBeatConfidenceChange]);

  // Initialize Essentia
  useEffect(() => {
    const initEssentia = async () => {
      try {
        const wasm = await (EssentiaWASM as any)();
        essentiaRef.current = new (Essentia as any)(wasm);
        console.log('[Essentia] Neural Engine Ready');
      } catch (e) {
        console.error('[Essentia] Init failed', e);
      }
    };
    initEssentia();
  }, []);

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
  const blackoutCounter = useRef(0);
  const timeBufferRef = useRef<Uint8Array | null>(null);

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
    const geometryModes: VisualizerMode[] = ['city', 'tunnel', 'matrix', 'shapes', 'rings', 'starfield', 'fibonacci', 'voxels', 'population'];
    const gameModes: VisualizerMode[] = ['pong', 'invaders', 'pacman', 'snake', 'tetris', 'puzzle'];
    
    const rand = Math.random();
    let modes: VisualizerMode[] = [];
    if (rand < 0.25) modes = catalogA;
    else if (rand < 0.50) modes = catalogB;
    else if (rand < 0.75) modes = geometryModes;
    else modes = gameModes;
    
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron')[] = ['box', 'sphere', 'pyramid', 'torus', 'icosahedron'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    // Determine counts based on mode
    let count = Math.floor(20 + Math.pow(Math.random(), 2) * 180);
    if (nextMode === 'pong') count = 3; 
    if (nextMode === 'invaders') count = 55; 
    if (nextMode === 'pacman') count = 50; 
    if (nextMode === 'snake') count = 20; 
    if (nextMode === 'tetris') count = 40; 
    if (nextMode === 'puzzle') count = 15;
    if (nextMode === 'population') count = 0;

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
      fov: 60
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
      let mesh: THREE.Mesh | undefined;
      let userData: any = {
         phase: Math.random() * Math.PI * 2,
         speed: 0.5 + Math.random() * 2.0,
         freqIndex: Math.floor(Math.random() * 128),
         orbitRadius: 10 + Math.random() * 30,
         driftVec: new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1))
      };

      // --- CATALOG A GEOMETRY VERSIONS ---
      if (activeMode === 'menger_sponge') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isMengerPart = true;
      }
      else if (activeMode === 'neon_pillars') {
        const h = 2 + Math.random() * 10;
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), pMat.clone());
        mesh.position.set((i % 10 - 5) * 4, -10 + h/2, (Math.floor(i / 10) - 5) * 4);
        userData.isPillar = true;
        userData.baseH = h;
      }
      else if (activeMode === 'liquid_blob') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20));
        userData.isBlobPart = true;
      }
      else if (activeMode === 'the_matrix_v2') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }));
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), Math.random() * 40, THREE.MathUtils.randFloatSpread(20));
        userData.isMatrixPart = true;
      }
      else if (activeMode === 'fractal_landmass') {
        mesh = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), aMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(60), -10, THREE.MathUtils.randFloatSpread(60));
        userData.isLandPart = true;
      }
      else if (activeMode === 'hyper_torus') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(5 + i, 0.2, 8, 32), pMat.clone());
        userData.isHyperRing = true;
      }
      else if (activeMode === 'recursive_rooms') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(40 - i*2, 40 - i*2, 40 - i*2), aMat.clone());
        userData.isRoom = true;
      }
      else if (activeMode === 'gyroid_membrane') {
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isMembrane = true;
      }
      else if (activeMode === 'neon_ribbons') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 20), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), 0, THREE.MathUtils.randFloatSpread(40));
        userData.isRibbon = true;
      }
      else if (activeMode === 'crystal_growth') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.5), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30));
        userData.isCrystal = true;
      }
      else if (activeMode === 'void_vortex') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(i * 0.5, 0.1, 8, 32), aMat.clone());
        userData.isVortexRing = true;
      }
      else if (activeMode === 'digital_clouds') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), 10 + Math.random() * 20, THREE.MathUtils.randFloatSpread(100));
        userData.isCloud = true;
      }
      else if (activeMode === 'hexagonal_hive') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 6), pMat.clone());
        const x = (i % 10 - 5) * 2;
        const z = (Math.floor(i / 10) - 5) * 1.73;
        mesh.position.set(x + (Math.floor(i / 10) % 2 * 1), 0, z);
        mesh.rotation.x = Math.PI / 2;
        userData.isHiveCell = true;
      }
      else if (activeMode === 'mandelbulb') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), pMat.clone());
        const angle = i * 0.2;
        const r = Math.sqrt(i) * 2;
        mesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, THREE.MathUtils.randFloatSpread(10));
        userData.isFractalPart = true;
      }
      else if (activeMode === 'lava_sea') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0xff4500, wireframe: true }));
        mesh.position.set((i % 10 - 5) * 2.1, -10, (Math.floor(i / 10) - 5) * 2.1);
        userData.isLavaPart = true;
      }
      // --- CATALOG B MODES ---
      else if (activeMode === 'shape_storm') {
        mesh = new THREE.Mesh(getGeo(1.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(100));
        userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.5), THREE.MathUtils.randFloatSpread(0.5), THREE.MathUtils.randFloatSpread(0.5));
      }
      else if (activeMode === 'neural_web') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isNode = true;
      }
      else if (activeMode === 'vinyl_rain') {
        const discGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
        const discMat = pMat.clone();
        if (photoUrl) {
          const loader = new THREE.TextureLoader();
          const tex = loader.load(photoUrl);
          (discMat as any).map = tex;
          discMat.needsUpdate = true;
        }
        mesh = new THREE.Mesh(discGeo, discMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(60), 30 + Math.random() * 50, THREE.MathUtils.randFloatSpread(20));
        mesh.rotation.x = Math.PI / 2;
        userData.isVinyl = true;
      }
      else if (activeMode === 'boids_swarm') {
        mesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 3), aMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isBoid = true;
        userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1));
      }
      else if (activeMode === 'jellyfish') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isJelly = true;
      }
      else if (activeMode === 'voxelizer') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pMat.clone());
        const x = (i % 20) - 10;
        const y = Math.floor(i / 20) % 20 - 10;
        mesh.position.set(x, y, 0);
        userData.isVoxel = true;
        userData.origPos = mesh.position.clone();
      }
      else if (activeMode === 'floating_islands') {
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 3), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), -20 + Math.random() * 40, THREE.MathUtils.randFloatSpread(100));
        userData.isIsland = true;
      }
      else if (activeMode === 'geometric_core') {
        const sizes = [5, 8, 12, 15];
        mesh = new THREE.Mesh(getGeo(sizes[i % 4]), i % 2 === 0 ? pMat.clone() : aMat.clone());
        userData.isCoreLayer = true;
        userData.layerIndex = i % 4;
      }
      // --- ORIGINAL MODES ---
      else if (activeMode === 'pong') {
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
      else if (activeMode === 'puzzle') {
         // 4x4 Grid (15 tiles)
         const col = i % 4;
         const row = Math.floor(i / 4);
         
         const size = 3.5;
         const spacing = 3.6;
         const offsetX = -1.5 * spacing;
         const offsetY = -1.5 * spacing; // Center the 4x4 grid
         
         mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, 0.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
         
         const x = (col * spacing) + offsetX;
         const y = (row * spacing) + offsetY;
         
         mesh.position.set(x, y, 0);
         
         userData.gridPos = { x: col, y: row }; // Logical Position (0-3)
         userData.targetPos = new THREE.Vector3(x, y, 0); // Animation Target
         userData.tileId = i;
         
         // Color Gradient
         if (mesh.material instanceof THREE.MeshBasicMaterial) {
             mesh.material.color.setHSL((vj.primaryHue + (i * 10)) / 360, 0.8, 0.5);
         }
      }
      // --- INFINITE GEOMETRY MODES ---
      else if (activeMode === 'tunnel') {
          mesh = new THREE.Mesh(getGeo(1 + Math.random()), i % 2 === 0 ? pMat.clone() : aMat.clone());
          const angle = i * 0.5;
          const radius = 10 + Math.random() * 5;
          const z = -i * 2; 
          mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, z);
          mesh.lookAt(0,0,z-10);
          userData.infiniteZ = true;
          userData.scrollSpeed = 0.5;
      }
      else if (activeMode === 'city') {
          const buildingHeight = 1 + Math.random() * 8;
          mesh = new THREE.Mesh(new THREE.BoxGeometry(2, buildingHeight, 2), i % 3 === 0 ? pMat.clone() : aMat.clone());
          const row = Math.floor(i / 6);
          const col = i % 6;
          const spacing = 4;
          const z = -row * spacing * 2; 
          const x = (col - 2.5) * spacing * 3;
          
          mesh.position.set(x, -10 + buildingHeight/2, z);
          userData.infiniteZ = true;
          userData.scrollSpeed = 0.8;
          userData.baseY = -10 + buildingHeight/2;
          userData.isBuilding = true;
      }
      else if (activeMode === 'starfield') {
          // Warp Speed
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2), pMat.clone());
          mesh.position.set(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(60), -Math.random() * 200);
          userData.infiniteZ = true;
          userData.scrollSpeed = 2.0;
      }
      else if (activeMode === 'matrix') {
          // Digital Rain
          mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), pMat.clone());
          mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(20));
          userData.infiniteY = true;
          userData.fallSpeed = 0.5 + Math.random();
      }
      else if (activeMode === 'fibonacci') {
          const t = i * 0.1;
          const r = 2 * Math.sqrt(i) * vj.complexity;
          mesh = new THREE.Mesh(getGeo(1), i % 2 === 0 ? pMat.clone() : aMat.clone());
          mesh.position.set(Math.cos(t) * r, Math.sin(t) * r, i * 0.1 - 10);
      } else if (activeMode === 'voxels') {
          const x = (i % 10) - 5;
          const z = Math.floor(i / 10) - 5;
          mesh = new THREE.Mesh(getGeo(0.8), pMat.clone());
          mesh.position.set(x * 4, -10, z * 4);
      } else if (activeMode === 'rings') {
          const ringGeo = new THREE.TorusGeometry(i * 2, 0.1, 8, 64);
          mesh = new THREE.Mesh(ringGeo, pMat.clone());
          mesh.position.set(0,0,0);
      } else {
          mesh = new THREE.Mesh(getGeo(0.5 + Math.random() * 1.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
          mesh.position.set(THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60));
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
  }, [activeMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe, vj.fov, vj.complexity, vj.objectCount, photoUrl]);


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
    beatInterval: 468, 
    lastBeatTime: 0,
    beatCounter: 0,   
    barPhase: 0,      
    phrasePhase: 0,   
    phraseEnergy: [] as number[], 
    predictedState: 'FLOW',
    // Puzzle State
    puzzleState: {
        empty: { x: 3, y: 3 }, // Start bottom-right empty
        grid: [
            [0, 1, 2, 3],
            [4, 5, 6, 7],
            [8, 9, 10, 11],
            [12, 13, 14, -1] // -1 is empty
        ]
    }
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
        // 1. Get Frequency Data for Visuals
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        const binCount = analyserRef.current.frequencyBinCount; 

        // 2. Get Time Domain Data for Essentia (Neural Bridge)
        if (!timeBufferRef.current) {
            timeBufferRef.current = new Uint8Array(analyserRef.current.fftSize);
        }
        analyserRef.current.getByteTimeDomainData(timeBufferRef.current);
        const timeData = timeBufferRef.current;
        
        // --- ESSENTIA NEURAL BRIDGE ---
        if (essentiaRef.current) {
            // Convert to Float32 [-1, 1] for Essentia
            const floatBuffer = new Float32Array(timeData.length);
            for(let i=0; i<timeData.length; i++) {
                floatBuffer[i] = (timeData[i] - 128) / 128.0;
            }
            
            // Calculate RMS (Root Mean Square) using Essentia
            const vector = essentiaRef.current.arrayToVector(floatBuffer);
            const rms = essentiaRef.current.RMS(vector).rms;
            
            // Dynamic Confidence: If signal is clean (RMS > threshold), confidence goes up
            if (rms > 0.005) { // Very high sensitivity
                confidenceRef.current = Math.min(confidenceRef.current + 0.01, 1.0);
            } else {
                confidenceRef.current = Math.max(confidenceRef.current - 0.005, 0);
            }
            
            // Clean up WASM memory
            vector.delete();
        } else {
            // Fallback: If Essentia is initializing, use sub-bass as a confidence proxy (capped at 40%)
            if (d[0] > 50) {
                confidenceRef.current = Math.min(confidenceRef.current + 0.005, 0.4);
            }
        }

        // AI PREDICTION REACTION (Option 3)
        if (activeMap && activeMap.cues && currentTime) {
            const currentCue = activeMap.cues.find(c => Math.abs(c.time - currentTime) < 0.1);
            if (currentCue) {
                if (currentCue.type === 'DROP') {
                    rollVJ();
                    // AI-driven "Force Beat"
                    isBeat = true;
                }
            }
        }

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
        const beatThreshold = analysisRef.current.subBassAvg * 1.4;
        const isAudioBeat = sub > beatThreshold && sub > 0.4 && analysisRef.current.framesSinceBeat > 15;
        
        // Option 2: Phase Locking (Confidence Engine)
        const timeSinceLast = now - analysisRef.current.lastBeatTime;
        const expectedInterval = analysisRef.current.beatInterval;
        const phaseError = Math.abs(timeSinceLast - expectedInterval);
        
        // If audio matches expected phase, increase confidence Ref
        if (isAudioBeat && phaseError < 50) {
            confidenceRef.current = Math.min(confidenceRef.current + 0.05, 1.0);
        }

        // If high confidence, we can trigger beat based on time even if audio is quiet
        const isPhaseBeat = confidenceRef.current > 0.8 && timeSinceLast >= expectedInterval;

        if (isAudioBeat || isPhaseBeat) {
          isBeat = true;
          analysisRef.current.framesSinceBeat = 0;
          
          // BPM & Phase Logic
          const interval = isPhaseBeat ? expectedInterval : (now - analysisRef.current.lastBeatTime);
          analysisRef.current.lastBeatTime = now;
          analysisRef.current.beatCounter++;
          
          // Filter crazy intervals (valid: 60-200 BPM -> 300ms to 1000ms)
          if (interval > 300 && interval < 1000) {
            // Soft Lock BPM
            analysisRef.current.beatInterval = analysisRef.current.beatInterval * 0.9 + interval * 0.1;
            const currentBPM = Math.round(60000 / analysisRef.current.beatInterval);
            analysisRef.current.bpmEstimate = currentBPM;
            onBPMChange?.(currentBPM);
            
            // Auto-save map progress
            if (currentBPM > 40 && currentBPM < 220) {
              saveMap(currentBPM);
            }
          }

          // Phase Increment
          analysisRef.current.barPhase = (analysisRef.current.barPhase + 1) % 4;
          
          // Bar Complete (Every 4 beats)
          if (analysisRef.current.barPhase === 0) {
             analysisRef.current.phrasePhase = (analysisRef.current.phrasePhase + 1) % 16;
             
             // Energy Analysis
             const barEnergy = (sub + bass + mid + high) / 4;
             
             const avgPhraseEnergy = analysisRef.current.phraseEnergy.length > 0 
                ? analysisRef.current.phraseEnergy.reduce((a,b)=>a+b,0) / analysisRef.current.phraseEnergy.length
                : 0.5;

             analysisRef.current.phraseEnergy.push(barEnergy);
             if (analysisRef.current.phraseEnergy.length > 16) analysisRef.current.phraseEnergy.shift();
             
             let state = 'FLOW';
             if (barEnergy > avgPhraseEnergy * 1.1 && high > 0.3) state = 'BUILD';
             if (sub > 0.6 && analysisRef.current.buildUpScore > 0.5) state = 'DROP';
             analysisRef.current.predictedState = state;

             // Change Visual Mode every 8 Bars (Phrase End)
             if (analysisRef.current.phrasePhase % 8 === 0 && mode === 'vj') {
                rollVJ();
             }
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

        // POPULATION MODE: ADD ENTITIES ON BEAT
        if (activeMode === 'population' && isBeat) {
            const size = 0.5 + Math.random();
            const mesh = new THREE.Mesh(
                new THREE.BoxGeometry(size, size, size),
                new THREE.MeshBasicMaterial({ 
                    color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5), 
                    wireframe: true 
                })
            );
            mesh.position.set(
                THREE.MathUtils.randFloatSpread(40),
                THREE.MathUtils.randFloatSpread(30),
                THREE.MathUtils.randFloatSpread(40)
            );
            mesh.userData = {
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random(),
                driftVec: new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5),
                freqIndex: Math.floor(Math.random() * 64)
            };
            group.add(mesh);
            
            // Limit Population
            if (group.children.length > 200) {
                group.remove(group.children[0]);
            }
        }

        // PUZZLE LOGIC
        if (activeMode === 'puzzle' && isBeat && group.children.length > 0) {
            const { x, y } = analysisRef.current.puzzleState.empty;
            const neighbors = [
                { x: x, y: y - 1 }, { x: x, y: y + 1 }, { x: x - 1, y: y }, { x: x + 1, y: y }
            ].filter(n => n.x >= 0 && n.x < 4 && n.y >= 0 && n.y < 4);
            
            const target = neighbors[Math.floor(Math.random() * neighbors.length)];
            const tileMesh = group.children.find(m => m.userData.gridPos && m.userData.gridPos.x === target.x && m.userData.gridPos.y === target.y);
            
            if (tileMesh) {
                analysisRef.current.puzzleState.empty = target;
                tileMesh.userData.gridPos = { x, y };
                const spacing = 3.6;
                const offsetX = -1.5 * spacing;
                const offsetY = -1.5 * spacing;
                tileMesh.userData.targetPos.set((x * spacing) + offsetX, (y * spacing) + offsetY, 0);
            }
        }

        // 1. Global Scene Movement & Camera Logic
        const rotSpeed = vj.rotationSpeed * (isBuildUp ? (1 + buildupFactor * 4) : 1);
        const isGame = ['pong', 'invaders', 'pacman', 'snake', 'tetris', 'puzzle'].includes(activeMode);
        const isInfinite = ['city', 'starfield', 'matrix'].includes(activeMode);
        
        if (!isGame && !isInfinite) {
           if (activeMode === 'tunnel') group.rotation.z += 0.005 * rotSpeed; 
           else group.rotation.y += 0.002 * rotSpeed;
        } else if (isGame) {
           if (activeMode !== 'puzzle') {
               group.rotation.y = Math.sin(now * 0.0002) * 0.1; 
               group.rotation.x = Math.sin(now * 0.0001) * 0.05;
           } else {
               group.rotation.z = Math.sin(now * 0.005) * 0.05 * bass;
           }
        } else {
           group.rotation.set(0,0,0);
        }

        // --- CAMERA POSITIONING ---
        const t = now * 0.0003;
        
        if (activeMode === 'pong' || activeMode === 'invaders') {
            cam.position.set(0, 0, 25);
            cam.lookAt(0, 0, 0);
        } else if (activeMode === 'pacman') {
            cam.position.set(0, 35, 1);
            cam.lookAt(0, 0, 0);
            cam.rotation.z = Math.PI / 2;
        } else if (activeMode === 'snake') {
            cam.position.set(0, 20, 20);
            cam.lookAt(0, 0, 0);
        } else if (activeMode === 'tetris') {
            cam.position.set(0, 0, 40);
            cam.lookAt(0, 0, 0);
        } else if (activeMode === 'city') {
            cam.position.set(Math.sin(t) * 5, 2, 10);
            cam.lookAt(0, 0, -50);
        } else {
            cam.position.x = Math.sin(t) * 25.0;
            cam.position.y = Math.cos(t * 0.8) * 15.0;
            if (activeMode === 'tunnel' || activeMode === 'starfield') {
                cam.position.set(0, 0, 10);
                cam.lookAt(0, 0, -50);
            } else {
                cam.lookAt(0, 0, 0);
            }
        }

        const baseFov = isGame ? 60 : vj.fov;
        const targetFov = isBeat ? baseFov + (sub * 5) : baseFov + (isBuildUp ? -10 : 0); 
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 0.2);
        cam.updateProjectionMatrix();

        if (isBuildUp) {
            cam.position.x += (Math.random() - 0.5) * buildupFactor * 0.5;
            cam.position.y += (Math.random() - 0.5) * buildupFactor * 0.5;
        }

        // 3. Object Modulation
        group.children.forEach((obj, i) => {
          const mesh = obj as THREE.Mesh;
          const agent = mesh.userData;
          if (!agent) return;

          let localIntensity = 0;
          if (agent.freqIndex < 10) localIntensity = sub;
          else if (agent.freqIndex < 30) localIntensity = bass;
          else if (agent.freqIndex < 80) localIntensity = mid;
          else if (agent.freqIndex !== undefined) localIntensity = high;

          // CATALOG A GEOMETRY ANIMATIONS
          if (agent.isMengerPart) {
            mesh.rotation.x += 0.01;
            mesh.rotation.y += 0.01;
            if (isBeat) mesh.scale.setScalar(1.5);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isPillar) {
            mesh.scale.y = 1 + localIntensity * 10;
            mesh.position.y = -10 + (mesh.scale.y * (agent.baseH || 1) / 2);
          }
          else if (agent.isBlobPart) {
            const time = now * 0.001;
            mesh.position.x += Math.sin(time + (agent.phase || 0)) * 0.1;
            mesh.position.y += Math.cos(time + (agent.phase || 0)) * 0.1;
            if (isBeat) mesh.scale.setScalar(2);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isMatrixPart) {
            mesh.position.y -= 0.5 + high;
            if (mesh.position.y < -20) mesh.position.y = 20;
          }
          else if (agent.isLandPart) {
            mesh.scale.y = 1 + sub * 5;
          }
          else if (agent.isHyperRing) {
            mesh.rotation.x += 0.01 * (i % 3 + 1);
            mesh.rotation.z += 0.01;
            mesh.scale.setScalar(1 + mid * 0.5);
          }
          else if (agent.isRoom) {
            mesh.rotation.y += 0.005 * (i + 1);
            if (isBeat) mesh.scale.setScalar(1.1);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isMembrane) {
            mesh.position.z += Math.sin(now * 0.002 + i) * sub;
          }
          else if (agent.isRibbon) {
            mesh.rotation.z += 0.05 + high;
          }
          else if (agent.isCrystal) {
            mesh.rotation.x += 0.02;
            if (isSnare) mesh.scale.setScalar(2);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isVortexRing) {
            mesh.rotation.x = now * 0.001;
            mesh.scale.setScalar(1 + bass);
          }
          else if (agent.isCloud) {
            mesh.position.x += 0.05;
            if (mesh.position.x > 50) mesh.position.x = -50;
          }
          else if (agent.isHiveCell) {
            mesh.scale.z = 1 + localIntensity * 5;
          }
          else if (agent.isFractalPart) {
            mesh.rotation.y += 0.02;
            mesh.position.z = Math.sin(now * 0.001 + i) * 5;
          }
          else if (agent.isLavaPart) {
            mesh.position.y = -10 + Math.sin(now * 0.002 + i) * bass * 5;
          }

          // CATALOG B PHYSICS
          else if (agent.isVinyl) {
            mesh.position.y -= 0.1 + bass * 0.5;
            mesh.rotation.z += 0.05 + mid * 0.1;
            if (mesh.position.y < -30) mesh.position.y = 30;
          }
          else if (agent.isNode) {
            if (agent.driftVec) mesh.position.addScaledVector(agent.driftVec, 0.05);
            if (mesh.position.length() > 40 && agent.driftVec) agent.driftVec.negate();
            if (isSnare) mesh.scale.setScalar(2);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isBoid) {
            if (agent.velocity) {
                mesh.position.add(agent.velocity);
                mesh.lookAt(mesh.position.clone().add(agent.velocity));
                if (mesh.position.length() > 50) mesh.position.setScalar(0);
                if (isBeat) agent.velocity.add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.2), THREE.MathUtils.randFloatSpread(0.2), THREE.MathUtils.randFloatSpread(0.2)));
            }
          }
          else if (agent.isJelly) {
            mesh.scale.y = 1 + Math.sin(now * 0.005) * 0.2 + sub * 0.5;
            mesh.position.y += Math.sin(now * 0.002 + (agent.phase || 0)) * 0.1;
          }
          else if (agent.isVoxel) {
            const d = mesh.position.distanceTo(new THREE.Vector3(0,0,0));
            mesh.position.z = Math.sin(d * 0.5 - now * 0.005) * (sub * 10.0);
          }
          else if (agent.isIsland) {
            mesh.position.y += Math.sin(now * 0.001 + (agent.phase || 0)) * 0.05;
            mesh.rotation.y += 0.01;
          }
          else if (agent.isCoreLayer) {
            mesh.rotation.x += 0.01 * ((agent.layerIndex || 0) + 1) * (1 + bass);
            mesh.rotation.y += 0.015 * ((agent.layerIndex || 0) + 1);
            if (isBeat) mesh.scale.setScalar(1.1);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          
          // GAME PHYSICS
          else if (activeMode === 'pong') {
             if (agent.role === 'ball' && agent.vel) {
                 mesh.position.add(agent.vel);
                 if (mesh.position.y > 10 || mesh.position.y < -10) agent.vel.y *= -1;
                 if (mesh.position.x > 14 || mesh.position.x < -14) {
                     agent.vel.x *= -1;
                     agent.vel.multiplyScalar(1.05);
                     agent.vel.clampLength(0.2, 0.8);
                 }
                 if (isBeat) {
                     agent.vel.multiplyScalar(1.2);
                     mesh.scale.setScalar(1.5);
                 } else {
                     mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
                 }
             } else if (agent.role?.startsWith('paddle')) {
                 const ball = group.children.find(c => c.userData.role === 'ball');
                 if (ball) {
                     const targetY = ball.position.y;
                     const lag = 0.05 + (localIntensity * 0.1); 
                     mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, lag);
                     mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, -8, 8);
                 }
             }
          }
          else if (activeMode === 'invaders') {
              const time = now * 0.001;
              const xOffset = Math.sin(time) * 5;
              if (agent.gridPos) {
                mesh.position.x = ((agent.gridPos.x - 5) * 2) + xOffset;
                if (isBeat) mesh.position.y -= 0.5;
                if (mesh.position.y < -15) mesh.position.y = 15;
                mesh.position.y += Math.sin(time * 5 + agent.gridPos.x) * 0.2;
              }
              if (isSnare && Math.random() > 0.8) mesh.scale.y = 2;
              else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (activeMode === 'snake') {
              const time = now * 0.002;
              if (agent.role === 'head') {
                  mesh.position.x = Math.sin(time) * 10;
                  mesh.position.y = Math.cos(time * 0.5) * 8;
                  mesh.position.z = Math.sin(time * 1.5) * 5;
                  if (agent.history) {
                    agent.history.unshift(mesh.position.clone());
                    if (agent.history.length > 50) agent.history.pop();
                  }
              } else {
                  const head = group.children[0];
                  if (head && head.userData && head.userData.history && head.userData.history[agent.index || 0]) {
                      mesh.position.copy(head.userData.history[agent.index || 0]);
                  }
              }
              if (isBeat) mesh.scale.setScalar(1.2);
              else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (activeMode === 'pacman') {
              const time = now * 0.002;
              if (agent.role === 'pacman') {
                  mesh.position.x = Math.sin(time) * 12;
                  mesh.position.z = Math.cos(time) * 12;
                  if (agent.dir) mesh.lookAt(mesh.position.clone().add(agent.dir));
                  mesh.scale.y = 1 - Math.abs(Math.sin(now * 0.01)) * 0.5;
              } else if (agent.role === 'ghost') {
                  const pacman = group.children[0];
                  if (pacman) {
                      const dir = new THREE.Vector3().subVectors(pacman.position, mesh.position).normalize();
                      mesh.position.addScaledVector(dir, 0.15); 
                      mesh.lookAt(pacman.position);
                  }
              }
          }
          else if (activeMode === 'tetris') {
              mesh.position.y -= 0.05 + (sub * 0.2);
              if (mesh.position.y < -20) {
                  mesh.position.y = 20;
                  mesh.position.x = THREE.MathUtils.randFloatSpread(20);
              }
              if (isBeat) mesh.rotation.z += Math.PI / 2;
          }
          else if (activeMode === 'city') {
              if (agent.isBuilding) {
                  mesh.scale.y = 1 + (bass * 5);
                  mesh.position.y = (agent.baseY || 0) + (mesh.scale.y / 2);
              }
          }
          else {
              let targetScaleX = 1 + localIntensity * vj.distortionScale;
              let targetScaleY = 1 + localIntensity * vj.distortionScale;
              let targetScaleZ = 1 + localIntensity * vj.distortionScale;
              if (isBeat && agent.freqIndex < 20) {
                 targetScaleX *= 1.5; targetScaleY *= 1.5; targetScaleZ *= 1.5;
              }
              if (isSnare && agent.freqIndex > 80) targetScaleX *= 2.0;
              mesh.scale.lerp(new THREE.Vector3(targetScaleX, targetScaleY, targetScaleZ), 0.2);

              if (!agent.infiniteZ && !agent.infiniteY) {
                  const time = now * 0.001 * (agent.speed || 1);
                  const jitter = (high * 0.5) + (buildupFactor * 0.5);
                  if (agent.driftVec) {
                    mesh.position.addScaledVector(agent.driftVec, Math.sin(time + (agent.phase || 0)) * 0.02 * vj.motionIntensity);
                  }
                  if (jitter > 0.1) {
                     mesh.position.x += (Math.random() - 0.5) * jitter;
                     mesh.position.y += (Math.random() - 0.5) * jitter;
                     mesh.position.z += (Math.random() - 0.5) * jitter;
                  }
              }
          }

          // MATERIAL
          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            const baseHue = i % 2 === 0 ? vj.primaryHue : vj.secondaryHue;
            const activeHue = isBuildUp ? THREE.MathUtils.lerp(baseHue, 0, buildupFactor) : (baseHue + hueShift) % 360;
            const lightness = isBeat ? 0.7 : (0.4 + localIntensity * 0.4);
            mesh.material.color.setHSL(activeHue / 360, isBuildUp ? 1.0 : 0.8, lightness);
            mesh.material.opacity = flatness > 0.6 ? 0.2 + (Math.random() * 0.5) : 0.7; 
          }
        });

        rendererRef.current.render(sceneRef.current, cam);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, hasAudioAccess, sensitivity, vj, rollVJ, mode, isPlaying, onBPMChange, currentTime, photoUrl]);

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