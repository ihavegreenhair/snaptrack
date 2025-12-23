import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/utils';
import { useSongMapper } from '@/hooks/useSongMapper';
import { useVisualizerAudio } from '@/hooks/useVisualizerAudio';
import { useVJEngine } from '@/hooks/useVJEngine';
import { useThreeScene } from '@/hooks/useThreeScene';

export type VisualizerMode = 
  | 'menger' | 'city' | 'tunnel' | 'matrix' | 'shapes' | 'rings' | 'starfield' | 'fibonacci' | 'voxels' 
  | 'pong' | 'invaders' | 'pacman' | 'snake' | 'tetris' | 'puzzle' | 'population'
  | 'menger_sponge' | 'neon_pillars' | 'liquid_blob' | 'the_matrix_v2' | 'fractal_landmass' 
  | 'hyper_torus' | 'recursive_rooms' | 'gyroid_membrane' | 'neon_ribbons' | 'crystal_growth'
  | 'void_vortex' | 'digital_clouds' | 'hexagonal_hive' | 'mandelbulb' | 'lava_sea'
  | 'shape_storm' | 'neural_web' | 'vinyl_rain' | 'boids_swarm' | 'audio_rings_v2'
  | 'jellyfish' | 'voxelizer' | 'spring_field' | 'particle_fountain' | 'floating_islands'
  | 'light_trails' | 'physics_pile' | 'string_theory' | 'geometric_core' | 'mirror_prism'
  | 'vj' | 'none';

