import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 'bars' | 'waves' | 'particles' | 'tunnel' | 'spheres' | 'vortex' | 'vj' | 'none';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  
  // State for Auto VJ
  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('bars');
  const vjTimerRef = useRef<number | null>(null);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const requestRef = useRef<number | null>(null);

  // Determine actual active mode (respecting VJ mode)
  const activeMode = mode === 'vj' ? currentVibe : mode;

  // 1. Audio Initialization
  useEffect(() => {
    if (mode === 'none' || !isPlaying) return;

    const initAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }

        if (!sourceRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          if (analyserRef.current) {
            sourceRef.current.connect(analyserRef.current);
          }
          setHasAudioAccess(true);
        }
      } catch (err) {
        setHasAudioAccess(false);
      }
    };

    initAudio();
  }, [mode, isPlaying]);

  // 2. Auto VJ Logic
  useEffect(() => {
    if (mode !== 'vj') {
      if (vjTimerRef.current) clearInterval(vjTimerRef.current);
      return;
    }

    const vibes: VisualizerMode[] = ['bars', 'waves', 'particles', 'tunnel', 'spheres', 'vortex'];
    let index = 0;

    vjTimerRef.current = window.setInterval(() => {
      index = (index + 1) % vibes.length;
      setCurrentVibe(vibes[index]);
    }, 10000); // Cycle every 10 seconds

    return () => {
      if (vjTimerRef.current) clearInterval(vjTimerRef.current);
    };
  }, [mode]);

  // 3. Three.js Engine Setup
  useEffect(() => {
    if (activeMode === 'none') return;
    if (!['tunnel', 'spheres', 'vortex'].includes(activeMode)) {
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
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
      
      camera.position.z = 5;
    }

    // Rebuild Scene based on mode
    if (meshGroupRef.current) {
      meshGroupRef.current.clear();
      const style = getComputedStyle(document.documentElement);
      const primaryColor = new THREE.Color(style.getPropertyValue('--primary').trim() || '#ff00ff');
      const accentColor = new THREE.Color(style.getPropertyValue('--accent').trim() || '#00ffff');

      if (activeMode === 'spheres') {
        for (let i = 0; i < 50; i++) {
          const geometry = new THREE.SphereGeometry(Math.random() * 0.2 + 0.1, 16, 16);
          const material = new THREE.MeshBasicMaterial({ 
            color: i % 2 === 0 ? primaryColor : accentColor,
            transparent: true,
            opacity: 0.6
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
          meshGroupRef.current.add(mesh);
        }
      } else if (activeMode === 'tunnel') {
        const geometry = new THREE.TorusGeometry(10, 3, 16, 100);
        const material = new THREE.MeshBasicMaterial({ color: primaryColor, wireframe: true, transparent: true, opacity: 0.3 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2;
        meshGroupRef.current.add(mesh);
      } else if (activeMode === 'vortex') {
        const points = [];
        for (let i = 0; i < 1000; i++) {
          const vertex = new THREE.Vector3();
          vertex.x = THREE.MathUtils.randFloatSpread(20);
          vertex.y = THREE.MathUtils.randFloatSpread(20);
          vertex.z = THREE.MathUtils.randFloatSpread(20);
          points.push(vertex);
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.PointsMaterial({ color: accentColor, size: 0.05, transparent: true, opacity: 0.8 });
        const particles = new THREE.Points(geometry, material);
        meshGroupRef.current.add(particles);
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

  // 4. Main Animation Loop
  useEffect(() => {
    const canvas2D = canvas2DRef.current;
    let ctx: CanvasRenderingContext2D | null = null;
    if (canvas2D) ctx = canvas2D.getContext('2d');

    const particles2D: { x: number; y: number; size: number; speedX: number; speedY: number; color: string }[] = [];
    for (let i = 0; i < 80; i++) {
      particles2D.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 1,
        speedY: (Math.random() - 0.5) * 1,
        color: `hsla(${Math.random() * 360}, 70%, 60%, 0.5)`
      });
    }

    let frame = 0;
    const animate = () => {
      frame++;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Reactivity
      let avgFreq = 0;
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        avgFreq = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      } else {
        avgFreq = isPlaying ? 40 + Math.sin(frame * 0.1) * 20 : 0;
      }
      const boost = (avgFreq / 128) * sensitivity;

      // Theme colors
      const style = getComputedStyle(document.documentElement);
      const primary = style.getPropertyValue('--primary').trim() || 'oklch(0.6 0.2 320)';
      const accent = style.getPropertyValue('--accent').trim() || 'oklch(0.7 0.2 190)';

      // 2D Rendering
      if (ctx && canvas2D) {
        if (['bars', 'waves', 'particles'].includes(activeMode)) {
          canvas2D.width = w * window.devicePixelRatio;
          canvas2D.height = h * window.devicePixelRatio;
          ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
          ctx.clearRect(0, 0, w, h);

          if (activeMode === 'bars') {
            const barCount = 64;
            const barWidth = w / barCount;
            for (let i = 0; i < barCount; i++) {
              const val = dataArrayRef.current ? dataArrayRef.current[i] || 0 : (Math.sin(frame * 0.05 + i * 0.3) * 128 + 128);
              const barH = (val / 255) * h * 0.6 * boost;
              ctx.fillStyle = i % 2 === 0 ? primary : accent;
              ctx.globalAlpha = 0.3 + (val / 255) * 0.5;
              ctx.fillRect(i * barWidth, h - barH, barWidth - 4, barH);
            }
          } else if (activeMode === 'waves') {
            ctx.beginPath();
            ctx.lineWidth = 3 + boost * 5;
            ctx.strokeStyle = primary;
            ctx.moveTo(0, h / 2);
            for (let i = 0; i < w; i += 5) {
              const y = h / 2 + Math.sin(i * 0.01 + frame * 0.05) * 100 * boost;
              ctx.lineTo(i, y);
            }
            ctx.stroke();
          } else if (activeMode === 'particles') {
            particles2D.forEach(p => {
              p.x = (p.x + p.speedX * (1 + boost * 2)) % w;
              p.y = (p.y + p.speedY * (1 + boost * 2)) % h;
              if (p.x < 0) p.x = w; if (p.y < 0) p.y = h;
              ctx!.beginPath();
              ctx!.arc(p.x, p.y, p.size * (1 + boost), 0, Math.PI * 2);
              ctx!.fillStyle = p.color;
              ctx!.globalAlpha = 0.4 + boost * 0.4;
              ctx!.fill();
            });
          }
        } else {
          ctx.clearRect(0, 0, w, h);
        }
      }

      // 3D Rendering
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.005 + boost * 0.02;
        meshGroupRef.current.rotation.x += 0.002;

        if (activeMode === 'spheres') {
          meshGroupRef.current.children.forEach((mesh, i) => {
            const m = mesh as THREE.Mesh;
            const s = 1 + boost * 0.5 * (i % 3);
            m.scale.set(s, s, s);
          });
        } else if (activeMode === 'tunnel') {
          cameraRef.current.position.z = 5 + Math.sin(frame * 0.02) * 2;
          meshGroupRef.current.scale.set(1 + boost, 1 + boost, 1 + boost);
        } else if (activeMode === 'vortex') {
          meshGroupRef.current.rotation.z += 0.01 * boost;
        }

        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [activeMode, isPlaying, hasAudioAccess, sensitivity]);

  if (mode === 'none') return null;

  return (
    <div ref={containerRef} className={cn(
      "fixed inset-0 w-full h-full pointer-events-none transition-opacity duration-1000",
      isDashboard ? "opacity-90 z-0 bg-black" : "opacity-30 z-0"
    )}>
      <canvas 
        ref={canvas2DRef} 
        className="absolute inset-0 w-full h-full"
        style={{ mixBlendMode: 'screen' }}
      />
    </div>
  );
};

export default Visualizer;
