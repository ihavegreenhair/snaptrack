import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { useSongMapper } from '@/hooks/useSongMapper';

export type VisualizerMode = 
  | 'menger' | 'columns' | 'blob' | 'lattice' | 'city' | 'landmass' | 'gyroid' | 'tunnel' | 'lava' | 'matrix' | 'rooms' | 'bulb' 
  | 'shapes' | 'vortex' | 'neural' | 'rings' | 'core3d' | 'cloud' | 'trees' | 'platonic' | 'helix' | 'flower' | 'starfield'
  | 'crystal' | 'voxels' | 'fibonacci' | 'galaxy' | 'ribbons' | 'swarm' | 'rubik' | 'islands' | 'circuit' | 'rain' | 'pulse'
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
  const { activeMap, recordCue, saveMap } = useSongMapper(videoId);
  
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
  const energyHistory = useRef<number[]>([]);
  const beatCount = useRef(0);
  const lastBeatTime = useRef(0);
  const energyBuffer = useRef<number[]>([]);
  const dropCooldown = useRef(0);
  const blackoutCounter = useRef(0);
  const bpmHistory = useRef<number[]>([]);

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
    const modes = [...shaderModes, ...meshModes];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron')[] = ['box', 'sphere', 'pyramid', 'torus', 'icosahedron'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    // Bias objectCount toward lower numbers (20 to 200)
    // Math.pow(random, 2) makes smaller numbers much more likely
    const weightedCount = Math.floor(20 + Math.pow(Math.random(), 2) * 180);

    setCurrentVibe(modes[Math.floor(Math.random() * modes.length)]);
    setVj(prev => ({
      ...prev,
      pColor: new THREE.Color(p.p),
      sColor: new THREE.Color(p.s),
      primaryHue: p.ph,
      secondaryHue: p.sh,
      complexity: 0.5 + Math.random() * 2.5,
      objectCount: weightedCount,
      rotationSpeed: 0.2 + Math.random() * 2.0,
      motionIntensity: 0.5 + Math.random() * 2.0,
      distortionScale: 0.5 + Math.random() * 3.0,
      individualDamping: 0.02 + Math.random() * 0.2,
      wireframe: Math.random() > 0.3,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)],
      fov: 50 + Math.random() * 60
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

    const getGeo = (size = 1) => {
      if (vj.shapeType === 'box') return new THREE.BoxGeometry(size, size, size);
      if (vj.shapeType === 'sphere') return new THREE.SphereGeometry(size * 0.6, 12, 12);
      if (vj.shapeType === 'pyramid') return new THREE.ConeGeometry(size * 0.6, size, 4);
      if (vj.shapeType === 'icosahedron') return new THREE.IcosahedronGeometry(size, 0);
      return new THREE.TorusGeometry(size * 0.5, size * 0.2, 8, 24);
    };

    // --- Autonomous Agent Factory ---
    const count = vj.objectCount;
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(getGeo(0.5 + Math.random() * 1.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
      
      // Assign unique autonomous properties
      mesh.userData = {
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2.0,
        freqIndex: Math.floor(Math.random() * 128),
        orbitRadius: 10 + Math.random() * 30,
        driftVec: new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1))
      };

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
      
      group.add(mesh);
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
  }, [activeMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe, vj.fov, vj.complexity]);

  // Animation Engine
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      let bass = 0, mid = 0, high = 0, avg = 0, isBeat = false;
      
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        let bSum=0, mSum=0, hSum=0;
        for(let i=0; i<12; i++) bSum += d[i];
        for(let i=12; i<90; i++) mSum += d[i];
        for(let i=90; i<180; i++) hSum += d[i];
        
        bass = (bSum / 12 / 255) * sensitivity;
        mid = (mSum / 78 / 255) * sensitivity;
        high = (hSum / 90 / 255) * sensitivity;
        avg = (bass + mid + high) / 3;

        energyBuffer.current.push(avg);
        if (energyBuffer.current.length > 50) energyBuffer.current.shift();
        const lAvg = energyBuffer.current.reduce((a,b)=>a+b,0)/energyBuffer.current.length;
        
        if ((avg - lAvg) > 0.4 && avg > 0.5 && now > dropCooldown.current) {
          rollVJ(); 
          if (currentTime) recordCue(currentTime, 'DROP');
          dropCooldown.current = now + 5000;
        }

        energyHistory.current.push(avg);
        if (energyHistory.current.length > 40) energyHistory.current.shift();
        const avgHist = energyHistory.current.reduce((a, b) => a + b, 0) / energyHistory.current.length;
        
        if (avg > avgHist * 1.15 && avg > 0.1 && now - lastBeatTime.current > 250) {
          isBeat = true; 
          const interval = now - lastBeatTime.current;
          lastBeatTime.current = now; 
          beatCount.current++;
          
          if (interval > 250 && interval < 1200) {
            const bpm = Math.round(60000 / interval);
            bpmHistory.current.push(bpm);
            if (bpmHistory.current.length > 15) bpmHistory.current.shift();
            const smoothedBPM = Math.round(bpmHistory.current.reduce((a,b)=>a+b,0)/bpmHistory.current.length);
            onBPMChange?.(smoothedBPM);
          }
          
          if (mode === 'vj' && beatCount.current % 16 === 0) {
            rollVJ();
            if (currentTime) recordCue(currentTime, 'BUILD');
          }
        }

        // Periodically save mapping
        if (beatCount.current > 0 && beatCount.current % 128 === 0) {
          const avgBPM = bpmHistory.current.length > 0 
            ? Math.round(bpmHistory.current.reduce((a,b)=>a+b,0)/bpmHistory.current.length) 
            : 120;
          saveMap(avgBPM);
        }
      } else {
        avg = isPlaying ? 0.3 + Math.sin(now * 0.002) * 0.1 : 0;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const cam = cameraRef.current;
        const hueShift = (now * 0.02) % 360;

        // Kinematics (Slow global drift)
        group.rotation.y += 0.001 * vj.rotationSpeed;

        group.children.forEach((obj, i) => {
          const mesh = obj as THREE.Mesh;
          const agent = mesh.userData;
          const localFreq = dataArrayRef.current?.[agent.freqIndex] || 0;
          const localIntensity = (localFreq / 255) * sensitivity;

          // 1. Independent Axis Distortion
          const scaleX = 1 + (localIntensity * 2.0 * vj.distortionScale);
          const scaleY = 1 + (bass * 3.0 * vj.distortionScale);
          const scaleZ = 1 + (mid * 1.5 * vj.distortionScale);
          
          if (isBeat) {
            mesh.scale.set(scaleX * 1.2, scaleY * 1.2, scaleZ * 1.2);
          } else {
            mesh.scale.lerp(new THREE.Vector3(scaleX, scaleY, scaleZ), vj.individualDamping);
          }

          // 2. Independent Movement (Floating Drift)
          const time = now * 0.001 * agent.speed;
          mesh.position.addScaledVector(agent.driftVec, Math.sin(time + agent.phase) * 0.05 * vj.motionIntensity);
          mesh.rotation.x += 0.01 * agent.speed * vj.rotationSpeed;

          // 3. Mode-Specific Agent Logic
          if (activeMode === 'voxels') {
            mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, 1 + localIntensity * 20, 0.1);
            mesh.position.y = -10 + mesh.scale.y / 2;
          } else if (activeMode === 'rings') {
            mesh.rotation.z += 0.01 * (i % 2 === 0 ? 1 : -1) * vj.rotationSpeed;
            mesh.scale.setScalar(1 + bass * 2.0);
          }

          // 4. Color Morphing
          if (i % 3 === 0 && mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.color.setHSL((vj.primaryHue + hueShift + (i * 2)) / 360, 0.8, 0.4 + localIntensity * 0.4);
          }
        });

        // Cinematic Drone Camera
        const t = now * 0.0003;
        cam.position.x = Math.sin(t) * 25.0;
        cam.position.y = Math.cos(t * 0.8) * 15.0;
        cam.lookAt(0, 0, 0);
        cam.fov = THREE.MathUtils.lerp(cam.fov, isBeat ? vj.fov + (avg * 20) : vj.fov, 0.1);
        cam.updateProjectionMatrix();

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