interface VisualizerProps {
  mode: VisualizerMode;
  isPlaying: boolean;
  isDashboard?: boolean;
  sensitivity?: number;
  maxEntities?: number;
  rotationSpeed?: number;
  crazyFactor?: number;
  onBPMChange?: (bpm: number) => void;
  onBeatConfidenceChange?: (confidence: number) => void;
  videoId?: string;
  songTitle?: string;
  photoUrl?: string;
  currentTime?: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ 
  mode, 
  isPlaying, 
  isDashboard, 
  sensitivity = 1.5, 
  maxEntities = 60,
  rotationSpeed = 1.0,
  crazyFactor = 1.0,
  onBPMChange, 
  onBeatConfidenceChange, 
  videoId, 
  songTitle, 
  photoUrl, 
  currentTime 
}) => {
  const { activeMap } = useSongMapper(videoId, songTitle);
  const { vj, activeMode, rollVJ, vibeFlash } = useVJEngine(mode);
  
  const { analysis, updateAnalysis } = useVisualizerAudio({
    isPlaying, sensitivity, videoId, activeMap, currentTime, onBPMChange,
    onBeatTrigger: () => { /* Global beat sync */ },
    onAICue: () => rollVJ()
  });

  // Apply Parameter Overrides to VJ State
  const effectiveVJ = {
    ...vj,
    objectCount: maxEntities,
    rotationSpeed: rotationSpeed * vj.rotationSpeed, // Multiplier
  };

  const { containerRef, sceneRef, cameraRef, rendererRef, meshGroupRef } = useThreeScene(activeMode, effectiveVJ, photoUrl);
  const requestRef = useRef<number | null>(null);

  // Sync state for UI
  useEffect(() => {
    onBeatConfidenceChange?.(analysis.confidence);
  }, [analysis.confidence, onBeatConfidenceChange]);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      const res = updateAnalysis(now);
      
      if (rendererRef.current && sceneRef.current && cameraRef.current && meshGroupRef.current) {
        const group = meshGroupRef.current;
        const cam = cameraRef.current;
        const hueShift = (now * 0.05) % 360;
        
        const isBuildUp = res.tension > 3.0;
        const buildupFactor = Math.min(res.tension / 5, 1);
        
        // Use the new crazyFactor prop as a base multiplier
        const baseCrazy = 1.0 + (Math.max(0, res.gradient) * 10.0) + (res.tension * 0.5);
        const finalCrazyFactor = baseCrazy * crazyFactor;
        
        const rotSpeed = effectiveVJ.rotationSpeed * (isBuildUp ? (1 + buildupFactor * 4) : 1) * finalCrazyFactor;

        // --- ADAPTIVE VJ ROLLING ---
        // Instead of locking, we just slow down the probability
        let rollChance = 0.99; // Standard 1% chance per frame at high tension
        if (res.isBreakdown) rollChance = 0.998; // 0.2% chance (5x slower)
        if (res.isBuilding) rollChance = 0.995; // 0.5% chance (2x slower)

        if (res.tension > 5.0 && Math.random() > rollChance) rollVJ();

        // 1. Global Scene Movement
        const isGame = ['pong', 'invaders', 'pacman', 'snake', 'tetris', 'puzzle'].includes(activeMode);
        const isInfinite = ['city', 'tunnel', 'matrix', 'shapes', 'rings', 'starfield', 'fibonacci', 'voxels', 'population'].includes(activeMode);
        
        if (!isGame && !isInfinite) {
           group.rotation.y += 0.002 * rotSpeed;
        } else if (isGame) {
           if (activeMode !== 'puzzle') {
               // Limit game rotation to prevent camera flying out (Black Screen fix)
               group.rotation.y = Math.sin(now * 0.0002) * 0.05 * finalCrazyFactor; 
               group.rotation.x = Math.sin(now * 0.0001) * 0.03 * finalCrazyFactor;
           } else {
               group.rotation.z = Math.sin(now * 0.005) * 0.05 * res.bass * finalCrazyFactor;
           }
        }

        // 2. Camera Physics
        const targetFov = res.isBeat ? vj.fov + (res.sub * 5 * finalCrazyFactor) : vj.fov + (isBuildUp ? -10 : 0); 
        cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 0.2);
        
        // Stabilize Camera Frustum
        cam.position.z = THREE.MathUtils.lerp(cam.position.z, 45, 0.05);
        cam.updateProjectionMatrix();

        if (isBuildUp || res.gradient > 0.05) {
            const shake = (buildupFactor * 0.3) + (Math.max(0, res.gradient) * 3.0);
            cam.position.x = THREE.MathUtils.lerp(cam.position.x, (Math.random() - 0.5) * shake, 0.5);
            cam.position.y = THREE.MathUtils.lerp(cam.position.y, (Math.random() - 0.5) * shake, 0.5);
        } else {
            // Smoothly return to center to avoid black screens
            cam.position.x = THREE.MathUtils.lerp(cam.position.x, 0, 0.1);
            cam.position.y = THREE.MathUtils.lerp(cam.position.y, 0, 0.1);
        }

        // 3. Object Modulation
        group.children.forEach((obj, i) => {
          const mesh = obj as THREE.Mesh;
          const agent = mesh.userData;
          if (!agent) return;

          let intensity = 0;
          if (agent.freqIndex < 10) intensity = res.sub;
          else if (agent.freqIndex < 30) intensity = res.bass;
          else if (agent.freqIndex < 80) intensity = res.mid;
          else intensity = res.high;
          intensity *= finalCrazyFactor;

          if (agent.isMengerPart) {
            mesh.rotation.x += 0.01 * finalCrazyFactor; mesh.rotation.y += 0.01 * finalCrazyFactor;
            if (res.isBeat) mesh.scale.setScalar(1.5 * finalCrazyFactor); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isPillar) {
            mesh.scale.y = 1 + intensity * 10; mesh.position.y = -10 + (mesh.scale.y * (agent.baseH || 1) / 2);
          }
          else if (agent.isBlobPart) {
            mesh.position.x += Math.sin(now * 0.001 + (agent.phase || 0)) * 0.1;
            mesh.position.y += Math.cos(now * 0.001 + (agent.phase || 0)) * 0.1;
            if (res.isBeat) mesh.scale.setScalar(2); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isMatrixPart) {
            mesh.position.y -= 0.5 + res.high; if (mesh.position.y < -20) mesh.position.y = 20;
          }
          else if (agent.isLandPart) {
            mesh.scale.y = 1 + res.sub * 5;
          }
          else if (agent.isHyperRing) {
            mesh.rotation.x += 0.01 * (i % 3 + 1); mesh.rotation.z += 0.01; mesh.scale.setScalar(1 + res.mid * 0.5);
          }
          else if (agent.isRoom) {
            mesh.rotation.y += 0.005 * (i + 1);
            if (res.isBeat) mesh.scale.setScalar(1.1); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isMembrane) {
            mesh.position.z += Math.sin(now * 0.002 + i) * res.sub;
          }
          else if (agent.isRibbon) {
            mesh.rotation.z += 0.05 + res.high;
          }
          else if (agent.isCrystal) {
            mesh.rotation.x += 0.02; if (res.isSnare) mesh.scale.setScalar(2); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isVortexRing) {
            mesh.rotation.x = now * 0.001; mesh.scale.setScalar(1 + res.bass);
          }
          else if (agent.isCloud) {
            mesh.position.x += 0.05; if (mesh.position.x > 50) mesh.position.x = -50;
          }
          else if (agent.isHiveCell) {
            mesh.scale.z = 1 + intensity * 5;
          }
          else if (agent.isFractalPart) {
            mesh.rotation.y += 0.02; mesh.position.z = Math.sin(now * 0.001 + i) * 5;
          }
          else if (agent.isLavaPart) {
            mesh.position.y = -10 + Math.sin(now * 0.002 + i) * res.bass * 5;
          }
          else if (agent.isVinyl) {
            mesh.position.y -= 0.1 + res.bass * 0.5; mesh.rotation.z += 0.05 + res.mid * 0.1;
            if (mesh.position.y < -30) mesh.position.y = 30;
          }
          else if (agent.isNode) {
            if (agent.driftVec) mesh.position.addScaledVector(agent.driftVec, 0.05);
            if (mesh.position.length() > 40 && agent.driftVec) agent.driftVec.negate();
            if (res.isSnare) mesh.scale.setScalar(2); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (agent.isBoid) {
            if (agent.velocity) {
                mesh.position.add(agent.velocity); mesh.lookAt(mesh.position.clone().add(agent.velocity));
                if (mesh.position.length() > 50) mesh.position.setScalar(0);
                if (res.isBeat) agent.velocity.add(new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.2), THREE.MathUtils.randFloatSpread(0.2), THREE.MathUtils.randFloatSpread(0.2)));
            }
          }
          else if (agent.isJelly) {
            mesh.scale.y = 1 + Math.sin(now * 0.005) * 0.2 + res.sub * 0.5;
            mesh.position.y += Math.sin(now * 0.002 + (agent.phase || 0)) * 0.1;
          }
          else if (agent.isVoxel) {
            mesh.position.z = Math.sin(mesh.position.distanceTo(new THREE.Vector3(0,0,0)) * 0.5 - now * 0.005) * (res.sub * 10.0);
          }
          else if (agent.isIsland) {
            mesh.position.y += Math.sin(now * 0.001 + (agent.phase || 0)) * 0.05; mesh.rotation.y += 0.01;
          }
          else if (agent.isCoreLayer) {
            mesh.rotation.x += 0.01 * ((agent.layerIndex || 0) + 1) * (1 + res.bass);
            mesh.rotation.y += 0.015 * ((agent.layerIndex || 0) + 1);
            if (res.isBeat) mesh.scale.setScalar(1.1); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (activeMode === 'pong') {
             if (agent.role === 'ball' && agent.vel) {
                 mesh.position.add(agent.vel);
                 if (mesh.position.y > 10 || mesh.position.y < -10) agent.vel.y *= -1;
                 if (mesh.position.x > 14 || mesh.position.x < -14) { agent.vel.x *= -1; agent.vel.multiplyScalar(1.05); agent.vel.clampLength(0.2, 0.8); }
                 if (res.isBeat) { agent.vel.multiplyScalar(1.2); mesh.scale.setScalar(1.5); } else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
             } else if (agent.role?.startsWith('paddle')) {
                 const ball = group.children.find(c => c.userData.role === 'ball');
                 if (ball) {
                     const lag = 0.05 + ((intensity/crazyFactor) * 0.1); 
                     mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, ball.position.y, lag);
                     mesh.position.y = THREE.MathUtils.clamp(mesh.position.y, -8, 8);
                 }
             }
          }
          else if (activeMode === 'invaders') {
              if (agent.gridPos) {
                mesh.position.x = ((agent.gridPos.x - 5) * 2) + Math.sin(now * 0.001) * 5;
                if (res.isBeat) mesh.position.y -= 0.5;
                if (mesh.position.y < -15) mesh.position.y = 15;
                mesh.position.y += Math.sin(now * 0.005 + agent.gridPos.x) * 0.2;
              }
              if (res.isSnare && Math.random() > 0.8) mesh.scale.y = 2; else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (activeMode === 'snake') {
              if (agent.role === 'head') {
                  mesh.position.x = Math.sin(now * 0.002) * 10; mesh.position.y = Math.cos(now * 0.001) * 8; mesh.position.z = Math.sin(now * 0.003) * 5;
                  if (agent.history) { agent.history.unshift(mesh.position.clone()); if (agent.history.length > 50) agent.history.pop(); }
              } else {
                  const head = group.children[0];
                  if (head && head.userData?.history?.[agent.index || 0]) mesh.position.copy(head.userData.history[agent.index || 0]);
              }
              if (res.isBeat) mesh.scale.setScalar(1.2); else mesh.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          }
          else if (activeMode === 'pacman') {
              if (agent.role === 'pacman') {
                  mesh.position.x = Math.sin(now * 0.002) * 12; mesh.position.z = Math.cos(now * 0.002) * 12;
                  if (agent.dir) mesh.lookAt(mesh.position.clone().add(agent.dir));
                  mesh.scale.y = 1 - Math.abs(Math.sin(now * 0.01)) * 0.5;
              } else if (agent.role === 'ghost') {
                  const pacman = group.children[0];
                  if (pacman) {
                      const dir = new THREE.Vector3().subVectors(pacman.position, mesh.position).normalize();
                      mesh.position.addScaledVector(dir, 0.15); mesh.lookAt(pacman.position);
                  }
              }
          }
          else if (activeMode === 'tetris') {
              mesh.position.y -= 0.05 + (res.sub * 0.2);
              if (mesh.position.y < -20) { mesh.position.y = 20; mesh.position.x = THREE.MathUtils.randFloatSpread(20); }
              if (res.isBeat) mesh.rotation.z += Math.PI / 2;
          }
          else if (activeMode === 'city') {
              if (agent.isBuilding) {
                  mesh.scale.y = 1 + (res.bass * 5); mesh.position.y = (agent.baseY || 0) + (mesh.scale.y / 2);
              }
          }
          else {
              let tSX = 1 + (intensity/finalCrazyFactor) * vj.distortionScale;
              let tSY = 1 + (intensity/finalCrazyFactor) * vj.distortionScale;
              let tSZ = 1 + (intensity/finalCrazyFactor) * vj.distortionScale;
              if (res.isBeat && agent.freqIndex < 20) { tSX *= 1.5; tSY *= 1.5; tSZ *= 1.5; }
              mesh.scale.lerp(new THREE.Vector3(tSX * finalCrazyFactor, tSY * finalCrazyFactor, tSZ * finalCrazyFactor), 0.2);

              if (!agent.infiniteZ && !agent.infiniteY) {
                  const time = now * 0.001 * (agent.speed || 1);
                  const jitter = (res.high * 0.5) + (buildupFactor * 0.5);
                  if (agent.driftVec) mesh.position.addScaledVector(agent.driftVec, Math.sin(time + (agent.phase || 0)) * 0.02 * (vj.motionIntensity * finalCrazyFactor));
                  if (jitter > 0.1) { mesh.position.x += (Math.random() - 0.5) * jitter; mesh.position.y += (Math.random() - 0.5) * jitter; mesh.position.z += (Math.random() - 0.5) * jitter; }
              }
          }

          if (mesh.material instanceof THREE.MeshBasicMaterial) {
            const baseHue = i % 2 === 0 ? vj.primaryHue : vj.secondaryHue;
            const activeHue = isBuildUp ? THREE.MathUtils.lerp(baseHue, 0, buildupFactor) : (baseHue + hueShift) % 360;
            const lightness = res.isBeat ? 0.7 : (0.4 + (intensity/finalCrazyFactor) * 0.4);
            mesh.material.color.setHSL(activeHue / 360, isBuildUp ? 1.0 : 0.8, lightness);
            mesh.material.opacity = res.spectralFlatness > 0.6 ? 0.2 + (Math.random() * 0.5) : 0.7; 
          }
        });

        rendererRef.current.render(sceneRef.current, cam);
      }
      requestRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [activeMode, vj, rollVJ, updateAnalysis, analysis.confidence]);

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
