import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { useSongMapper } from '@/hooks/useSongMapper';

export type VisualizerMode = 
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
  rotationSpeed: number;
  motionIntensity: number;
  distortion: number;
  colorCycle: number;
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
  
  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('shapes');
  const [vibeFlash, setVibeFlash] = useState(false);

  const [vj, setVj] = useState<VJState>({
    mode: 'shapes',
    pColor: new THREE.Color(PALETTES[0].p),
    sColor: new THREE.Color(PALETTES[0].s),
    primaryHue: PALETTES[0].ph,
    secondaryHue: PALETTES[0].sh,
    complexity: 1,
    rotationSpeed: 1.0, 
    motionIntensity: 1.0, 
    distortion: 1,
    colorCycle: 0,
    wireframe: true,
    shapeType: 'box',
    fov: 75
  });

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

  // VJ Brain
  const rollVJ = useCallback(() => {
    const modes: VisualizerMode[] = [
      'shapes', 'neural', 'rings', 'core3d', 'trees', 'platonic', 'helix', 'flower', 'starfield',
      'crystal', 'voxels', 'fibonacci', 'galaxy', 'ribbons', 'swarm', 'rubik', 'islands', 'circuit', 'rain', 'pulse'
    ];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron')[] = ['box', 'sphere', 'pyramid', 'torus', 'icosahedron'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    setCurrentVibe(modes[Math.floor(Math.random() * modes.length)]);
    setVj(prev => ({
      ...prev,
      pColor: new THREE.Color(p.p),
      sColor: new THREE.Color(p.s),
      primaryHue: p.ph,
      secondaryHue: p.sh,
      complexity: 0.5 + Math.random() * 2.0,
      rotationSpeed: 0.5 + Math.random() * 2.0,
      motionIntensity: 0.8 + Math.random() * 1.5,
      wireframe: Math.random() > 0.3,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)],
      fov: 60 + Math.random() * 40
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

  // Audio cortex init
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

  // Black Screen Watchdog
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;
    const checkVisibility = () => {
      if (!rendererRef.current) return;
      const gl = rendererRef.current.getContext();
      const pixel = new Uint8Array(4);
      gl.readPixels(gl.drawingBufferWidth / 2, gl.drawingBufferHeight / 2, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
      if (brightness < 2) {
        blackoutCounter.current++;
        if (blackoutCounter.current >= 3) {
          rollVJ();
          blackoutCounter.current = 0;
        }
      } else {
        blackoutCounter.current = 0;
      }
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

    if (activeMode === 'shapes') {
      for (let i = 0; i < 100; i++) {
        const mesh = new THREE.Mesh(getGeo(Math.random() * 2), i % 2 === 0 ? pMat : aMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60));
        group.add(mesh);
      }
    } else if (activeMode === 'neural' || activeMode === 'swarm') {
      const count = activeMode === 'neural' ? 150 : 400;
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), pMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(50));
        group.add(mesh);
      }
    } else if (activeMode === 'rings' || activeMode === 'pulse') {
      for (let i = 0; i < 25; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(i * 2, 0.1, 16, 100), aMat);
        group.add(ring);
      }
    } else if (activeMode === 'fibonacci') {
      for (let i = 0; i < 200; i++) {
        const t = i * 0.1;
        const r = 2 * Math.sqrt(i);
        const mesh = new THREE.Mesh(getGeo(0.5), pMat);
        mesh.position.set(Math.cos(t) * r, Math.sin(t) * r, i * 0.1 - 10);
        group.add(mesh);
      }
    } else if (activeMode === 'voxels') {
      for (let x = -5; x < 5; x++) {
        for (let z = -5; z < 5; z++) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 1.8), pMat);
          mesh.position.set(x * 2, -10, z * 2);
          group.add(mesh);
        }
      }
    } else if (activeMode === 'helix') {
      for (let i = 0; i < 150; i++) {
        const t = i * 0.2;
        const m1 = new THREE.Mesh(new THREE.SphereGeometry(0.4), pMat);
        const m2 = new THREE.Mesh(new THREE.SphereGeometry(0.4), aMat);
        m1.position.set(Math.sin(t) * 6, t * 2 - 15, Math.cos(t) * 6);
        m2.position.set(Math.sin(t + Math.PI) * 6, t * 2 - 15, Math.cos(t + Math.PI) * 6);
        group.add(m1, m2);
      }
    } else if (activeMode === 'rain') {
      for (let i = 0; i < 300; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2, 0.1), aMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100));
        group.add(mesh);
      }
    } else {
      for (let i = 0; i < 50; i++) {
        const mesh = new THREE.Mesh(getGeo(2), pMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
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
  }, [activeMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe, vj.fov]);

  // Animation Loop
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
          rollVJ(); dropCooldown.current = now + 5000;
          if (currentTime) recordCue(currentTime, 'DROP');
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
            onBPMChange?.(Math.round(bpmHistory.current.reduce((a,b)=>a+b,0)/bpmHistory.current.length));
          }
          if (mode === 'vj' && beatCount.current % 16 === 0) {
            rollVJ();
            if (currentTime) recordCue(currentTime, 'BUILD');
          }
        }

        if (beatCount.current > 0 && beatCount.current % 128 === 0) {
          saveMap(120);
        }
      } else {
        avg = isPlaying ? 0.3 + Math.sin(now * 0.002) * 0.1 : 0;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const cam = cameraRef.current;
        const hueShift = (now * 0.02) % 360;

        group.rotation.y += 0.005 * vj.rotationSpeed;
        group.rotation.x += 0.002 * vj.rotationSpeed;

        group.children.forEach((obj, i) => {
          const mesh = obj as THREE.Mesh;
          if (activeMode === 'voxels') {
            const freq = dataArrayRef.current?.[i % 128] || 0;
            mesh.scale.y = THREE.MathUtils.lerp(mesh.scale.y, 1 + (freq / 255) * 20, 0.1);
            mesh.position.y = -10 + mesh.scale.y / 2;
          } else if (activeMode === 'rain') {
            mesh.position.y -= 0.5 + (bass * 2.0);
            if (mesh.position.y < -50) mesh.position.y = 50;
          } else if (activeMode === 'pulse') {
            mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, 1 + bass * 5, 0.1));
          } else {
            if (isBeat) mesh.scale.setScalar(1.2 + bass);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }

          if (i % 5 === 0 && mesh.material instanceof THREE.MeshBasicMaterial) {
            mesh.material.color.setHSL((vj.primaryHue + hueShift) / 360, 0.8, 0.5 + avg * 0.3);
          }
        });

        const t = now * 0.0005;
        cam.position.x = Math.sin(t) * 15.0;
        cam.position.y = Math.cos(t * 0.7) * 10.0;
        cam.lookAt(0, 0, 0);
        cam.fov = THREE.MathUtils.lerp(cam.fov, isBeat ? vj.fov + 15 : vj.fov, 0.2);
        cam.updateProjectionMatrix();

        rendererRef.current.render(sceneRef.current, cam);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, hasAudioAccess, sensitivity, vj, rollVJ, mode, isPlaying, onBPMChange, currentTime, recordCue, saveMap]);

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