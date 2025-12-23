# SnapTrack - Python Port Specification

This document outlines the functional requirements, Input/Output (I/O) specifications, and database schema required to port the SnapTrack application to a Python environment (e.g., a Headless Server, Desktop Kiosk, or Discord Bot).

## 1. System Overview

SnapTrack is a **collaborative music queuing system** with a **reactive visualizer**.
*   **Core Function:** Users (Guests) submit songs and vote on the queue via a web interface. The Host (Python App) plays the music and renders visuals.
*   **Architecture:** Client-Server model using **Supabase (PostgreSQL)** as the central state of truth.
*   **Real-time:** The Python application must subscribe to Database changes (INSERT/UPDATE/DELETE) to react instantly to user submissions.

---

## 2. Input / Output (I/O) Model

### Inputs (To the Python App)
1.  **Database Stream (Supabase Realtime):**
    *   **Queue Updates:** New song submissions (`INSERT` on `queue_items`).
    *   **Vote Updates:** Changes in song priority (`UPDATE` on `votes` -> triggers score recalc).
    *   **Skip Votes:** Requests to skip current track (`INSERT` on `skip_votes`).
    *   **Host Commands:** Play/Pause/Stop/Clear commands from the dashboard.
2.  **Audio Signal (Raw Audio):**
    *   System audio loopback or direct stream from the music player (e.g., via `ffmpeg` or `mpv`).
    *   *Used for:* FFT Analysis (Frequency), Amplitude, Beat Detection.

### Outputs (From the Python App)
1.  **Audio Playback:**
    *   Audio output to system speakers (Music).
2.  **Visual Render:**
    *   3D Graphics window (OpenGL/Vulkan via libraries like `PyOpenGL`, `ModernGL`, or `ursina`).
    *   *Note:* The Javascript version uses Three.js. Python can replicate the "Game Modes" and "Infinite Geometries" using vertex/fragment shaders.
3.  **Database Updates:**
    *   **Now Playing Status:** Marking songs as `played = TRUE`.
    *   **Playback Timestamp:** Updating current seek position (optional, for syncing clients).
    *   **Song Maps:** Saving detected BPM/Cues back to `song_maps` table.

---

## 3. Database Schema & Interaction

The Python application serves as the **Host**. It requires Read/Write access to the following tables.

### A. `parties` (Session State)
*   **Purpose:** Manages the active party session.
*   **Key Columns:**
    *   `id` (UUID): Primary Key.
    *   `code` (String): The 4-digit join code (e.g., "ABCD").
    *   `host_fingerprint` (String): ID of the host device.
    *   `is_active` (Boolean): Whether the party is live.
*   **Python Logic:**
    *   On startup, create or resume a party entry.
    *   Set `is_active = TRUE`.

### B. `queue_items` (The Playlist)
*   **Purpose:** Stores songs submitted by users.
*   **Key Columns:**
    *   `id` (UUID): Primary Key.
    *   `party_id` (FK): Links to `parties`.
    *   `video_id` (String): YouTube Video ID (e.g., "dQw4w9WgXcQ").
    *   `title` (String): Song Title.
    *   `thumbnail_url` (String): URL to artwork.
    *   `score` (Integer): Calculated priority (Votes).
    *   `played` (Boolean): `FALSE` = In Queue, `TRUE` = History.
    *   `played_at` (Timestamp): When the song started playing.
    *   `is_pinned` (Boolean): If true, stays at top regardless of score.
*   **Python Logic:**
    *   **Polling/Subscription:** Listen for `INSERT` where `played = FALSE`.
    *   **Sorting:** Always play the item where `played = FALSE` with the highest `score` (and `is_pinned` first).
    *   **Transition:** When a song finishes, update the row: `SET played = TRUE, played_at = NOW()`.

### C. `votes` (Ranking Logic)
*   **Purpose:** Raw user votes that determine the `score`.
*   **Key Columns:**
    *   `queue_id` (FK): Link to song.
    *   `user_fingerprint` (String): User ID.
    *   `vote_value` (Int): `1` (Upvote) or `-1` (Downvote).
*   **Python Logic:**
    *   Ideally, use a Database Trigger/View to calculate `score` on `queue_items`.
    *   If handling manually: `score = SUM(vote_value)` for a `queue_id`.

### D. `skip_votes` (Moderation)
*   **Purpose:** Collaborative skipping.
*   **Key Columns:**
    *   `queue_id` (FK): The song being voted to skip.
    *   `fingerprint`: User ID.
*   **Python Logic:**
    *   Listen for `INSERT`.
    *   Check `COUNT(*)` for the current song.
    *   If `count > threshold` (e.g., 3 or 50% of active users), trigger **Force Next Track**.

### E. `song_maps` (Audio Analysis Data)
*   **Purpose:** Stores analyzed data for visuals (BPM, Drop times).
*   **Key Columns:**
    *   `video_id` (String): YouTube ID.
    *   `bpm` (Int): Detect beats per minute.
    *   `energy_map` (JSON): Time-stamped cues (e.g., `[{ "time": 60.5, "type": "DROP" }]`).
*   **Python Logic:**
    *   **Read:** Before playing a song, check if a map exists. If yes, preload cues for the Visualizer.
    *   **Write:** If the Python audio analyzer detects a beat/drop, save it here for future playback.

---

## 4. Visualizer Logic Porting

The current React Visualizer uses a "Game Loop" architecture (`requestAnimationFrame`). The Python port should replicate this state machine:

### State Machine
1.  **Mode:** Enum (`tunnel`, `city`, `pong`, `puzzle`, etc.).
2.  **Phase:** `FLOW` -> `BUILD` -> `DROP`.
3.  **Counters:** `barPhase` (1-4 beats), `phrasePhase` (1-16 bars).

### Audio Processing (Backend)
Instead of WebAudio API, use **`numpy`** and **`pyaudio`**:
1.  **FFT (Fast Fourier Transform):** Calculate frequency spectrum 60 times/second.
2.  **Bands:** Isolate `Sub-Bass` (20-60Hz) and `Highs` (2kHz+).
3.  **Beat Detection:**
    *   Track rolling average of Sub-Bass energy.
    *   Trigger `BEAT` if `Current > Avg * 1.3`.
4.  **Game Logic:**
    *   *Pong:* Update ball/paddle X/Y coordinates based on physics + Beat triggers.
    *   *Puzzle:* Randomly swap grid tiles on Beat.

---

## 5. Suggested Python Stack

*   **Database:** `supabase` (official Python client) or `psycopg2` (direct Postgres).
*   **Audio Playback:** `mpv` (via `python-mpv`) or `vlc`.
*   **Audio Analysis:** `librosa` (offline) or `numpy` + `scipy` (realtime).
*   **Visuals:** `ModernGL` (high performance) or `Processing.py`.
*   **YouTube:** `yt-dlp` (to extract audio stream URL for the player).
