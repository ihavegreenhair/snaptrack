import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';

export type VisualizerMode = 
  | 'menger' | 'columns' | 'blob' | 'lattice' | 'city' | 'landmass' | 'gyroid' | 'tunnel' | 'lava' | 'matrix' | 'rooms' | 'bulb' 
  | 'shapes' | 'vortex' | 'neural' | 'rings' | 'core3d' | 'cloud' | 'trees' | 'platonic' | 'helix'
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
  shapeType: 'box' | 'sphere' | 'pyramid' | 'torus';
  zoomLevel: number;
  fov: number;
}

const PALETTES = [
  { p: '#ff00ff', s: '#00ffff', ph: 300, sh: 180 }, // Cyberpunk
  { p: '#39ff14', s: '#bcff00', ph: 110, sh: 80 },  // Toxic
  { p: '#ff4500', s: '#ff8c00', ph: 15, sh: 30 },   // Inferno
  { p: '#710193', s: '#00ffcc', ph: 280, sh: 160 }, // Galactic
  { p: '#ffffff', s: '#555555', ph: 0, sh: 0 }     // Mono
];

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;
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

  // --- SDF Utils ---
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  float sdSphere(vec3 p, float s) { return length(p) - s; }
  
  float deMenger(vec3 p) {
    float d = sdBox(p, vec3(1.0));
    float s = 1.0;
    for(int m=0; m<3; m++) {
      vec3 a = mod(p * s, 2.0) - 1.0;
      s *= 3.0;
      vec3 r = abs(1.0 - 3.0 * abs(a));
      float c = (min(max(r.x, r.y), min(max(r.y, r.z), max(r.z, r.x))) - 1.0) / s;
      d = max(d, c);
    }
    return d;
  }

  float map(vec3 p) {
    float d = 1000.0;
    if (uMode == 0) { // Menger
      vec3 q = mod(p + 4.0, 8.0) - 4.0;
      d = deMenger(q);
    } else if (uMode == 1) { // Columns
      vec2 grid = mod(p.xz + 4.0, 8.0) - 4.0;
      d = sdBox(vec3(grid.x, p.y, grid.y), vec3(0.5 + uBass, 20.0, 0.5 + uBass));
    } else if (uMode == 4) { // City
      vec2 g = mod(p.xz, 6.0) - 3.0;
      float h = (sin(floor(p.x/6.0)) * 5.0 + 5.0) + uBass * 4.0;
      d = sdBox(vec3(g.x, p.y + 5.0, g.y), vec3(1.0, h, 1.0));
    } else if (uMode == 15) { // Bulb
      vec3 z = p * 0.5;
      float dr = 1.0, r = 0.0, pwr = 8.0 + uBass * 2.0;
      for (int i=0; i<4; i++) {
        r = length(z); if (r>2.0) break;
        float theta = acos(z.z/r), phi = atan(z.y,z.x);
        dr = pow(r, pwr-1.0)*pwr*dr + 1.0;
        float zr = pow(r, pwr);
        z = zr*vec3(sin(theta*pwr)*cos(phi*pwr), sin(phi*pwr)*sin(theta*pwr), cos(theta*pwr)) + p*0.5;
      }
      d = 0.5*log(r)*r/dr;
    } else {
      d = sdSphere(p, 2.0 + uBass);
    }
    return d;
  }

  vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.01, 0.0);
    return normalize(vec3(
      map(p+e.xyy) - map(p-e.xyy),
      map(p+e.yxy) - map(p-e.yxy),
      map(p+e.yyx) - map(p-e.yyx)
    ));
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    vec3 ro = vec3(0.0, 3.0, 15.0 - uZoom);
    vec3 rd = normalize(vec3(uv, -1.2));
    
    float t = uTime * 0.1;
    mat2 rot = mat2(cos(t), sin(t), -sin(t), cos(t));
    rd.xz *= rot; ro.xz *= rot;

    float t_dist = 0.0;
    int steps = 0;
    for(int i=0; i<100; i++) {
      float d = map(ro + rd * t_dist);
      if (abs(d) < 0.001 || t_dist > 40.0) break;
      t_dist += d * 0.8; // Safer step size to prevent stripes
      steps = i;
    }

    vec3 col = vec3(0.01, 0.0, 0.03); // Deep space
    if (t_dist < 40.0) {
      vec3 p = ro + rd * t_dist;
      vec3 n = getNormal(p);
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(n, lightDir), 0.1);
      
      col = mix(uColorP, uColorS, n.y * 0.5 + 0.5);
      col *= diff;
      col += pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0) * 0.5; // Specular
      col *= (1.0 - t_dist/40.0); // Distance fade
    }
    
    // Post-FX
    col += uBass * 0.05 * uColorP;
    float scanline = sin(vUv.y * 1000.0) * 0.03;
    gl_FragColor = vec4(col - scanline, 1.0);
  }
