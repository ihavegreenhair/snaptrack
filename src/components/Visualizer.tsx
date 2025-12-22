import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 'bars' | 'waves' | 'particles' | 'tunnel' | 'spheres' | 'vortex' | 'grid' | 'neural' | 'kaleidoscope' | 'starfield' | 'vj' | 'none';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  
  // VJ State
  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('grid');
  const [vibeFlash, setVibeFlash] = useState(false);
  const [randomParams, setRandomParams] = useState({
    rotationSpeed: 1,
    zoomIntensity: 1,
    colorShift: 0,
    complexity: 1
  });
  
  const vibeIntensity = useRef(0); // 0 to 1 based on energy

  // Audio Brain
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Frequency Bands
  const audioData = useRef({
    bass: 0,
    mid: 0,
    high: 0,
    avg: 0,
    isKick: false
  });

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? currentVibe : mode;

  // 1. Professional Audio Analysis
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;

    const initAudio = async () => {
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
      } catch (err) {
        setHasAudioAccess(false);
      }
    };

    initAudio();
  }, [mode, isPlaying]);

  // 2. Auto-VJ State Machine
  useEffect(() => {
    if (mode !== 'vj') return;

    const vibes: VisualizerMode[] = ['grid', 'neural', 'tunnel', 'vortex', 'particles', 'waves', 'kaleidoscope', 'starfield', 'spheres'];
    let index = 0;

    const interval = window.setInterval(() => {
      // Intelligent transition: randomize parameters on every vibe change
      index = Math.floor(Math.random() * vibes.length);
      setCurrentVibe(vibes[index]);
      
      setRandomParams({
        rotationSpeed: Math.random() * 2 + 0.5,
        zoomIntensity: Math.random() * 1.5 + 0.5,
        colorShift: Math.random() * 360,
        complexity: Math.random() * 2 + 0.5
      });

      setVibeFlash(true);
      setTimeout(() => setVibeFlash(false), 200);
    }, 12000); 

    return () => clearInterval(interval);
  }, [mode]);

  // 3. Three.js Pro Setup
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
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
      camera.position.z = 10;
    }

    // Module Rebuild Logic
    if (meshGroupRef.current) {
      const group = meshGroupRef.current;
      group.clear();
      const style = getComputedStyle(document.documentElement);
      const pColor = new THREE.Color(style.getPropertyValue('--primary').trim() || '#ff00ff');
      const aColor = new THREE.Color(style.getPropertyValue('--accent').trim() || '#00ffff');

      if (activeMode === 'grid') {
        const size = 100;
        const divisions = 40;
        const grid = new THREE.GridHelper(size, divisions, pColor, aColor);
        grid.rotation.x = Math.PI / 2;
        group.add(grid);
      } else if (activeMode === 'neural') {
        for (let i = 0; i < 150; i++) {
          const geometry = new THREE.SphereGeometry(0.05, 8, 8);
          const material = new THREE.MeshBasicMaterial({ color: aColor });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20));
          group.add(sphere);
        }
      } else if (activeMode === 'tunnel') {
        for (let i = 0; i < 20; i++) {
          const geometry = new THREE.TorusGeometry(i * 0.8, 0.05, 16, 50);
          const material = new THREE.MeshBasicMaterial({ color: pColor, transparent: true, opacity: 0.5 });
          const ring = new THREE.Mesh(geometry, material);
          ring.position.z = -i * 2;
          group.add(ring);
        }
      } else if (activeMode === 'vortex') {
        const geo = new THREE.IcosahedronGeometry(5, 2);
        const mat = new THREE.MeshBasicMaterial({ color: aColor, wireframe: true });
        group.add(new THREE.Mesh(geo, mat));
      } else if (activeMode === 'starfield') {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        for (let i = 0; i < 2000; i++) {
          vertices.push(THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(50), THREE.MathUtils.randFloatSpread(50));
        }
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
        group.add(new THREE.Points(geometry, material));
      } else if (activeMode === 'spheres') {
        for (let i = 0; i < 30; i++) {
          const geometry = new THREE.SphereGeometry(Math.random() * 0.5 + 0.2, 16, 16);
          const material = new THREE.MeshBasicMaterial({ 
            color: i % 2 === 0 ? pColor : aColor,
            wireframe: true,
            transparent: true,
            opacity: 0.4
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(THREE.MathUtils.randFloatSpread(15), THREE.MathUtils.randFloatSpread(15), THREE.MathUtils.randFloatSpread(15));
          group.add(mesh);
        }
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
  }, [activeMode]);

  // 4. Pro Animation Loop
  useEffect(() => {
    const canvas2D = canvas2DRef.current;
    const ctx = canvas2D?.getContext('2d');
    let lastKickTime = 0;

    const animate = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // --- 1. Audio Processing ---
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const data = dataArrayRef.current;
        
        // Logical Band Binning
        let bass = 0, mid = 0, high = 0;
        for (let i = 0; i < 10; i++) bass += data[i]; // 0-100Hz approx
        for (let i = 10; i < 60; i++) mid += data[i]; // 100-1000Hz
        for (let i = 60; i < 128; i++) high += data[i]; // 1000Hz+
        
        audioData.current.bass = (bass / 10 / 255) * sensitivity;
        audioData.current.mid = (mid / 50 / 255) * sensitivity;
        audioData.current.high = (high / 68 / 255) * sensitivity;
        audioData.current.avg = (audioData.current.bass + audioData.current.mid + audioData.current.high) / 3;

        // Kick Detection
        const now = Date.now();
        if (audioData.current.bass > 0.8 && now - lastKickTime > 200) {
          audioData.current.isKick = true;
          lastKickTime = now;
        } else {
          audioData.current.isKick = false;
        }
      } else {
        // Simulation mode
        const time = Date.now() * 0.002;
        audioData.current.avg = isPlaying ? 0.3 + Math.sin(time) * 0.2 : 0;
        audioData.current.bass = audioData.current.avg * 1.2;
        audioData.current.isKick = Math.sin(time * 2) > 0.9;
      }

      const { avg, bass, mid, high, isKick } = audioData.current;
      vibeIntensity.current = avg;

      // --- 2. 2D Rendering ---
      if (ctx && canvas2D) {
        canvas2D.width = w * window.devicePixelRatio;
        canvas2D.height = h * window.devicePixelRatio;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        
        if (['bars', 'waves', 'particles', 'kaleidoscope'].includes(activeMode)) {
          ctx.clearRect(0, 0, w, h);
          const style = getComputedStyle(document.documentElement);
          const primary = style.getPropertyValue('--primary').trim();
          const accent = style.getPropertyValue('--accent').trim();

          if (activeMode === 'bars') {
            const count = Math.floor(40 * randomParams.complexity);
            const step = w / count;
            for (let i = 0; i < count; i++) {
              const h_val = (i < count/4 ? bass : i < count/2 ? mid : high) * h * 0.5 * Math.random() * randomParams.zoomIntensity;
              ctx.fillStyle = i % 2 === 0 ? primary : accent;
              ctx.globalAlpha = 0.5 + avg * 0.5;
              ctx.fillRect(i * step, h - h_val - 20, step - 4, h_val + 10);
            }
          } else if (activeMode === 'waves') {
            ctx.beginPath();
            ctx.strokeStyle = primary;
            ctx.lineWidth = (2 + bass * 10) * randomParams.complexity;
            ctx.moveTo(0, h / 2);
            for (let x = 0; x < w; x += 10) {
              ctx.lineTo(x, h/2 + Math.sin(x*0.01 + lastKickTime*0.001)*100*avg*randomParams.zoomIntensity);
            }
            ctx.stroke();
          } else if (activeMode === 'kaleidoscope') {
            const slices = 8;
            ctx.save();
            ctx.translate(w/2, h/2);
            for (let i = 0; i < slices; i++) {
              ctx.rotate((Math.PI * 2) / slices);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(100 + bass * 200, 50 + mid * 100);
              ctx.strokeStyle = i % 2 === 0 ? primary : accent;
              ctx.lineWidth = 2 + high * 10;
              ctx.stroke();
            }
            ctx.restore();
          }
        } else {
          ctx.clearRect(0, 0, w, h);
        }
      }

      // --- 3. 3D Rendering ---
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const camera = cameraRef.current;

        // Global motion
        group.rotation.y += (0.002 + mid * 0.01) * randomParams.rotationSpeed;
        if (isKick) {
          camera.position.z = 10 + bass * 2 * randomParams.zoomIntensity; // Beat jump
        } else {
          camera.position.z += (10 - camera.position.z) * 0.1; // Smooth return
        }

        if (activeMode === 'grid') {
          group.rotation.x = Math.PI / 2.5 + Math.sin(Date.now() * 0.001) * 0.1;
          group.position.y = -2 + bass * randomParams.zoomIntensity;
        } else if (activeMode === 'neural') {
          group.children.forEach((child, i) => {
            child.position.y += Math.sin(Date.now() * 0.001 + i) * 0.01 * sensitivity;
            if (isKick) (child as THREE.Mesh).scale.setScalar(1.5 * randomParams.complexity);
            else child.scale.setScalar(1 + (child.scale.x - 1) * 0.9);
          });
        } else if (activeMode === 'tunnel') {
          group.children.forEach((child) => {
            child.position.z += (0.1 + high * 0.5) * randomParams.rotationSpeed;
            if (child.position.z > 5) child.position.z = -40;
          });
        } else if (activeMode === 'starfield') {
          group.rotation.z += 0.001;
          if (isKick) group.scale.setScalar(1.1);
          else group.scale.setScalar(1 + (group.scale.x - 1) * 0.9);
        }

        rendererRef.current.render(sceneRef.current, camera);
      }

    requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, isPlaying, hasAudioAccess, sensitivity, randomParams]);

  if (mode === 'none') return null;

  return (
    <div ref={containerRef} className={cn(
      "fixed inset-0 w-full h-full pointer-events-none transition-all duration-1000",
      isDashboard ? "opacity-100 z-0 bg-black" : "opacity-30 z-0"
    )}>
      {/* VJ Transition Flash */}
      {vibeFlash && (
        <div className="absolute inset-0 bg-white/30 z-50 animate-out fade-out duration-300" />
      )}
      
      <canvas ref={canvas2DRef} className="absolute inset-0 w-full h-full" style={{ mixBlendMode: 'screen' }} />
    </div>
  );
};

export default Visualizer;