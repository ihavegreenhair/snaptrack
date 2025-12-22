import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 'bars3d' | 'terrain' | 'cloud' | 'tunnel' | 'spheres' | 'vortex' | 'grid' | 'neural' | 'vj' | 'none';

interface Palette {
  name: string;
  primary: string;
  secondary: string;
  bg: string;
}

const PALETTES: Palette[] = [
  { name: 'Cyberpunk', primary: '#ff00ff', secondary: '#00ffff', bg: '#050005' },
  { name: 'Vaporwave', primary: '#ff71ce', secondary: '#01cdfe', bg: '#050005' },
  { name: 'Toxic', primary: '#39ff14', secondary: '#bcff00', bg: '#000500' },
  { name: 'DeepSea', primary: '#0077be', secondary: '#00f2ff', bg: '#000205' },
  { name: 'Inferno', primary: '#ff4500', secondary: '#ff8c00', bg: '#050000' }
];

interface VJState {
  mode: VisualizerMode;
  palette: Palette;
  complexity: number;
  rotationSpeed: number;
  motionIntensity: number;
  wireframe: boolean;
  shapeType: 'box' | 'sphere' | 'pyramid' | 'torus';
}

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
  onBPMChange?: (bpm: number) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5, onBPMChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // v4.0 Infinite VJ Engine State
  const [vj, setVj] = useState<VJState>({
    mode: 'grid',
    palette: PALETTES[0],
    complexity: 1,
    rotationSpeed: 1,
    motionIntensity: 1,
    wireframe: true,
    shapeType: 'box'
  });
  
  const [vibeFlash, setVibeFlash] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Pro VJ Brain State
  const energyHistory = useRef<number[]>([]);
  const beatHistory = useRef<number[]>([]);
  const beatCount = useRef(0);
  const lastBeatTime = useRef(0);
  const detectedBPM = useRef(120);
  const dropCooldown = useRef(0);

  // Three.js Core (Stable Layout)
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? vj.mode : mode;

  // 1. Audio Brain (Transient Analysis)
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

  // 2. The v4.0 Randomizer (Infinite Loop)
  const rollVJ = useCallback(() => {
    const modes: VisualizerMode[] = ['bars3d', 'terrain', 'cloud', 'tunnel', 'vortex', 'grid', 'neural', 'spheres'];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus')[] = ['box', 'sphere', 'pyramid', 'torus'];
    
    setVj({
      mode: modes[Math.floor(Math.random() * modes.length)],
      palette: PALETTES[Math.floor(Math.random() * PALETTES.length)],
      complexity: 0.5 + Math.random() * 2,
      rotationSpeed: 0.5 + Math.random() * 2.5,
      motionIntensity: 0.8 + Math.random() * 2,
      wireframe: Math.random() > 0.4,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)]
    });

    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 300);
  }, []);

  // 3. Three.js Life Cycle (Pro Engine)
  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
      
      // STABLE CAMERA: Set once and keep it fixed to avoid jitter
      camera.position.set(0, 0, 20);
      camera.lookAt(0, 0, 0);
    }

    const scene = sceneRef.current!;
    const group = meshGroupRef.current!;
    const camera = cameraRef.current!;
    
    // Cross-fade check: Instead of clearing instantly, we could implement a transition
    // For now, we clear but ensure objects are re-added in the same tick
    group.clear();

    // v4.0 Environment
    scene.background = new THREE.Color(vj.palette.bg);
    scene.fog = new THREE.FogExp2(new THREE.Color(vj.palette.bg), 0.015);

    const pMat = new THREE.MeshBasicMaterial({ color: vj.palette.primary, wireframe: vj.wireframe, transparent: true, opacity: 0.8 });
    const aMat = new THREE.MeshBasicMaterial({ color: vj.palette.secondary, wireframe: true, transparent: true, opacity: 0.4 });

    const getGeo = (size = 1) => {
      if (vj.shapeType === 'box') return new THREE.BoxGeometry(size, size, size);
      if (vj.shapeType === 'sphere') return new THREE.SphereGeometry(size * 0.6, 16, 16);
      if (vj.shapeType === 'pyramid') return new THREE.ConeGeometry(size * 0.6, size, 4);
      return new THREE.TorusGeometry(size * 0.5, size * 0.2, 8, 24);
    };

    if (activeMode === 'bars3d') {
      for (let i = 0; i < 64; i++) {
        const mesh = new THREE.Mesh(getGeo(0.5), pMat.clone());
        const angle = (i / 64) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 12, 0, Math.sin(angle) * 12);
        group.add(mesh);
      }
    } else if (activeMode === 'terrain') {
      const grid = new THREE.GridHelper(150, 50, vj.palette.primary, vj.palette.secondary);
      grid.rotation.x = Math.PI / 2.2;
      group.add(grid);
    } else if (activeMode === 'cloud') {
      for (let i = 0; i < 300; i++) {
        const mesh = new THREE.Mesh(getGeo(0.2), i % 2 === 0 ? pMat : aMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(50));
        group.add(mesh);
      }
    } else if (activeMode === 'grid') {
      const helper = new THREE.GridHelper(200, 60, vj.palette.primary, vj.palette.secondary);
      helper.position.y = -8;
      group.add(helper);
    } else if (activeMode === 'neural') {
      for (let i = 0; i < 120; i++) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), pMat);
        node.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        group.add(node);
      }
    } else if (activeMode === 'tunnel') {
      for (let i = 0; i < 40; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(i * 0.8, 0.08, 16, 64), aMat);
        ring.position.z = -i * 4;
        group.add(ring);
      }
    } else if (activeMode === 'vortex') {
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(8, 2.5, 150, 20), pMat);
      group.add(knot);
    }

    camera.updateProjectionMatrix();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      rendererRef.current?.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode, vj]);

  // 4. v4.0 Stable Animation Loop
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      let bass = 0, mid = 0, high = 0, avg = 0, isBeat = false;
      
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        let bSum = 0, mSum = 0, hSum = 0;
        for (let i = 0; i < 12; i++) bSum += d[i];
        for (let i = 12; i < 90; i++) mSum += d[i];
        for (let i = 90; i < 180; i++) hSum += d[i];
        
        bass = (bSum / 12 / 255) * sensitivity;
        mid = (mSum / 78 / 255) * sensitivity;
        high = (hSum / 90 / 255) * sensitivity;
        avg = (bass + mid + high) / 3;

        // Peak Analysis
        energyHistory.current.push(avg);
        if (energyHistory.current.length > 50) energyHistory.current.shift();
        const lAvg = energyHistory.current.reduce((a, b) => a + b, 0) / energyHistory.current.length;
        
        if (avg > lAvg * 1.15 && avg > 0.15 && now - lastBeatTime.current > 280) {
          isBeat = true;
          const interval = now - lastBeatTime.current;
          lastBeatTime.current = now;
          beatCount.current++;
          
          if (interval > 300 && interval < 1000) {
            const bpm = 60000 / interval;
            beatHistory.current.push(bpm);
            if (beatHistory.current.length > 10) beatHistory.current.shift();
            const aBPM = Math.round(beatHistory.current.reduce((a,b)=>a+b,0)/beatHistory.current.length);
            if (aBPM !== detectedBPM.current) {
              detectedBPM.current = aBPM;
              onBPMChange?.(aBPM);
            }
          }

          if (mode === 'vj' && beatCount.current % 16 === 0) rollVJ();
        }

        // Drop Check
        if (avg > lAvg * 1.8 && now > dropCooldown.current) {
          rollVJ();
          dropCooldown.current = now + 6000;
        }
      } else {
        avg = isPlaying ? 0.2 + Math.sin(now * 0.001) * 0.1 : 0;
        bass = avg * 1.2;
      }

      // --- v4.0 Stable Render Logic ---
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const cam = cameraRef.current;

        // DAMPED OBJECT MOTION (Not Camera)
        group.rotation.y += (0.004 + mid * 0.02) * vj.rotationSpeed;
        group.rotation.z += 0.001;

        // Smoothly return scale
        const targetScale = 1 + (isBeat ? (0.1 * vj.motionIntensity) : 0);
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        // Object-space beat jump (y-axis movement)
        if (isBeat) {
          group.position.y = (Math.random() - 0.5) * 0.5 * vj.motionIntensity;
        } else {
          group.position.y *= 0.9;
        }

        // Module Specifics
        if (activeMode === 'bars3d') {
          group.children.forEach((mesh, i) => {
            const m = mesh as THREE.Mesh;
            const h = (dataArrayRef.current?.[i * 3] || 0) / 255 * 20 * vj.motionIntensity;
            m.scale.y = THREE.MathUtils.lerp(m.scale.y, Math.max(h, 0.1), 0.2);
            m.position.y = m.scale.y / 2;
          });
        } else if (activeMode === 'tunnel') {
          group.children.forEach((mesh) => {
            mesh.position.z += (0.3 + high * 0.8) * vj.rotationSpeed;
            if (mesh.position.z > 25) mesh.position.z = -100;
          });
        } else if (activeMode === 'terrain') {
          group.position.z = (group.position.z + 0.5 + bass) % 150;
        }

        rendererRef.current.render(sceneRef.current, cam);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, isPlaying, hasAudioAccess, sensitivity, vj, rollVJ, onBPMChange, mode]);

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