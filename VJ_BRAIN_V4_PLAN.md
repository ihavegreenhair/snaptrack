# VJ Brain v4.0: The "Immersive Nexus" Overhaul

This plan outlines the total refactor of the SnapTrack visualizer engine to move from "reactive graphics" to a "professional generative performance" system.

---

## 🛠 I. Architectural Refactor (Performance & Stability)

### 1. The "Stable Camera" Paradigm
- **Issue:** Current camera jitter is jarring and causes objects to fly out of view (Black Screen bug).
- **v4.0 Fix:**
  - **Fixed Viewport:** Camera stays at `(0, 0, 20)` with a fixed look-at.
  - **Object-Space Motion:** Move the `MeshGroup` instead of the camera.
  - **Safe-Zones:** All geometry is constrained within a visibility frustum so it *cannot* leave the screen.
  - **Lerp Everything:** Use linear interpolation for all movements to ensure buttery smooth transitions even on high-refresh monitors.

### 2. Scene Management
- **Persistence:** Instead of `group.clear()` which causes the black-flicker, use a "Cross-Fade" approach where the new module fades in while the old one fades out.
- **Instanced Rendering:** Use `InstancedMesh` to render 10,000+ objects with 60fps performance on mobile.

---

## 🎨 II. The "Billions of Outcomes" Engine

We will move from 12 parameters to a **Nested Randomization Tree**:

### 1. Geometry Randomizers
- **Morphed Primitives:** Objects that transition between Cubes -> Spheres -> Torus based on song energy.
- **Fractal Growth:** Objects that duplicate themselves in patterns (Fibonacci, Grid, Random) on the 16th beat.

### 2. Color & Material Brain
- **Palette Logic:** Instead of random Hues, use "Artist Palettes" (e.g., `Cyberpunk`, `Toxic`, `Pastel`, `Monochrome`).
- **NowPlaying Sync:** Extract the average color from the submitter's selfie and use it as the base for the visualizer's palette.
- **Reactive Opacity:** Materials become wireframe on Highs and solid on Bass.

### 3. Environment & Lighting
- **Pulsing Point Lights:** 4 lights in the corners that change color and intensity with the mids.
- **Volumetric Fog:** Thickens during breakdowns, clears during the drop.

---

## 🚀 III. New "VJ PRO" Features (Missing Items)

- [ ] **Post-Processing (The "Lit" Filter):**
  - **Unreal Bloom:** High-quality neon glow on all edges.
  - **Chromatic Aberration:** "Glitch" the colors slightly on every kick.
  - **Film Grain:** Add a gritty, club-like texture.
- [ ] **Selfie Projection:**
  - Map the submitter's photo onto 3D floating "Vinyls" or screens within the 3D space.
- [ ] **Lyric/Text Particles:**
  - If a song has a dedication, explode the text into particles that fly toward the "camera".
- [ ] **Auto-VJ Intelligence:**
  - Detect song "Silence" vs "Noise" to auto-pause/play animations.

---

## 🛠 IV. Technical Suggestions for "Billions of Possibilities"

1.  **Seed-Based Generation:** Every song gets a unique ID which acts as a "Seed". The same song will always have its own unique "Visual Identity" unless changed.
2.  **Noise Fields:** Use 3D Perlin Noise to drive object positions, creating "flowing" organic movement.
3.  **Symmetry Engines:** Add "Mirror Modes" (Vertical, Horizontal, Radial) that can be toggled on/off.
4.  **Speed Modifiers:** Half-time visuals for slow songs, 2x speed for high-BPM tracks.
