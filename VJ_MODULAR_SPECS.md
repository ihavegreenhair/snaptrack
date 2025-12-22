# SnapTrack: Modular 3D VJ Engine Specifications

This document defines the parameters and logic for the fully 3D, modular visualizer system. The goal is infinite variety through the combination of independent modules and randomized attributes.

---

## I. Global VJ Parameters (The "Master Bus")

These parameters affect the entire engine regardless of the active module:

- **Audio Inputs:**
  - `bassIntensity`: Drives scale, displacement, and camera shakes.
  - `midIntensity`: Drives rotation speed and geometry complexity.
  - `highIntensity`: Drives emission intensity and particle speed.
  - `beatTrigger`: Triggers color swaps, camera cuts, or geometry resets.
- **Color Palette:**
  - `primaryColor`: HSL-based (Hue randomized 0-360).
  - `secondaryColor`: Offset from primary (Complementary, Analogous, or Triadic).
  - `backgroundColor`: Deep black, dark themed, or gradient skybox.
  - `colorFadeSpeed`: How fast the palette shifts during a song.
- **Camera Behaviors:**
  - `camMode`: Orbital, Fly-through, Static, or "Drunk" (Wandering).
  - `camFOV`: 40 (Zoomed) to 120 (Fish-eye).
  - `camShake`: Amount of random jitter on beat triggers.
  - `camAutoRotate`: Speed and direction of global rotation.

---

## II. Modular Visualization Components

Each module has its own specific set of "Rollable" inputs:

### 1. 3D Audio Bars (Replaces 2D Bars)
- **Geometry:** Boxes, Cylinders, or Pyramids.
- **Layout:** Circular, Linear, or Grid-based.
- **Reactivity:** Height-only or Height + Width expansion.
- **Material:** Solid, Wireframe, or Neon-Glow (MeshStandardMaterial).

### 2. Generative Terrain (Replaces 2D Waves)
- **Topology:** Infinite Plane or Spherical Shell.
- **Deformation:** Perlin Noise vs Sine Wave interference.
- **Density:** Vertex count (Low-poly vs High-fidelity).
- **Flow:** Scroll speed along the Z-axis.

### 3. Hyper-Cloud (Replaces 2D Particles)
- **Shape:** Cubes, Spheres, Icosahedrons, or Custom Sprites.
- **Count:** 50 to 1000 nodes.
- **Gravity:** Floating (Zero-G) vs Centripetal (Sucking into center).
- **Trace:** Whether particles leave trails (using buffer clearing delay).

### 4. Neural Web
- **ConnectDistance:** Distance at which lines appear between nodes.
- **LineThickness:** Reacts to Mid frequencies.
- **NodeSpeed:** Global velocity of the web nodes.

---

## III. VJ Automation Logic

The **Auto-VJ Mode** handles the "Show" by making decisions on musical boundaries:

1. **The 16-Beat Roll:** 
   - Every 16 beats, the engine rolls for a **New Module**.
   - Every 4 beats, the engine rolls for a **Camera Cut** (Change position/angle).
   - "None" mode is excluded from the randomized selection pool.
2. **The Drop Event:**
   - On high-energy detected peaks:
     - Swap `primary` and `secondary` colors instantly.
     - Increase `fov` by 20% temporarily.
     - Force `wireframe: true` for 1 bar.
3. **The Fade:**
   - Smooth interpolation (lerp) between color shifts to prevent jarring jumps unless it's a "Drop" event.
