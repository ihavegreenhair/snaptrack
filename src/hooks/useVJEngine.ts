import { useState, useCallback } from 'react';
import * as THREE from 'three';
import type { VisualizerMode } from '../components/Visualizer';

export interface VJState {
  mode: VisualizerMode;
  pColor: THREE.Color;
  sColor: THREE.Color;
  primaryHue: number;
  secondaryHue: number;
  complexity: number;
  objectCount: number;
  rotationSpeed: number;
  motionIntensity: number;
  distortionScale: number;
  individualDamping: number;
  wireframe: boolean;
  shapeType: 'box' | 'sphere' | 'pyramid' | 'torus' | 'icosahedron';
  fov: number;
}

const PALETTES = [
  { p: '#ff00ff', s: '#00ffff', ph: 300, sh: 180 }, { p: '#39ff14', s: '#bcff00', ph: 110, sh: 80 },
  { p: '#ff4500', s: '#ff8c00', ph: 15, sh: 30 }, { p: '#710193', s: '#00ffcc', ph: 280, sh: 160 },
  { p: '#ffffff', s: '#555555', ph: 0, sh: 0 }, { p: '#ff0055', s: '#ffcc00', ph: 340, sh: 45 }
];

const catalogA: VisualizerMode[] = [
  'menger_sponge', 'neon_pillars', 'liquid_blob', 'the_matrix_v2', 'fractal_landmass',
  'hyper_torus', 'recursive_rooms', 'gyroid_membrane', 'neon_ribbons', 'crystal_growth',
  'void_vortex', 'digital_clouds', 'hexagonal_hive', 'mandelbulb', 'lava_sea'
];

const catalogB: VisualizerMode[] = [
  'shape_storm', 'neural_web', 'vinyl_rain', 'boids_swarm', 'audio_rings_v2',
  'jellyfish', 'voxelizer', 'spring_field', 'particle_fountain', 'floating_islands',
  'light_trails', 'physics_pile', 'string_theory', 'geometric_core', 'mirror_prism'
];

export function useVJEngine(mode: VisualizerMode) {
  const [vj, setVj] = useState<VJState>({
    mode: 'shapes', pColor: new THREE.Color(PALETTES[0].p), sColor: new THREE.Color(PALETTES[0].s),
    primaryHue: PALETTES[0].ph, secondaryHue: PALETTES[0].sh, complexity: 1, objectCount: 60,
    rotationSpeed: 1.0, motionIntensity: 1.0, distortionScale: 1.0, individualDamping: 0.1,
    wireframe: true, shapeType: 'box', fov: 75
  });

  const [currentVibe, setCurrentVibe] = useState<VisualizerMode>('shapes');
  const [vibeFlash, setVibeFlash] = useState(false);
  const activeMode = mode === 'vj' ? currentVibe : mode;

  const rollVJ = useCallback(() => {
    const geometryModes: VisualizerMode[] = ['city', 'tunnel', 'matrix', 'shapes', 'rings', 'starfield', 'fibonacci', 'voxels', 'population'];
    const gameModes: VisualizerMode[] = ['pong', 'invaders', 'pacman', 'snake', 'tetris', 'puzzle'];
    const rand = Math.random();
    let modes: VisualizerMode[] = rand < 0.25 ? catalogA : rand < 0.50 ? catalogB : rand < 0.75 ? geometryModes : gameModes;
    const nextMode = modes[Math.floor(Math.random() * modes.length)];
    const shapes: VJState['shapeType'][] = ['box', 'sphere', 'pyramid', 'torus', 'icosahedron'];
    const p = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    
    let count = Math.floor(20 + Math.pow(Math.random(), 2) * 180);
    if (['pong', 'invaders', 'pacman', 'snake', 'tetris', 'puzzle', 'population'].includes(nextMode)) {
        if (nextMode === 'pong') count = 3; else if (nextMode === 'invaders') count = 55; else if (nextMode === 'pacman') count = 50;
        else if (nextMode === 'snake') count = 20; else if (nextMode === 'tetris') count = 40; else if (nextMode === 'puzzle') count = 15;
        else count = 0;
    }

    setCurrentVibe(nextMode);
    setVj(prev => ({
      ...prev, pColor: new THREE.Color(p.p), sColor: new THREE.Color(p.s), primaryHue: p.ph, secondaryHue: p.sh,
      complexity: 0.5 + Math.random() * 2.5, objectCount: count, rotationSpeed: 0.2 + Math.random() * 2.0,
      motionIntensity: 0.5 + Math.random() * 2.0, distortionScale: 0.5 + Math.random() * 3.0,
      individualDamping: 0.02 + Math.random() * 0.2, wireframe: Math.random() > 0.3,
      shapeType: shapes[Math.floor(Math.random() * shapes.length)], fov: 60
    }));
    setVibeFlash(true);
    setTimeout(() => setVibeFlash(false), 300);
  }, []);

  return { vj, setVj, activeMode, rollVJ, vibeFlash };
}
