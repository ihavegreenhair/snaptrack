# Overhaul Plan: Unified Song Submission Flow

## Current Issues
1. **Nested Modals:** `AddSongModal` -> `SubmitSong` -> `CameraModal`. This leads to UI glitches and "modal hell".
2. **Fragmented Logic:** Submission logic is split across three files, making it hard to maintain.
3. **UX Friction:** The transition from choosing a song to taking a photo is jarring.
4. **Camera Reliability:** The current camera logic relies on fragile `setTimeout` chains and nested effects.

## Proposed Solution: `SongSubmissionFlow.tsx`
A single, state-driven component that replaces `SubmitSong.tsx`, `PhotoUploader.tsx`, and `CameraModal.tsx`.

### Step-by-Step Flow
1. **Step 1: Discover** (YouTube Search + AI Suggestions)
2. **Step 2: Personalize** (Confirm song selection + Enter Dedication)
3. **Step 3: Capture** (Inline Camera preview + Countdown or File Upload)
4. **Step 4: Celebration** (Success animation)

### Technical Improvements
- **Single Context:** All submission state (selected video, dedication, photo blob) lives in one place.
- **Inline Camera:** The camera preview will be rendered directly inside the submission dialog, not in a separate modal.
- **Clean Transitions:** Use smooth step-based transitions.
- **Reliable Camera:** Rewritten camera initialization using a robust state machine (Idle -> Initializing -> Active -> CountingDown -> Captured).

## Component Deletion List
After implementation, the following will be removed:
- `src/components/SubmitSong.tsx`
- `src/components/PhotoUploader.tsx`
- `src/components/CameraModal.tsx`
- `src/components/AddSongModal.tsx` (Will be replaced by a cleaner entry point)
