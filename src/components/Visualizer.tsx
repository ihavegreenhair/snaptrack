import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { useSongMapper } from '@/hooks/useSongMapper';

export type VisualizerMode = 
  | 'menger' | 'columns' | 'blob' | 'lattice' | 'city' | 'landmass' | 'gyroid' | 'tunnel' | 'lava' | 'matrix' | 'rooms' | 'bulb' 
  | 'shapes' | 'vortex' | 'neural' | 'rings' | 'core3d' | 'cloud' | 'trees' | 'platonic' | 'helix' | 'flower' | 'starfield'
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

  // --- SDF Math Utils ---
  float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
  }
  float sdSphere(vec3 p, float s) { return length(p) - s; }
  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }
  float sdGyroid(vec3 p, float scale, float thickness, float bias) {
    p *= scale;
    return abs(dot(sin(p), cos(p.zxy)) - bias) / scale - thickness;
  }

  // --- Recursive Fractals ---
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
      vec3 q = mod(p + 6.0, 12.0) - 6.0;
      float r = 1.0 + uBass * 0.3;
      d = deMenger(q / r) * r;
    } else if (uMode == 1) { // Columns
      vec2 grid = mod(p.xz + 6.0, 12.0) - 6.0;
      d = sdBox(vec3(grid.x, p.y, grid.y), vec3(0.3 + uBass, 15.0, 0.3 + uBass));
    } else if (uMode == 4) { // City
      vec2 g = mod(p.xz, 10.0) - 5.0;
      float h = (sin(floor(p.x/10.0)) * 8.0 + 8.0) + uBass * 6.0;
      d = sdBox(vec3(g.x, p.y + 5.0, g.y), vec3(1.5, h, 1.5));
    } else if (uMode == 6) { // Matrix
      vec2 g = fract(p.xz * 0.2) - 0.5;
      d = sdBox(vec3(g.x, p.y, g.y), vec3(0.05, 20.0, 0.05));
    } else if (uMode == 8) { // Rooms
      vec3 q = mod(p + 8.0, 16.0) - 8.0;
      d = -sdBox(q, vec3(7.8));
    } else if (uMode == 15) { // Bulb
      vec3 z = p * 0.4;
      float dr = 1.0, r = 0.0, pwr = 8.0 + uBass * 2.0;
      for (int i=0; i<4; i++) {
        r = length(z); if (r>2.0) break;
        float theta = acos(z.z/r), phi = atan(z.y,z.x);
        dr = pow(r, pwr-1.0)*pwr*dr + 1.0;
        float zr = pow(r, pwr);
        z = zr*vec3(sin(theta*pwr)*cos(phi*pwr), sin(phi*pwr)*sin(theta*pwr), cos(theta*pwr)) + p*0.4;
      }
      d = 0.5*log(r)*r/dr;
    } else { // Blob
      d = sdSphere(p, 2.0 + uBass);
      d += sin(p.x * 2.0 + uTime) * 0.3 * uMid;
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
    // ro (Ray Origin) - Stay further back to prevent near-clipping
    vec3 ro = vec3(0.0, 4.0, 20.0 - uZoom); 
    vec3 rd = normalize(vec3(uv, -1.2));
    
    float t = uTime * 0.1;
    mat2 rot = mat2(cos(t), sin(t), -sin(t), cos(t));
    rd.xz *= rot; ro.xz *= rot;

    float t_dist = 0.0;
    for(int i=0; i<100; i++) {
      float d = map(ro + rd * t_dist);
      if (abs(d) < 0.001 || t_dist > 60.0) break;
      t_dist += d * 0.75; // Even safer step size
    }

    vec3 col = vec3(0.01, 0.0, 0.02); // Deep space background
    if (t_dist < 60.0) {
      vec3 p = ro + rd * t_dist;
      vec3 n = getNormal(p);
      vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
      float diff = max(dot(n, lightDir), 0.1);
      
      col = mix(uColorP, uColorS, n.y * 0.5 + 0.5);
      col *= diff;
      col += pow(max(dot(reflect(-lightDir, n), -rd), 0.0), 32.0) * 0.4; // Specular
      col *= (1.0 - t_dist/60.0); // Smooth fog
    }
    
    // Post-FX
    col += uBass * 0.05 * uColorP;
    float scanline = sin(vUv.y * 1200.0) * 0.02;
    gl_FragColor = vec4(col - scanline, 1.0);
  }
