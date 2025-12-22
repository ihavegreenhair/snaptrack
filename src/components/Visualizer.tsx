import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 
  | 'menger' | 'columns' | 'blob' | 'lattice' | 'city' | 'landmass' // Shader Modes
  | 'shapes' | 'vortex' | 'neural' // Mesh Modes
  | 'vj' | 'none';

interface VJState {
  mode: VisualizerMode;
  pColor: THREE.Color;
  sColor: THREE.Color;
  complexity: number;
  rotationSpeed: number;
  energy: number;
  fov: number;
  zoomLevel: number;
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
    gl_Position = vec4(position, 1.0);
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
  uniform float uZoom;
  varying vec2 vUv;

  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }

  float deMenger(vec3 p) {
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
      p = mod(p + 4.0, 8.0) - 4.0;
      float r = 1.0 + uBass * 0.5;
      return deMenger(p / r) * r;
    } else if (uMode == 1) { // Columns
      vec2 grid = mod(p.xz + 2.0, 4.0) - 2.0;
      return sdBox(vec3(grid.x, p.y, grid.y), vec3(0.4 + uBass, 10.0, 0.4 + uBass));
    } else if (uMode == 4) { // City
      vec2 id = floor(p.xz / 2.0);
      vec2 g = mod(p.xz, 2.0) - 1.0;
      float h = (sin(id.x * 1.5) * cos(id.y * 2.1) * 0.5 + 0.5) * 5.0 * uComplexity;
      h += uBass * 2.0;
      return sdBox(vec3(g.x, p.y + 5.0, g.y), vec3(0.6, h, 0.6));
    } else if (uMode == 5) { // Landmass
      float h = sin(p.x * 0.5 + uTime) * cos(p.z * 0.5 + uTime) * 2.0;
      h += sin(p.x * 2.0) * 0.5 * uEnergy;
      return p.y + 2.0 - h;
    } else { // Blob
      float d = length(p) - (2.0 + uBass);
      d += sin(p.x * 2.0 + uTime) * 0.3 * uMid;
      return d;
    }
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 2.0, 10.0 - uZoom); 
    vec3 rd = normalize(vec3(uv, -1.5));
    
    float t = uTime * 0.1;
    mat2 rot = mat2(cos(t), sin(t), -sin(t), cos(t));
    rd.xz *= rot; ro.xz *= rot;

    float t_dist = 0.0;
    for(int i=0; i<80; i++) {
      float d = map(ro + rd * t_dist);
      if (d < 0.001 || t_dist > 40.0) break;
      t_dist += d;
    }

    vec3 col = vec3(0.0);
    if (t_dist < 40.0) {
      float atten = 1.0 - (t_dist / 40.0);
      col = mix(uColorP, uColorS, sin(t_dist * 0.2 + uTime) * 0.5 + 0.5);
      col *= atten;
      col += vec3(uBass * 0.1);
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
  
  const [vj, setVj] = useState<VJState>({
    mode: 'city',
    pColor: new THREE.Color(PALETTES[0].p),
    sColor: new THREE.Color(PALETTES[0].s),
    complexity: 1,
    rotationSpeed: 1,
    energy: 0,
    fov: 75,
    zoomLevel: 0
  });

  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('city');
  const [vibeFlash, setVibeFlash] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  const energyHistory = useRef<number[]>([]);
  const beatCount = useRef(0);
  const lastBeatTime = useRef(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const shaderPlaneRef = useRef<THREE.Mesh | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? currentVibe : mode;
  const isShaderMode = ['menger', 'columns', 'blob', 'lattice', 'city', 'landmass'].includes(activeMode);

  // 1. Audio cortex
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

  // 2. VJ Logic
  const rollVJ = useCallback(() => {
    const modes: VisualizerMode[] = ['city', 'landmass', 'menger', 'columns', 'shapes', 'neural', 'vortex'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    setCurrentVibe(modes[Math.floor(Math.random() * modes.length)]);
    setVj(prev => ({
      ...prev,
      pColor: new THREE.Color(p.p),
      sColor: new THREE.Color(p.s),
      complexity: 0.5 + Math.random() * 1.5,
      rotationSpeed: 0.5 + Math.random() * 2
    }));

    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 200);
  }, []);

  // 3. Three.js Lifecycle
  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);

      const group = new THREE.Group();
      scene.add(group);

      const shaderMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
          uEnergy: { value: 0 }, uColorP: { value: vj.pColor }, uColorS: { value: vj.sColor },
          uMode: { value: 0 }, uComplexity: { value: 1.0 }, uZoom: { value: 0 }
        },
        vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMat);
      plane.visible = false;
      scene.add(plane);

      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = group;
      shaderPlaneRef.current = plane;
    }

    const group = meshGroupRef.current!;
    const plane = shaderPlaneRef.current!;
    group.clear();

    if (isShaderMode) {
      group.visible = false;
      plane.visible = true;
    } else {
      group.visible = true;
      plane.visible = false;
      const pMat = new THREE.MeshBasicMaterial({ color: vj.pColor, wireframe: true, transparent: true, opacity: 0.6 });
      
      if (activeMode === 'shapes') {
        for (let i = 0; i < 50; i++) {
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pMat);
          mesh.position.set(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20));
          group.add(mesh);
        }
      } else if (activeMode === 'neural') {
        for (let i = 0; i < 100; i++) {
          const node = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), pMat);
          node.position.set(THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30));
          group.add(node);
        }
      }
    }

    const handleResize = () => {
      cameraRef.current!.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current!.updateProjectionMatrix();
      rendererRef.current?.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode, isShaderMode, vj.pColor, vj.sColor]);

  // 4. Animation
  useEffect(() => {
    const animate = () => {
      let b=0, m=0, h=0, avg=0, isBeat=false;
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        for(let i=0; i<10; i++) b += d[i];
        for(let i=10; i<80; i++) m += d[i];
        for(let i=80; i<150; i++) h += d[i];
        b = (b/10/255)*sensitivity; m = (m/70/255)*sensitivity; h = (h/70/255)*sensitivity;
        avg = (b+m+h)/3;

        energyHistory.current.push(avg);
        if (energyHistory.current.length > 50) energyHistory.current.shift();
        const lAvg = energyHistory.current.reduce((a,b)=>a+b,0)/energyHistory.current.length;
        const now = Date.now();
        if (avg > lAvg * 1.2 && avg > 0.2 && now - lastBeatTime.current > 300) {
          isBeat = true;
          const interval = now - lastBeatTime.current;
          lastBeatTime.current = now;
          beatCount.current++;
          
          if (interval > 300 && interval < 1000) {
            onBPMChange?.(Math.round(60000 / interval));
          }

          if (mode === 'vj' && beatCount.current % 16 === 0) rollVJ();
        }
      }

      if (isShaderMode && shaderPlaneRef.current) {
        const u = (shaderPlaneRef.current.material as THREE.ShaderMaterial).uniforms;
        u.uTime.value = performance.now() / 1000;
        u.uBass.value = b; u.uMid.value = m; u.uHigh.value = h; u.uEnergy.value = avg;
        u.uColorP.value = vj.pColor; u.uColorS.value = vj.sColor;
        u.uComplexity.value = vj.complexity;
        u.uZoom.value = THREE.MathUtils.lerp(u.uZoom.value, (beatCount.current % 16) * 0.5, 0.05);
        
        const modeMap: any = { menger: 0, columns: 1, blob: 2, lattice: 3, city: 4, landmass: 5 };
        u.uMode.value = modeMap[activeMode] || 0;
      }

      if (!isShaderMode && meshGroupRef.current) {
        meshGroupRef.current.rotation.y += 0.005 * vj.rotationSpeed;
        if (isBeat) meshGroupRef.current.scale.setScalar(1.1);
        else meshGroupRef.current.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, isShaderMode, hasAudioAccess, sensitivity, vj, rollVJ, mode]);

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