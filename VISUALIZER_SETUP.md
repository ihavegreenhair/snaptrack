# SnapTrack Visualizer Setup & Roadmap

## Current Architecture
- **Engine:** HTML5 Canvas (2D) and Three.js (3D).
- **Audio Data:** Web Audio API (AnalyserNode).
- **Reactivity:** Real-time Microphone sync with host sensitivity control.
- **Auto-VJ Mode:** State-driven transition machine that cycles vibes every 10 seconds.

## Visualizer Modes
### 2D (Canvas)
- **Bars:** Classic frequency spectrum analyzer.
- **Waves:** Fluid sine-wave layers reacting to bass boost.
- **Particles:** Floating nodes that accelerate and glow based on volume.

### 3D (Three.js)
- **Tunnel:** Wireframe torus geometry that scales and pulses.
- **Spheres:** Randomly positioned floating spheres that expand with the beat.
- **Vortex:** A swirling particle field with reactive rotational speed.

## Planned Features
- [ ] **Shader Support:** Implement custom GLSL fragment shaders for trippy background effects.
- [ ] **Album Art Extraction:** Extract dominant colors from the current song's thumbnail to tint the visualizer.
- [ ] **Beat Detection:** More precise "kick" detection to trigger camera cuts or flashes in sync with the BPM.
- [ ] **Transition Effects:** Fade-to-black or white-flash transitions when the Auto-VJ changes modes.
- [ ] **Mood Sync:** Automatically pick specific visualizers based on the current `partyMood` (e.g., chill mood uses Waves, hype mood uses Vortex).

## UI/UX Integration
- **Dashboard Mode:** Optimized for projectors. Hides the YouTube video to focus on visuals.
- **Sensitivity:** Adjustable boost (0.5x to 6.0x) to handle different room acoustics.