`;

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
  
  useEffect(() => {
    if (videoId && currentTime) {
      // Logic for future song-mapping based on time
    }
  }, [videoId, currentTime]);
  
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
  const detectedBPM = useRef(120);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const shaderPlaneRef = useRef<THREE.Mesh | null>(null);
  const requestRef = useRef<number | null>(null);

  const activeMode = mode === 'vj' ? currentVibe : mode;
  const isShaderMode = ['menger', 'columns', 'blob', 'lattice', 'city', 'landmass', 'gyroid', 'tunnel', 'lava', 'matrix', 'rooms', 'bulb'].includes(activeMode);

  // Sync with Map
  useEffect(() => {
    if (!activeMap || !currentTime) return;
    const cue = activeMap.cues.find(c => Math.abs(c.time - currentTime) < 0.5);
    if (cue) rollVJ();
  }, [activeMap, currentTime]);

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
    const meshModes: VisualizerMode[] = ['shapes', 'neural', 'rings', 'core3d', 'trees', 'platonic', 'helix', 'flower', 'starfield'];
    const modes = [...shaderModes, ...meshModes];
    const shapes: ('box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron')[] = ['box', 'sphere', 'pyramid', 'torus', 'icosahedron'];
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

      const getGeo = (size = 1) => {
        if (vj.shapeType === 'box') return new THREE.BoxGeometry(size, size, size);
        if (vj.shapeType === 'sphere') return new THREE.SphereGeometry(size * 0.6, 12, 12);
        if (vj.shapeType === 'pyramid') return new THREE.ConeGeometry(size * 0.6, size, 4);
        if (vj.shapeType === 'icosahedron') return new THREE.IcosahedronGeometry(size, 0);
        return new THREE.TorusGeometry(size * 0.5, size * 0.2, 8, 24);
      };

      if (activeMode === 'shapes' || activeMode === 'platonic') {
        const count = activeMode === 'shapes' ? 60 : 25;
        for (let i = 0; i < count; i++) {
          const mesh = new THREE.Mesh(getGeo(1.0 + Math.random()), i % 2 === 0 ? pMat : aMat);
          mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
          group.add(mesh);
        }
      } else if (activeMode === 'trees') {
        for (let i = 0; i < 15; i++) {
          const tree = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 8), pMat);
          tree.add(trunk);
          tree.position.set(THREE.MathUtils.randFloatSpread(50), -8, THREE.MathUtils.randFloatSpread(50));
          group.add(tree);
        }
      } else if (activeMode === 'helix') {
        for (let i = 0; i < 120; i++) {
          const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), pMat);
          const t = i * 0.15;
          sphere.position.set(Math.sin(t) * 6, t * 2 - 12, Math.cos(t) * 6);
          group.add(sphere);
        }
      } else if (activeMode === 'starfield') {
        const geo = new THREE.BufferGeometry();
        const verts = [];
        for (let i = 0; i < 3000; i++) verts.push(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(100));
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
        group.add(pts);
      } else if (activeMode === 'flower') {
        for (let i = 0; i < 12; i++) {
          const petal = new THREE.Mesh(new THREE.TorusKnotGeometry(2, 0.5, 100, 16), aMat);
          petal.rotation.z = (i / 12) * Math.PI * 2;
          group.add(petal);
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
  }, [activeMode, isShaderMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe, vj.fov]);

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
        
        if ((avg - sAvg) > 0.35 && avg > lAvg * 1.7 && now > dropCooldown.current) {
          rollVJ(); 
          if (currentTime) recordCue(currentTime, 'DROP');
          dropCooldown.current = now + 6000;
        }

        energyHistory.current.push(avg);
        if (energyHistory.current.length > 40) energyHistory.current.shift();
        const avgHist = energyHistory.current.reduce((a, b) => a + b, 0) / energyHistory.current.length;
        
        if (avg > avgHist * 1.2 && avg > 0.2 && now - lastBeatTime.current > 300) {
          isBeat = true; lastBeatTime.current = now; beatCount.current++;
          const bpm = Math.round(60000 / (now - lastBeatTime.current));
          if (bpm > 40 && bpm < 220) {
            detectedBPM.current = bpm;
            onBPMChange?.(bpm);
          }
          
          if (mode === 'vj' && beatCount.current % 16 === 0) {
            rollVJ();
            if (currentTime) recordCue(currentTime, 'BUILD');
          }
        }

        if (beatCount.current > 0 && beatCount.current % 128 === 0) {
          saveMap(detectedBPM.current);
        }

        if (isShaderMode && shaderPlaneRef.current) {
          const u = (shaderPlaneRef.current.material as THREE.ShaderMaterial).uniforms;
          u.uComplexity.value = vj.complexity;
          u.uZoom.value = THREE.MathUtils.lerp(u.uZoom.value, (beatCount.current % 16) * 0.8, 0.05);
          const modeMap: any = { menger: 0, columns: 1, city: 4, bulb: 15 };
          u.uMode.value = modeMap[activeMode] || 0;
        }

        if (!isShaderMode && meshGroupRef.current) {
          const group = meshGroupRef.current;
          const damping = (0.05 + avg * 0.2);
          group.rotation.y += 0.001 * vj.rotationSpeed * (damping * 8.0);
          const hueShift = (now * 0.01) % 360;

          group.children.forEach((obj, i) => {
            const mesh = obj as THREE.Mesh;
            const distX = 1 + (high * 1.5);
            const distY = 1 + (bass * 2.0);
            const distZ = 1 + (mid * 1.2);
            
            if (isBeat) { mesh.scale.set(distX * 1.15, distY * 1.15, distZ * 1.15); }
            else { mesh.scale.lerp(new THREE.Vector3(distX, distY, distZ), 0.05); }
            
            if (i % 3 === 0 && mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.color.setHSL((vj.primaryHue + hueShift) / 360, 0.8, 0.5 + avg * 0.2);
            }
          });
          if (isBeat) group.position.y = bass * 0.1;
          else group.position.y *= 0.98;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, isBeat ? vj.fov + (avg * 15) : vj.fov, 0.15);
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, isShaderMode, hasAudioAccess, sensitivity, vj, rollVJ, mode, isPlaying, onBPMChange, currentTime, recordCue, saveMap]);

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
