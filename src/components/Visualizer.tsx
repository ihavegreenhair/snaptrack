import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 'bars3d' | 'terrain' | 'cloud' | 'tunnel' | 'spheres' | 'vortex' | 'grid' | 'neural' | 'vj' | 'none';

interface VJState {
  mode: VisualizerMode;
  primaryHue: number;
  secondaryHue: number;
  bgHue: number;
  complexity: number;
  rotationSpeed: number;
  zoomScale: number;
  fov: number;
  wireframe: boolean;
  shapeType: 'box' | 'sphere' | 'pyramid' | 'torus';
  camBehavior: 'orbital' | 'fly' | 'static';
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
  
  // VJ Engine State
  const [vj, setVj] = useState<VJState>({
    mode: 'grid',
    primaryHue: 280,
    secondaryHue: 200,
    bgHue: 280,
    complexity: 1,
    rotationSpeed: 1,
    zoomScale: 1,
    fov: 75,
    wireframe: true,
    shapeType: 'box',
    camBehavior: 'orbital'
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

  // Three.js Core
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? vj.mode : mode;

  // 1. Audio Initialization
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

  // 2. Modular Randomizer Logic
  const rollVJ = useCallback(() => {
    const modes: VisualizerMode[] = ['bars3d', 'terrain', 'cloud', 'tunnel', 'vortex', 'grid', 'neural', 'spheres'];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus')[] = ['box', 'sphere', 'pyramid', 'torus'];
    const behaviors: ('orbital' | 'fly' | 'static')[] = ['orbital', 'fly', 'static'];
    
    const h = Math.random() * 360;
    setVj({
      mode: modes[Math.floor(Math.random() * modes.length)],
      primaryHue: h,
      secondaryHue: (h + 120 + Math.random() * 60) % 360,
      bgHue: (h + 180) % 360,
      complexity: 0.5 + Math.random() * 2,
      rotationSpeed: 0.5 + Math.random() * 2,
      zoomScale: 0.8 + Math.random() * 1.5,
      fov: 60 + Math.random() * 40,
      wireframe: Math.random() > 0.4,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)],
      camBehavior: behaviors[Math.floor(Math.random() * behaviors.length)]
    });

    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 300);
  }, []);

  // 3. Three.js Life Cycle
  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(vj.fov, window.innerWidth / window.innerHeight, 0.1, 2000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
    }

    const scene = sceneRef.current!;
    const group = meshGroupRef.current!;
    const camera = cameraRef.current!;
    group.clear();

    // Scene Environment
    scene.fog = new THREE.FogExp2(new THREE.Color(`hsl(${vj.bgHue}, 20%, 5%)`), 0.02);

    // Build Geometry based on Mode
    const pMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${vj.primaryHue}, 100%, 50%)`), wireframe: vj.wireframe, transparent: true, opacity: 0.8 });
    const aMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(`hsl(${vj.secondaryHue}, 100%, 50%)`), wireframe: true, transparent: true, opacity: 0.4 });

    const getGeo = (size = 1) => {
      if (vj.shapeType === 'box') return new THREE.BoxGeometry(size, size, size);
      if (vj.shapeType === 'sphere') return new THREE.SphereGeometry(size * 0.6, 12, 12);
      if (vj.shapeType === 'pyramid') return new THREE.ConeGeometry(size * 0.6, size, 4);
      return new THREE.TorusGeometry(size * 0.5, size * 0.2, 8, 24);
    };

    if (activeMode === 'bars3d') {
      for (let i = 0; i < 64; i++) {
        const mesh = new THREE.Mesh(getGeo(0.5), pMat.clone());
        const angle = (i / 64) * Math.PI * 2;
        mesh.position.set(Math.cos(angle) * 10, 0, Math.sin(angle) * 10);
        group.add(mesh);
      }
    } else if (activeMode === 'terrain') {
      const grid = new THREE.GridHelper(100, 40, pMat.color, aMat.color);
      grid.rotation.x = Math.PI / 2;
      group.add(grid);
    } else if (activeMode === 'cloud') {
      for (let i = 0; i < 200; i++) {
        const mesh = new THREE.Mesh(getGeo(0.3), i % 2 === 0 ? pMat : aMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        group.add(mesh);
      }
    } else if (activeMode === 'grid') {
      const helper = new THREE.GridHelper(200, 50, pMat.color, aMat.color);
      helper.position.y = -5;
      group.add(helper);
    } else if (activeMode === 'neural') {
      for (let i = 0; i < 100; i++) {
        const node = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), pMat);
        node.position.set(THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30));
        group.add(node);
      }
    } else if (activeMode === 'tunnel') {
      for (let i = 0; i < 30; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(i * 0.7, 0.05, 12, 40), aMat);
        ring.position.z = -i * 3;
        group.add(ring);
      }
    } else if (activeMode === 'vortex') {
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(10, 3, 100, 16), pMat);
      group.add(knot);
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
  }, [activeMode, vj]);

  // 4. Main Animation Loop
  useEffect(() => {
    const animate = () => {
      // --- Audio Brain ---
      let bass = 0, mid = 0, high = 0, avg = 0, isBeat = false;
      
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        let bSum = 0, mSum = 0, hSum = 0;
        for (let i = 0; i < 10; i++) bSum += d[i];
        for (let i = 10; i < 80; i++) mSum += d[i];
        for (let i = 80; i < 150; i++) hSum += d[i];
        
        bass = (bSum / 10 / 255) * sensitivity;
        mid = (mSum / 70 / 255) * sensitivity;
        high = (hSum / 70 / 255) * sensitivity;
        avg = (bass + mid + high) / 3;

        energyHistory.current.push(avg);
        if (energyHistory.current.length > 40) energyHistory.current.shift();
        const lAvg = energyHistory.current.reduce((a, b) => a + b, 0) / energyHistory.current.length;
        
        const now = Date.now();
        if (avg > lAvg * 1.2 && avg > 0.2 && now - lastBeatTime.current > 300) {
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
      } else {
        avg = isPlaying ? 0.3 + Math.sin(Date.now() * 0.002) * 0.1 : 0;
        bass = avg * 1.2;
      }

      // --- 3D Render ---
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const cam = cameraRef.current;

        // Global Camera Behavior
        if (vj.camBehavior === 'orbital') {
          cam.position.x = Math.sin(Date.now() * 0.0005) * (20 + avg * 10);
          cam.position.z = Math.cos(Date.now() * 0.0005) * (20 + avg * 10);
          cam.lookAt(0, 0, 0);
        } else if (vj.camBehavior === 'fly') {
          cam.position.z -= 0.1;
          if (cam.position.z < -50) cam.position.z = 20;
        }

        if (isBeat) {
          cam.position.y += (Math.random() - 0.5) * 2;
          cam.fov = vj.fov + bass * 20;
          cam.updateProjectionMatrix();
        } else {
          cam.position.y *= 0.9;
          cam.fov += (vj.fov - cam.fov) * 0.1;
          cam.updateProjectionMatrix();
        }

        // Module Specific Animation
        group.rotation.y += 0.005 * vj.rotationSpeed;
        
        if (activeMode === 'bars3d') {
          group.children.forEach((mesh, i) => {
            const m = mesh as THREE.Mesh;
            const h = (dataArrayRef.current?.[i * 2] || 0) / 255 * 15 * vj.zoomScale;
            m.scale.y = Math.max(h, 0.1);
            m.position.y = m.scale.y / 2;
          });
        } else if (activeMode === 'cloud') {
          group.children.forEach((mesh, i) => {
            mesh.position.y += Math.sin(Date.now() * 0.001 + i) * 0.02;
            if (isBeat) mesh.scale.setScalar(1.5 * vj.complexity);
            else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          });
        } else if (activeMode === 'tunnel') {
          group.children.forEach((mesh) => {
            mesh.position.z += 0.2 + high * 0.5;
            if (mesh.position.z > 10) mesh.position.z = -80;
            mesh.rotation.z += 0.01;
          });
        } else if (activeMode === 'grid') {
          group.position.y = -5 + bass * 5;
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
      {vibeFlash && <div className="absolute inset-0 bg-white/40 z-50 animate-out fade-out duration-500" />}
    </div>
  );
};

export default Visualizer;
