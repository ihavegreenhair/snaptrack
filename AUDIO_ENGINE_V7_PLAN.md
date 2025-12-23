# Pro Engine v7.0: Direct Signal Analysis & Waveform Mapping

This plan outlines the transition from a "Passive" YouTube observer to an "Active" Audio Engine that pre-analyzes tracks for perfect visual synchronization.

---

## 🏗️ I. The Local Audio Architecture

### 1. Direct Signal Feed (No More Microphone)
By playing audio directly through a `<audio>` element or `AudioBuffer`, we gain access to the raw PCM data.
- **Benefit:** 100% accuracy in visual response. No room noise interference.
- **Tool:** `AudioContext.createMediaElementSource(audioElement)`.

### 2. Audio Extraction Pipeline (Backend)
Since browsers cannot download YouTube streams directly, we utilize a Supabase Edge Function:
- **Flow:** `YouTube URL` -> `Edge Function` -> `Audio Stream` -> `Temporary URL`.
- **Note:** This requires server-side logic to bypass CORS and extract the audio-only stream.

---

## 🧠 II. Waveform Mapping & "Peak Pre-analysis"

When a song is loaded, the engine performs an **Offline Fast-Scan**:

1.  **Energy Profiling:** The engine scans the entire track in ~500ms to calculate an "Energy Map".
2.  **Visual Cue Generation:** 
    *   **The Drop:** Identifies the highest energy jump (e.g., at 01:15).
    *   **Breakdowns:** Identifies regions where energy falls below 20%.
    *   **The Outro:** Detects the fade-out to trigger "Next Song" pre-loading.
3.  **Timeline Creation:** Generates a JSON map:
    ```json
    {
      "duration": 210,
      "cues": [
        { "time": 0, "type": "INTRO", "vibe": "ambient" },
        { "time": 45, "type": "BUILD", "vibe": "lattice" },
        { "time": 60, "type": "DROP", "vibe": "vortex" }
      ]
    }
    ```

---

## ⚡ III. Phase 1 Implementation (Frontend Core)

### 1. The Audio-Visual Bridge
Replace `NowPlaying.tsx` YouTube logic with a robust custom player.
- **Sync Logic:** The `Visualizer` will now accept a `mediaSource` as a prop instead of relying on `getUserMedia`.

### 2. The "Pre-scan" Logic
Implement a `useAudioMapper` hook that:
- Fetches the audio blob.
- Runs an `OfflineAudioContext` analysis.
- Returns a list of timestamps where the VJ should "Roll the Dice".

---

## 🚀 IV. Roadmap

- [ ] **Step 1:** Implement `useAudioMapper.ts` for browser-side analysis of a test file.
- [ ] **Step 2:** Refactor `Visualizer.tsx` to accept a direct AudioNode.
- [ ] **Step 3:** Update `NowPlaying.tsx` to handle direct audio playback + Submitter Photo as the main UI.
- [ ] **Step 4:** Integrate Edge Function for YT audio extraction.
