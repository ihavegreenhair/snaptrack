# SnapTrack Pro: Club-Grade VJ Engine Specification

This document outlines the architecture and implementation roadmap for a professional-grade, autonomous VJ system integrated into SnapTrack. The goal is to provide a "Projector-First" experience that rivals professional VJ software like Resolume or Resolume Arena, but fully automated.

---

## I. Core Engine Architecture: The "VJ Pipeline"

A professional setup requires a **Hybrid Generative Pipeline** that separates data analysis from rendering.

### 1. The Audio Brain (Input Layer)
Instead of simple volume, the engine must extract a rich data stream from the Web Audio API:
- [x] **Frequency Binning:** Split audio into 3 logical bands:
  - **Bass (20-250Hz):** Drives camera shakes, scale pulses, and flash triggers.
  - **Mids (250-4000Hz):** Drives procedural geometry complexity and wireframe thickness.
  - **Highs (4000-20kHz):** Drives particle emission rates and high-frequency "glitch" artifacts.
- [x] **Onset Detection (Transient Analysis):**
  - Detect "Kicks" vs "Snares" to trigger specific visual events (e.g., a background color swap on every kick).
- [x] **RMS Smoothing:** Calculate the average power (loudness) to drive global "Energy" variables.

### 2. Rendering Stack
- [x] **Three.js (3D Layer):** WebGL-based geometry, lighting, and cameras.
- [x] **GLSL Shaders (FX Layer):** Custom fragment shaders for post-processing (Bloom, Chromatic Aberration, CRT scanlines, Kaleidoscopes).
- [x] **Canvas 2D (Overlay Layer):** Vector-based HUDs, typography, and text dedications.

---

## II. Generative Visual Modules

A "Club-Grade" system uses modular plugins. Each module below is a unique generative world:

### 1. "The Grid" (3D Plane)
- [x] A vast, infinite neon grid floor reacting to the bass.
- [x] **Pro Feature:** The grid warps upwards into mountains (perlin noise) based on the current song's energy level.

### 2. "Neural Network" (Generative Nodes)
- [x] 500+ points floating in 3D space. Lines automatically draw between points that are within a certain distance.
- [x] **Pro Feature:** Lines pulse with light when a "Snare" is detected. Points accelerate during the chorus.

### 3. "Hyper-Tunnel" (Recursive Geometry)
- [x] A non-linear tunnel where the user "flies" through rotating hexagonal rings.
- [x] **Pro Feature:** On "Kicks", the camera field-of-view (FOV) zooms in/out rapidly (Beat-matching zoom).

### 4. "Raymarching Blobs" (GLSL Shaders)
- [x] Procedural "Lava Lamp" style blobs that merge and split.
- [x] **Pro Feature:** Colors are derived from the dominant colors of the "Now Playing" submitter's photo.

---

## III. The "Auto-VJ" Logic (Automation)

The system functions as an autonomous artist by managing state transitions:

- [x] **State Machine Transitions:**
  - **The "Drop" Detection:** When Energy (RMS) spikes by >40% in 1 second, trigger a high-intensity mode (e.g., Vortex with Strobe).
  - **The "Breakdown" Detection:** When frequency data drops below a threshold, switch to "Waves" or "Particles" with slow camera movements.
- [x] **Intelligent Camera:**
  - Automated "Orbital Camera" that rotates around 3D scenes.
  - Camera "Cuts" happen on every 4th or 8th bar (simulated BPM sync).


---

## IV. Professional Layout (Dashboard Pro)

When in **Dashboard Mode**, the UI should adhere to "Glassmorphism" principles to avoid distracting from the visuals:

- **Floating Sidebar (Right 30%):** 
  - `backdrop-filter: blur(20px)`
  - Semi-transparent black backgrounds (`rgba(0,0,0,0.4)`).
- **Dynamic HUD:**
  - A small, animated "BPM Meter" (simulated or analyzed).
  - Visual feedback for the "Sensitivity" level.
- **Typography:**
  - Heavy use of Monospace fonts for the Party Code.
  - Large, italicized "Now Playing" titles that fade in/out during song transitions.

---

## V. Technical Roadmap (Next Steps)

1. [ ] **GLSL Post-Processing:** Add a "Bloom" pass to make neon colors glow.
2. [ ] **Beat Detection:** Implement a logic-based "Kick" detector for more aggressive visual cuts.
3. [ ] **Texture Mapping:** Project the submitter's selfie onto 3D objects (e.g., a rotating cube or sphere) within the visualizer.
4. [ ] **Genre-Awareness:** Use the AI `reason` or `metadata` to pick the visualizer style (e.g., "Rock" uses high-contrast Bars, "Chill" uses Waves).