`;

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
  onBPMChange?: (bpm: number) => void;
  _videoId?: string;
  _currentTime?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ mode, isPlaying, isDashboard, sensitivity = 1.5, onBPMChange, _videoId, _currentTime }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (_videoId && _currentTime) {
      // Logic for future song-mapping based on time
    }
  }, [_videoId, _currentTime]);
  
  const [vj, setVj] = useState<VJState>({
    mode: 'shapes',
    pColor: new THREE.Color(PALETTES[0].p),
    sColor: new THREE.Color(PALETTES[0].s),
    primaryHue: PALETTES[0].ph,
    secondaryHue: PALETTES[0].sh,
    complexity: 1,
    rotationSpeed: 0.2,
    motionIntensity: 0.3,
    distortion: 1,
    colorCycle: 0,
    wireframe: true,
    shapeType: 'box',
    zoomLevel: 0,
    fov: 75
  });

  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('shapes');
  const [vibeFlash, setVibeFlash] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [hasAudioAccess, setHasAudioAccess] = useState(false);

  const energyHistory = useRef<number[]>([]);
  const beatCount = useRef(0);
  const lastBeatTime = useRef(0);
  const energyBuffer = useRef<number[]>([]);
  const dropCooldown = useRef(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const shaderPlaneRef = useRef<THREE.Mesh | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? currentVibe : mode;
  const isShaderMode = ['menger', 'columns', 'blob', 'lattice', 'city', 'landmass', 'gyroid', 'tunnel', 'lava', 'matrix', 'rooms', 'bulb'].includes(activeMode);

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

  // VJ Brain
  const rollVJ = useCallback(() => {
    const shaderModes: VisualizerMode[] = ['city', 'columns', 'menger', 'tunnel', 'bulb'];
    const meshModes: VisualizerMode[] = ['shapes', 'neural', 'rings', 'core3d', 'trees', 'platonic', 'helix'];
    const modes = [...shaderModes, ...meshModes];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus')[] = ['box', 'sphere', 'pyramid', 'torus'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    setCurrentVibe(modes[Math.floor(Math.random() * modes.length)]);
    setVj(prev => ({
      ...prev,
      pColor: new THREE.Color(p.p),
      sColor: new THREE.Color(p.s),
      primaryHue: p.ph,
      secondaryHue: p.sh,
      complexity: 0.5 + Math.random() * 1.5,
      rotationSpeed: 0.1 + Math.random() * 1.0,
      motionIntensity: 0.2 + Math.random() * 1.0,
      wireframe: Math.random() > 0.3,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)],
      fov: 60 + Math.random() * 30
    }));

    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 200);
  }, []);

  // Three Lifecycle
  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);

      const shaderMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 }, uBass: { value: 0 }, uMid: { value: 0 }, uHigh: { value: 0 },
          uEnergy: { value: 0 }, uColorP: { value: vj.pColor }, uColorS: { value: vj.sColor },
          uMode: { value: 0 }, uComplexity: { value: 1.0 }, uZoom: { value: 0 }
        },
        vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER
      });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMat);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      shaderPlaneRef.current = plane;
      
      scene.add(meshGroupRef.current);
      scene.add(plane);
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
      const pMat = new THREE.MeshBasicMaterial({ color: vj.pColor, wireframe: vj.wireframe, transparent: true, opacity: 0.6 });
      const aMat = new THREE.MeshBasicMaterial({ color: vj.sColor, wireframe: true, transparent: true, opacity: 0.3 });

      if (activeMode === 'shapes') {
        for (let i = 0; i < 60; i++) {
          const geo = vj.shapeType === 'box' ? new THREE.BoxGeometry(1,1,1) : new THREE.IcosahedronGeometry(0.8, 0);
          const mesh = new THREE.Mesh(geo, i % 2 === 0 ? pMat : aMat);
          mesh.position.set(THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30));
          group.add(mesh);
        }
      } else if (activeMode === 'trees') {
        for (let i = 0; i < 10; i++) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 5), pMat);
          tree.add(trunk);
          tree.position.set(THREE.MathUtils.randFloatSpread(40), -5, THREE.MathUtils.randFloatSpread(40));
          group.add(tree);
        }
      } else if (activeMode === 'platonic') {
        for (let i = 0; i < 20; i++) {
          const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(2, 0), aMat);
          mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
          group.add(mesh);
        }
      } else if (activeMode === 'helix') {
        for (let i = 0; i < 100; i++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), pMat);
          const t = i * 0.2;
          sphere.position.set(Math.sin(t) * 5, t * 2 - 10, Math.cos(t) * 5);
          group.add(sphere);
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
  }, [activeMode, isShaderMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe]);

  // Animation Engine
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      let bSum=0, mSum=0, hSum=0, avg=0, isBeat=false;
      
      if (hasAudioAccess && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        const d = dataArrayRef.current;
        for(let i=0; i<12; i++) bSum += d[i];
        for(let i=12; i<90; i++) mSum += d[i];
        for(let i=90; i<180; i++) hSum += d[i];
        
        const bass = (bSum / 12 / 255) * sensitivity;
        const mid = (mSum / 78 / 255) * sensitivity;
        const high = (hSum / 90 / 255) * sensitivity;
        avg = (bass + mid + high) / 3;

        energyBuffer.current.push(avg);
        if (energyBuffer.current.length > 50) energyBuffer.current.shift();
        const sAvg = energyBuffer.current.slice(-5).reduce((a,b)=>a+b,0)/5;
        const lAvg = energyBuffer.current.reduce((a,b)=>a+b,0)/energyBuffer.current.length;
        
        if ((avg - sAvg) > 0.3 && avg > lAvg * 1.6 && now > dropCooldown.current) {
          rollVJ(); dropCooldown.current = now + 6000;
        }

        energyHistory.current.push(avg);
        if (energyHistory.current.length > 40) energyHistory.current.shift();
        const avgHist = energyHistory.current.reduce((a, b) => a + b, 0) / energyHistory.current.length;
        
        if (avg > avgHist * 1.2 && avg > 0.2 && now - lastBeatTime.current > 300) {
          isBeat = true; lastBeatTime.current = now; beatCount.current++;
          if (interval < 1000) onBPMChange?.(Math.round(60000 / (now - lastBeatTime.current)));
          if (mode === 'vj' && beatCount.current % 16 === 0) rollVJ();
        }

        if (isShaderMode && shaderPlaneRef.current) {
          const u = (shaderPlaneRef.current.material as THREE.ShaderMaterial).uniforms;
          u.uTime.value = performance.now() / 1000;
          u.uBass.value = bass; u.uMid.value = mid; u.uHigh.value = high; u.uEnergy.value = avg;
          u.uColorP.value = vj.pColor; u.uColorS.value = vj.sColor;
          u.uComplexity.value = vj.complexity;
          u.uZoom.value = THREE.MathUtils.lerp(u.uZoom.value, (beatCount.current % 16) * 0.8, 0.05);
          const modeMap: any = { menger: 0, columns: 1, city: 4, bulb: 15 };
          u.uMode.value = modeMap[activeMode] || 0;
        }

        if (!isShaderMode && meshGroupRef.current) {
          const group = meshGroupRef.current;
          group.rotation.y += 0.002 * vj.rotationSpeed;
          group.children.forEach((obj) => {
            if (isBeat) obj.scale.setScalar(1.2 + bass * 0.5);
            else obj.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
            if (activeMode === 'helix') obj.rotation.y += 0.05;
          });
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, isBeat ? vj.fov + 10 : vj.fov, 0.1);
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    const interval = 0; // Fix for BPM logic
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, isShaderMode, hasAudioAccess, sensitivity, vj, rollVJ, mode, isPlaying, onBPMChange]);

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
