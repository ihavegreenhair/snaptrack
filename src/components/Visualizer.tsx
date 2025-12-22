import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 'menger' | 'columns' | 'blob' | 'lattice' | 'vj' | 'none';

interface VJState {
  mode: VisualizerMode;
  pColor: THREE.Color;
  sColor: THREE.Color;
  complexity: number;
  rotationSpeed: number;
  energy: number;
  fov: number;
  glitch: number;
}

const PALETTES = [
  { p: '#ff00ff', s: '#00ffff' }, // Cyberpunk
  { p: '#39ff14', s: '#bcff00' }, // Toxic
  { p: '#ff4500', s: '#ff8c00' }, // Inferno
  { p: '#710193', s: '#00ffcc' }, // Galactic
  { p: '#ffffff', s: '#555555' }  // Mono
];

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform float uEnergy;
  uniform vec3 uColorP;
  uniform vec3 uColorS;
  uniform int uMode;
  uniform float uComplexity;
  varying vec2 vUv;

  // SDF Functions
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  float sdSphere(vec3 p, float s) {
    return length(p) - s;
  }

  float sdCross(vec3 p) {
    float da = sdBox(p.xyz, vec3(1.0, 1.0, 10.0));
    float db = sdBox(p.yzx, vec3(10.0, 1.0, 1.0));
    float dc = sdBox(p.zxy, vec3(1.0, 10.0, 1.0));
    return min(da, min(db, dc));
  }

  // Menger Sponge Fractal
  float de(vec3 p) {
    float d = sdBox(p, vec3(1.0));
    float s = 1.0;
    for(int m=0; m<3; m++) {
      vec3 a = mod(p * s, 2.0) - 1.0;
      s *= 3.0;
      vec3 r = abs(1.0 - 3.0 * abs(a));
      float da = max(r.x, r.y);
      float db = max(r.y, r.z);
      float dc = max(r.z, r.x);
      float c = (min(da, min(db, dc)) - 1.0) / s;
      d = max(d, c);
    }
    return d;
  }

  float map(vec3 p) {
    if (uMode == 0) { // Menger
      p = mod(p + 2.0, 4.0) - 2.0;
      float r = uComplexity + uBass * 0.2;
      return de(p / r) * r;
    } else if (uMode == 1) { // Columns
      vec3 q = p;
      q.xz = mod(q.xz + 2.0, 4.0) - 2.0;
      return sdBox(q, vec3(0.5 + uBass, 10.0, 0.5 + uBass));
    } else if (uMode == 2) { // Blob
      float d = sdSphere(p, 2.0 + uBass);
      d += sin(p.x * 3.0 + uTime) * 0.2 * uMid;
      d += cos(p.y * 3.0 + uTime) * 0.2 * uHigh;
      return d;
    } else { // Lattice
      p = mod(p + 1.0, 2.0) - 1.0;
      return sdBox(p, vec3(0.1 + uEnergy * 0.5));
    }
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 0.0, 5.0); // Ray Origin
    vec3 rd = normalize(vec3(uv, -1.0)); // Ray Direction
    
    // Rotate Camera
    float t = uTime * 0.2;
    mat2 rot = mat2(cos(t), sin(t), -sin(t), cos(t));
    rd.xz *= rot;
    ro.xz *= rot;

    float d = 0.0;
    float t_dist = 0.0;
    for(int i=0; i<64; i++) {
      d = map(ro + rd * t_dist);
      if (d < 0.001 || t_dist > 20.0) break;
      t_dist += d;
    }

    vec3 col = vec3(0.0);
    if (t_dist < 20.0) {
      float light = 1.0 - (t_dist / 20.0);
      col = mix(uColorP, uColorS, sin(t_dist + uTime) * 0.5 + 0.5);
      col *= light;
      col += vec3(uBass * 0.2); // Flash on bass
    } else {
      col = vec3(0.01, 0.0, 0.02) * uHigh; // Background glow
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
  onBPMChange?: (bpm: number) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5, onBPMChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // v5.0 Engine State
  const [vj, setVj] = useState<VJState>({
    mode: 'menger',
    pColor: new THREE.Color(PALETTES[0].p),
    sColor: new THREE.Color(PALETTES[0].s),
    complexity: 1,
    rotationSpeed: 1,
    energy: 0,
    fov: 75,
    glitch: 0
  });

  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('menger');
  const [vibeFlash, setVibeFlash] = useState(false);

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  // Structural Director Logic
  const energyHistory = useRef<number[]>([]);
  const beatCount = useRef(0);
  const lastBeatTime = useRef(0);
  const beatHistory = useRef<number[]>([]);

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? currentVibe : mode;

  // 1. Audio Cortex Initialization
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

  // 2. Structural Director (The Roll)
  const rollVJ = useCallback(() => {
    const modes: VisualizerMode[] = ['menger', 'columns', 'blob', 'lattice'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    setCurrentVibe(modes[Math.floor(Math.random() * modes.length)]);
    setVj(prev => ({
      ...prev,
      pColor: new THREE.Color(p.p),
      sColor: new THREE.Color(p.s),
      complexity: 0.8 + Math.random() * 1.5,
      rotationSpeed: 0.5 + Math.random() * 2
    }));

    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 200);
  }, []);

  // 3. Three.js SDF Lifecycle
  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const renderer = new THREE.WebGLRenderer({ antialias: false });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Performance cap
      containerRef.current.appendChild(renderer.domElement);

      const material = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uHigh: { value: 0 },
          uEnergy: { value: 0 },
          uColorP: { value: vj.pColor },
          uColorS: { value: vj.sColor },
          uMode: { value: 0 },
          uComplexity: { value: 1.0 }
        },
        vertexShader: VERTEX_SHADER,
        fragmentShader: FRAGMENT_SHADER
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(mesh);

      sceneRef.current = scene;
      rendererRef.current = renderer;
      materialRef.current = material;
    }

    const handleResize = () => {
      rendererRef.current?.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode]);

  // 4. Pro Animation Loop
  useEffect(() => {
    const animate = () => {
      if (!materialRef.current) {
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      // --- Auditory Cortex ---
      let b=0, m=0, h=0, avg=0;
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        for(let i=0; i<10; i++) b += d[i];
        for(let i=10; i<80; i++) m += d[i];
        for(let i=80; i<150; i++) h += d[i];
        
        b = (b/10/255) * sensitivity;
        m = (m/70/255) * sensitivity;
        h = (h/70/255) * sensitivity;
        avg = (b+m+h)/3;

        // Phrase Tracking
        energyHistory.current.push(avg);
        if (energyHistory.current.length > 50) energyHistory.current.shift();
        const lAvg = energyHistory.current.reduce((a,b)=>a+b,0)/energyHistory.current.length;
        
        const now = Date.now();
        if (avg > lAvg * 1.2 && avg > 0.2 && now - lastBeatTime.current > 300) {
          const interval = now - lastBeatTime.current;
          lastBeatTime.current = now;
          beatCount.current++;
          
          if (interval < 1000) {
            const bpm = 60000 / interval;
            beatHistory.current.push(bpm);
            if (beatHistory.current.length > 10) beatHistory.current.shift();
            onBPMChange?.(Math.round(beatHistory.current.reduce((a,b)=>a+b,0)/beatHistory.current.length));
          }

          if (mode === 'vj' && beatCount.current % 16 === 0) rollVJ();
        }
      }

      // Update Shader Uniforms
      const uniforms = materialRef.current.uniforms;
      uniforms.uTime.value = performance.now() / 1000;
      uniforms.uBass.value = b;
      uniforms.uMid.value = m;
      uniforms.uHigh.value = h;
      uniforms.uEnergy.value = avg;
      uniforms.uColorP.value = vj.pColor;
      uniforms.uColorS.value = vj.sColor;
      uniforms.uComplexity.value = vj.complexity;
      
      const modeMap = { menger: 0, columns: 1, blob: 2, lattice: 3, vj: 0, none: 0 };
      uniforms.uMode.value = modeMap[activeMode];

      rendererRef.current?.render(sceneRef.current!, new THREE.Camera());
      requestRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, hasAudioAccess, sensitivity, vj, rollVJ, onBPMChange, mode]);

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
