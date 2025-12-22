# VJ Brain v5.0: The "Auditory Cortex" Engine

This specification defines the transition from simple 3D geometry to a mathematical, Raymarching-based generative engine.

---

## 🧠 I. The Auditory Cortex (Deep Signal Analysis)

Instead of just "volume," we now analyze the signal across 5 semantic bands:
1.  **Sub-Bass (20-60Hz):** Drives the "Pulse" and "Shockwaves" in the Raymarching distance fields.
2.  **Bass (60-250Hz):** Drives the "Kick" triggers and camera focal length jumps.
3.  **Low-Mids (250-1kHz):** Drives the "Neural Web" connections and geometric complexity.
4.  **High-Mids (1k-4kHz):** Drives "Texture Sharpness" and Edge-Glow (Bloom).
5.  **Highs (4k-20kHz):** Drives "Spark Particles" and high-frequency "Glitch" artifacts.

---

## 🌌 II. The Infinite Engine (Raymarching SDFs)

We are moving the rendering logic into **GLSL Fragment Shaders**. The world is defined by math (Signed Distance Fields), not triangles.

### 1. Generative Biomes (Modes):
- **The Menger Sponge:** A recursive, fractal city that unfolds based on High-Mid intensity.
- **Voxel Field:** A 3D grid of blocks that "melts" into liquid during breakdowns.
- **The Core:** A singular, morphing heart that reacts to Sub-Bass by warping its surface.
- **Infinite Pillars:** A procedural forest of light-pillars that pulse with the detected BPM.

---

## 🎬 III. The Structural Director

- **Tension Accumulator:** A rolling 5-second buffer. As energy increases, the shader's "Chromatic Aberration" and "FOV" scale linearly.
- **The 16-Beat Phrase Lock:** Mode changes and "World Warps" are hard-locked to the end of 16-beat phrases.
- **Camera AI:** The camera now follows a "Spline Path" that avoids geometry and snaps to a "Rule of Thirds" composition on the downbeat.

---

## 🎨 IV. Aesthetic: "Cinematic Club"

- **Unreal Bloom:** Every light source in the shader glows with a soft, cinematic haze.
- **Scanlines & Noise:** Subtle overlays to give a "projector in a dark club" feel.
- **Palette Sync:** Every 16 beats, a new professionally-curated palette is chosen (Cyberpunk, Toxic, Inferno).
