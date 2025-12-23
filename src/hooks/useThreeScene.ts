import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { VJState } from './useVJEngine';

export function useThreeScene(activeMode: string, vj: VJState, photoUrl?: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (activeMode === 'none' || !containerRef.current) return;

    if (!rendererRef.current) {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      cameraRef.current = camera;
      rendererRef.current = renderer;
      meshGroupRef.current = new THREE.Group();
      scene.add(meshGroupRef.current);
    }

    const group = meshGroupRef.current!;
    const camera = cameraRef.current!;
    group.clear();

    const pMat = new THREE.MeshBasicMaterial({ color: vj.pColor, wireframe: vj.wireframe, transparent: true, opacity: 0.7 });
    const aMat = new THREE.MeshBasicMaterial({ color: vj.sColor, wireframe: true, transparent: true, opacity: 0.4 });

    const getGeo = (size = 1, type = vj.shapeType) => {
      if (type === 'box') return new THREE.BoxGeometry(size, size, size);
      if (type === 'sphere') return new THREE.SphereGeometry(size * 0.6, 12, 12);
      if (type === 'pyramid') return new THREE.ConeGeometry(size * 0.6, size, 4);
      if (type === 'icosahedron') return new THREE.IcosahedronGeometry(size, 0);
      return new THREE.TorusGeometry(size * 0.5, size * 0.2, 8, 24);
    };

    const count = vj.objectCount;
    for (let i = 0; i < count; i++) {
      let mesh: THREE.Mesh | undefined;
      let userData: any = {
         phase: Math.random() * Math.PI * 2, speed: 0.5 + Math.random() * 2.0, freqIndex: Math.floor(Math.random() * 128),
         orbitRadius: 10 + Math.random() * 30, driftVec: new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1))
      };

      if (activeMode === 'menger_sponge') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isMengerPart = true;
      }
      else if (activeMode === 'neon_pillars') {
        const h = 2 + Math.random() * 10;
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), pMat.clone());
        mesh.position.set((i % 10 - 5) * 4, -10 + h/2, (Math.floor(i / 10) - 5) * 4);
        userData.isPillar = true; userData.baseH = h;
      }
      else if (activeMode === 'liquid_blob') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(20));
        userData.isBlobPart = true;
      }
      else if (activeMode === 'the_matrix_v2') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.8 }));
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), Math.random() * 40, THREE.MathUtils.randFloatSpread(20));
        userData.isMatrixPart = true;
      }
      else if (activeMode === 'fractal_landmass') {
        mesh = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 4), aMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(60), -10, THREE.MathUtils.randFloatSpread(60));
        userData.isLandPart = true;
      }
      else if (activeMode === 'hyper_torus') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(5 + i, 0.2, 8, 32), pMat.clone());
        userData.isHyperRing = true;
      }
      else if (activeMode === 'recursive_rooms') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(40 - i*2, 40 - i*2, 40 - i*2), aMat.clone());
        userData.isRoom = true;
      }
      else if (activeMode === 'gyroid_membrane') {
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isMembrane = true;
      }
      else if (activeMode === 'neon_ribbons') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 20), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), 0, THREE.MathUtils.randFloatSpread(40));
        userData.isRibbon = true;
      }
      else if (activeMode === 'crystal_growth') {
        mesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.5), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(30));
        userData.isCrystal = true;
      }
      else if (activeMode === 'void_vortex') {
        mesh = new THREE.Mesh(new THREE.TorusGeometry(i * 0.5, 0.1, 8, 32), aMat.clone());
        userData.isVortexRing = true;
      }
      else if (activeMode === 'digital_clouds') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 }));
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), 10 + Math.random() * 20, THREE.MathUtils.randFloatSpread(100));
        userData.isCloud = true;
      }
      else if (activeMode === 'hexagonal_hive') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 6), pMat.clone());
        const x = (i % 10 - 5) * 2; const z = (Math.floor(i / 10) - 5) * 1.73;
        mesh.position.set(x + (Math.floor(i / 10) % 2 * 1), 0, z); mesh.rotation.x = Math.PI / 2;
        userData.isHiveCell = true;
      }
      else if (activeMode === 'mandelbulb') {
        mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), pMat.clone());
        const angle = i * 0.2; const r = Math.sqrt(i) * 2;
        mesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, THREE.MathUtils.randFloatSpread(10));
        userData.isFractalPart = true;
      }
      else if (activeMode === 'lava_sea') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({ color: 0xff4500, wireframe: true }));
        mesh.position.set((i % 10 - 5) * 2.1, -10, (Math.floor(i / 10) - 5) * 2.1);
        userData.isLavaPart = true;
      }
      else if (activeMode === 'shape_storm') {
        mesh = new THREE.Mesh(getGeo(1.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(100));
        userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(0.5), THREE.MathUtils.randFloatSpread(0.5), THREE.MathUtils.randFloatSpread(0.5));
      }
      else if (activeMode === 'neural_web') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isNode = true;
      }
      else if (activeMode === 'vinyl_rain') {
        const discMat = pMat.clone();
        if (photoUrl) {
          const tex = new THREE.TextureLoader().load(photoUrl);
          (discMat as any).map = tex; discMat.needsUpdate = true;
        }
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 0.1, 32), discMat);
        mesh.position.set(THREE.MathUtils.randFloatSpread(60), 30 + Math.random() * 50, THREE.MathUtils.randFloatSpread(20));
        mesh.rotation.x = Math.PI / 2; userData.isVinyl = true;
      }
      else if (activeMode === 'boids_swarm') {
        mesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 3), aMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isBoid = true; userData.velocity = new THREE.Vector3(THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1), THREE.MathUtils.randFloatSpread(1));
      }
      else if (activeMode === 'jellyfish') {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(40));
        userData.isJelly = true;
      }
      else if (activeMode === 'voxelizer') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), pMat.clone());
        mesh.position.set((i % 20) - 10, Math.floor(i / 20) % 20 - 10, 0);
        userData.isVoxel = true; userData.origPos = mesh.position.clone();
      }
      else if (activeMode === 'floating_islands') {
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(2 + Math.random() * 3), pMat.clone());
        mesh.position.set(THREE.MathUtils.randFloatSpread(100), -20 + Math.random() * 40, THREE.MathUtils.randFloatSpread(100));
        userData.isIsland = true;
      }
      else if (activeMode === 'geometric_core') {
        const sizes = [5, 8, 12, 15];
        mesh = new THREE.Mesh(getGeo(sizes[i % 4]), i % 2 === 0 ? pMat.clone() : aMat.clone());
        userData.isCoreLayer = true; userData.layerIndex = i % 4;
      }
      else if (activeMode === 'pong') {
         if (i === 0) { mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), pMat.clone()); mesh.position.set(-15, 0, 0); userData.role = 'paddle_L'; }
         else if (i === 1) { mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 1), pMat.clone()); mesh.position.set(15, 0, 0); userData.role = 'paddle_R'; }
         else { mesh = new THREE.Mesh(new THREE.SphereGeometry(0.8), aMat.clone()); userData.role = 'ball'; userData.vel = new THREE.Vector3(0.4, 0.2, 0); }
      } 
      else if (activeMode === 'invaders') {
         const row = Math.floor(i / 11); const col = i % 11;
         mesh = new THREE.Mesh(getGeo(0.8, 'box'), row % 2 === 0 ? pMat.clone() : aMat.clone());
         mesh.position.set((col - 5) * 2, (row - 2) * 2 + 5, 0);
         userData.role = 'invader'; userData.gridPos = { x: col, y: row };
      }
      else if (activeMode === 'pacman') {
         if (i === 0) { mesh = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: vj.wireframe })); mesh.position.set(0, 0, 0); userData.role = 'pacman'; userData.dir = new THREE.Vector3(1, 0, 0); }
         else if (i < 5) { const colors = [0xff0000, 0x00ffff, 0xffb8ff, 0xffb852]; mesh = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 4, 8), new THREE.MeshBasicMaterial({ color: colors[i-1], wireframe: true })); mesh.position.set((i-2.5)*3, 0, 0); userData.role = 'ghost'; }
         else { mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2), pMat.clone()); const angle = (i / 45) * Math.PI * 2; mesh.position.set(Math.cos(angle)*15, Math.sin(angle)*15, 0); userData.role = 'dot'; }
      }
      else if (activeMode === 'snake') {
         mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), i === 0 ? aMat.clone() : pMat.clone());
         mesh.position.set(-i, 0, 0); userData.role = i === 0 ? 'head' : 'body'; userData.index = i; userData.history = [];
      }
      else if (activeMode === 'tetris') {
         mesh = new THREE.Mesh(new THREE.BoxGeometry(1,1,1), i % 2 === 0 ? pMat.clone() : aMat.clone());
         mesh.position.set(THREE.MathUtils.randFloatSpread(20), THREE.MathUtils.randFloatSpread(30), 0); userData.role = 'block';
      }
      else if (activeMode === 'puzzle') {
         const col = i % 4; const row = Math.floor(i / 4); const spacing = 3.6; const off = -1.5 * spacing;
         mesh = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.5, 0.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
         const x = (col * spacing) + off; const y = (row * spacing) + off;
         mesh.position.set(x, y, 0); userData.gridPos = { x: col, y: row }; userData.targetPos = new THREE.Vector3(x, y, 0); userData.tileId = i;
         if (mesh.material instanceof THREE.MeshBasicMaterial) mesh.material.color.setHSL((vj.primaryHue + (i * 10)) / 360, 0.8, 0.5);
      }
      else if (activeMode === 'tunnel') {
          mesh = new THREE.Mesh(getGeo(1 + Math.random()), i % 2 === 0 ? pMat.clone() : aMat.clone());
          const angle = i * 0.5; const z = -i * 2;
          mesh.position.set(Math.cos(angle) * (10 + Math.random() * 5), Math.sin(angle) * (10 + Math.random() * 5), z);
          mesh.lookAt(0,0,z-10); userData.infiniteZ = true; userData.scrollSpeed = 0.5;
      }
      else if (activeMode === 'city') {
          const h = 1 + Math.random() * 8; mesh = new THREE.Mesh(new THREE.BoxGeometry(2, h, 2), i % 3 === 0 ? pMat.clone() : aMat.clone());
          const row = Math.floor(i / 6); const col = i % 6; const spacing = 4;
          mesh.position.set((col - 2.5) * spacing * 3, -10 + h/2, -row * spacing * 2);
          userData.infiniteZ = true; userData.scrollSpeed = 0.8; userData.baseY = -10 + h/2; userData.isBuilding = true;
      }
      else if (activeMode === 'starfield') {
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2), pMat.clone());
          mesh.position.set(THREE.MathUtils.randFloatSpread(100), THREE.MathUtils.randFloatSpread(60), -Math.random() * 200);
          userData.infiniteZ = true; userData.scrollSpeed = 2.0;
      }
      else if (activeMode === 'matrix') {
          mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), pMat.clone());
          mesh.position.set(THREE.MathUtils.randFloatSpread(40), THREE.MathUtils.randFloatSpread(30), THREE.MathUtils.randFloatSpread(20));
          userData.infiniteY = true; userData.fallSpeed = 0.5 + Math.random();
      }
      else if (activeMode === 'fibonacci') {
          const t = i * 0.1; const r = 2 * Math.sqrt(i) * vj.complexity;
          mesh = new THREE.Mesh(getGeo(1), i % 2 === 0 ? pMat.clone() : aMat.clone());
          mesh.position.set(Math.cos(t) * r, Math.sin(t) * r, i * 0.1 - 10);
      } else if (activeMode === 'voxels') {
          mesh = new THREE.Mesh(getGeo(0.8), pMat.clone());
          mesh.position.set(((i % 10) - 5) * 4, -10, (Math.floor(i / 10) - 5) * 4);
      } else if (activeMode === 'rings') {
          mesh = new THREE.Mesh(new THREE.TorusGeometry(i * 2, 0.1, 8, 64), pMat.clone());
          mesh.position.set(0,0,0);
      } else {
          mesh = new THREE.Mesh(getGeo(0.5 + Math.random() * 1.5), i % 2 === 0 ? pMat.clone() : aMat.clone());
          mesh.position.set(THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60), THREE.MathUtils.randFloatSpread(60));
      }
      
      if (mesh) { mesh.userData = userData; group.add(mesh); }
    }

    camera.fov = vj.fov; camera.updateProjectionMatrix();
    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); rendererRef.current?.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeMode, vj.pColor, vj.sColor, vj.shapeType, vj.wireframe, vj.fov, vj.complexity, vj.objectCount, photoUrl]);

  return { containerRef, sceneRef, cameraRef, rendererRef, meshGroupRef };
}
