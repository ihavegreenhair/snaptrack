import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 'bars' | 'waves' | 'particles' | 'tunnel' | 'spheres' | 'vortex' | 'grid' | 'neural' | 'kaleidoscope' | 'starfield' | 'vj' | 'none';

interface VJConfig {
  mode: VisualizerMode;
  complexity: number;
  rotationSpeed: number;
  zoomScale: number;
  colorShift: number;
  symmetry: number; // For kaleidoscope
  particleSize: number;
  fov: number;
  wireframe: boolean;
  intensity: number;
}

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  
  // Infinite VJ State
  const [vjConfig, setVjConfig] = useState<VJConfig>({
    mode: 'grid',
    complexity: 1,
    rotationSpeed: 1,
    zoomScale: 1,
    colorShift: 0,
    symmetry: 6,
    particleSize: 1,
    fov: 75,
    wireframe: true,
    intensity: 1
  });
  
  const [vibeFlash, setVibeFlash] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Advanced Beat Detection
  const energyHistory = useRef<number[]>([]);
  const beatThreshold = useRef(1.2);
  const audioState = useRef({
    bass: 0,
    mid: 0,
    high: 0,
    avg: 0,
    beat: false,
    kick: false
  });

  // Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? vjConfig.mode : mode;

  // 1. Audio Analysis Upgrade
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;

    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 512;
          analyserRef.current.smoothingTimeConstant = 0.8;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }

        if (!sourceRef.current && analyserRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyserRef.current);
          setHasAudioAccess(true);
        }
      } catch (err) {
        setHasAudioAccess(false);
      }
    };

    initAudio();
  }, [mode, isPlaying]);

  // 2. The Infinite Randomizer (VJ Brain)
  useEffect(() => {
    if (mode !== 'vj') return;

    const modes: VisualizerMode[] = ['grid', 'neural', 'tunnel', 'vortex', 'particles', 'waves', 'kaleidoscope', 'starfield', 'spheres', 'bars'];
    
    const rollDice = () => {
      const selectedMode = modes[Math.floor(Math.random() * modes.length)];
      
      setVjConfig({
        mode: selectedMode,
        complexity: 0.5 + Math.random() * 2.5,
        rotationSpeed: 0.2 + Math.random() * 3,
        zoomScale: 0.5 + Math.random() * 2,
        colorShift: Math.random() * 360,
        symmetry: Math.floor(Math.random() * 10) + 4,
        particleSize: 0.5 + Math.random() * 3,
        fov: 60 + Math.random() * 60,
        wireframe: Math.random() > 0.3,
        intensity: 0.8 + Math.random() * 1.5
      });

      setVibeFlash(true);
      setTimeout(() => setVibeFlash(false), 300);
    };

    rollDice(); // Initial roll
    const interval = window.setInterval(rollDice, 12000); 
    return () => clearInterval(interval);
  }, [mode]);

  // 3. Three.js Engine Lifecycle
  useEffect(() => {
    if (activeMode === 'none') return;
    const is3D = ['tunnel', 'spheres', 'vortex', 'grid', 'neural', 'starfield'].includes(activeMode);
    
    if (!is3D) {
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (containerRef.current?.contains(rendererRef.current.domElement)) {
          containerRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current = null;
      }
      return;
    }

    if (!rendererRef.current && containerRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(vjConfig.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
    }

    if (cameraRef.current) {
      cameraRef.current.fov = vjConfig.fov;
      cameraRef.current.updateProjectionMatrix();
    }

    if (meshGroupRef.current) {
      const group = meshGroupRef.current;
      group.clear();
      const pColor = new THREE.Color(`hsl(${vjConfig.colorShift}, 100%, 50%)`);
      const aColor = new THREE.Color(`hsl(${(vjConfig.colorShift + 120) % 360}, 100%, 50%)`);

      if (activeMode === 'grid') {
        const grid = new THREE.GridHelper(200, 50, pColor, aColor);
        grid.rotation.x = Math.PI / 2;
        group.add(grid);
      } else if (activeMode === 'neural') {
        const count = Math.floor(100 * vjConfig.complexity);
        for (let i = 0; i < count; i++) {
          const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.05, 8, 8),
            new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? pColor : aColor })
          );
          sphere.position.set(THREE.MathUtils.randFloatSpread(25), THREE.MathUtils.randFloatSpread(25), THREE.MathUtils.randFloatSpread(25));
          group.add(sphere);
        }
      } else if (activeMode === 'tunnel') {
        const rings = Math.floor(20 * vjConfig.complexity);
        for (let i = 0; i < rings; i++) {
          const torus = new THREE.Mesh(
            new THREE.TorusGeometry(i * 0.8, 0.05 * vjConfig.particleSize, 16, 50),
            new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.4, wireframe: vjConfig.wireframe })
          );
          torus.position.z = -i * 3;
          group.add(torus);
        }
      } else if (activeMode === 'starfield') {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const count = Math.floor(2000 * vjConfig.complexity);
        for (let i = 0; i < count; i++) {
          vertices.push(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100));
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        group.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 * vjConfig.particleSize })));
      }
    }

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode, vjConfig]);

  // 4. Pro Animation Engine
  useEffect(() => {
    const canvas2D = canvas2DRef.current;
    const ctx = canvas2D?.getContext('2d');
    let lastBeatTime = 0;

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // --- Audio Brain Processing ---
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const data = dataArrayRef.current;
        
        let b = 0, m = 0, hi = 0;
        for (let i = 0; i < 8; i++) b += data[i];
        for (let i = 8; i < 64; i++) m += data[i];
        for (let i = 64; i < 128; hi += data[i++]);
        
        const currentAvg = (b / 8 + m / 56 + hi / 64) / 3;
        
        // Advanced Peak Detection
        energyHistory.current.push(currentAvg);
        if (energyHistory.current.length > 20) energyHistory.current.shift();
        
        const localAvg = energyHistory.current.reduce((acc, v) => acc + v, 0) / energyHistory.current.length;
        const isBeat = currentAvg > localAvg * beatThreshold.current && currentAvg > 30;
        const now = Date.now();

        audioState.current = {
          bass: (b / 8 / 255) * sensitivity * vjConfig.intensity,
          mid: (m / 56 / 255) * sensitivity * vjConfig.intensity,
          high: (hi / 64 / 255) * sensitivity * vjConfig.intensity,
          avg: (currentAvg / 255) * sensitivity * vjConfig.intensity,
          beat: isBeat && (now - lastBeatTime > 250),
          kick: b/8 > 180
        };

        if (audioState.current.beat) lastBeatTime = now;
      } else {
        // Fallback Simulation
        const t = Date.now() * 0.002;
        audioState.current.avg = isPlaying ? 0.3 + Math.sin(t) * 0.1 : 0;
        audioState.current.bass = audioState.current.avg * 1.3;
        audioState.current.beat = Math.sin(t * 4) > 0.95;
      }

      const { avg, bass, mid, high, beat } = audioState.current;

      // --- 2D Rendering ---
      if (ctx && canvas2D) {
        canvas2D.width = w * window.devicePixelRatio;
        canvas2D.height = h * window.devicePixelRatio;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        
        if (['bars', 'waves', 'kaleidoscope', 'particles'].includes(activeMode)) {
          ctx.clearRect(0, 0, w, h);
          const pCol = `hsl(${vjConfig.colorShift}, 80%, 60%)`;
          const aCol = `hsl(${(vjConfig.colorShift + 180) % 360}, 80%, 60%)`;

          if (activeMode === 'bars') {
            const count = Math.floor(64 * vjConfig.complexity);
            const step = w / count;
            for (let i = 0; i < count; i++) {
              const h_val = (i < count/4 ? bass : i < count/2 ? mid : high) * h * 0.7 * vjConfig.zoomScale;
              ctx.fillStyle = i % 2 === 0 ? pCol : aCol;
              ctx.globalAlpha = 0.4 + avg * 0.6;
              ctx.fillRect(i * step, h - h_val, step - 2, h_val);
            }
          } else if (activeMode === 'kaleidoscope') {
            const slices = vjConfig.symmetry;
            ctx.save();
            ctx.translate(w/2, h/2);
            ctx.rotate(Date.now() * 0.0002 * vjConfig.rotationSpeed);
            for (let i = 0; i < slices; i++) {
              ctx.rotate((Math.PI * 2) / slices);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(150 + bass * 300, 100 + mid * 200);
              ctx.lineTo(50 + high * 400, 200 + bass * 100);
              ctx.strokeStyle = i % 2 === 0 ? pCol : aCol;
              ctx.lineWidth = 2 + avg * 20;
              ctx.lineCap = 'round';
              ctx.stroke();
              
              // Internal glow
              if (beat) {
                ctx.shadowBlur = 20;
                ctx.shadowColor = pCol;
              }
            }
            ctx.restore();
          } else if (activeMode === 'waves') {
            ctx.beginPath();
            ctx.strokeStyle = pCol;
            ctx.lineWidth = 5 + bass * 20;
            ctx.moveTo(0, h/2);
            for(let x=0; x<w; x+=5) {
              ctx.lineTo(x, h/2 + Math.sin(x * 0.01 + Date.now() * 0.005) * 150 * avg);
            }
            ctx.stroke();
          }
        }
      }

      // --- 3D Rendering ---
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        group.rotation.y += 0.005 * vjConfig.rotationSpeed;
        
        if (beat) {
          group.scale.setScalar(1.1 * vjConfig.zoomScale);
          cameraRef.current.position.z = 10 + bass * 5;
        } else {
          group.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          cameraRef.current.position.z += (10 - cameraRef.current.position.z) * 0.05;
        }

        if (activeMode === 'tunnel') {
          group.children.forEach((c) => {
            c.position.z += 0.1 * vjConfig.rotationSpeed + high * 0.5;
            if (c.position.z > 5) c.position.z = -50;
            c.rotation.z += 0.01;
          });
        } else if (activeMode === 'grid') {
          group.position.y = -2 + bass * 3;
          group.rotation.x = Math.PI/2.5 + Math.sin(Date.now()*0.001) * 0.2;
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, isPlaying, hasAudioAccess, sensitivity, vjConfig]);

  if (mode === 'none') return null;

  return (
    <div ref={containerRef} className={cn(
      "fixed inset-0 w-full h-full pointer-events-none transition-all duration-1000",
      isDashboard ? "opacity-100 z-0 bg-black" : "opacity-30 z-0"
    )}>
      {vibeFlash && <div className="absolute inset-0 bg-white/40 z-50 animate-out fade-out duration-500" />}
      <canvas ref={canvas2DRef} className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'screen' }} />
    </div>
  );
};

export default Visualizer;
