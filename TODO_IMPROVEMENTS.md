# SnapTrack: UI & Feature Roadmap

This document outlines the required UI improvements and missing features to transition SnapTrack from a prototype to a polished production application.

## 🎨 UI Improvements

- **Animations (High Priority):**
  - [ ] **Queue Reordering:** Implement smooth layout animations when songs change position due to votes (using `framer-motion` or CSS View Transitions).
  - [ ] **Submission Feedback:** Add a celebratory animation (e.g., confetti or a "flying photo") when a song is successfully added.
  - [ ] **Vote Feedback:** Add a more prominent visual "ping" or "glow" to the vote count when it changes in real-time.

- **Layout & Responsiveness:**
  - [ ] **Host Dashboard:** Create a dedicated "Host Mode" layout optimized for large screens/TVs, with larger album art and more prominent QR codes.
  - [ ] **Sticky Player:** Ensure the "Now Playing" card remains visible or easily accessible on mobile while scrolling through a long queue.
  - [ ] **Empty States:** Design more visually appealing empty states for the search results and history.

- **Polish:**
  - [ ] **Skeleton Loaders:** Replace standard spinners with content-aware skeleton loaders for the queue and suggestions.
  - [ ] **Micro-interactions:** Add hover states, active states, and sound effects (optional) for button clicks and voting.

## 🚀 Missing Features

- **Queue Management:**
  - [ ] **Manual Reordering (Host):** Allow the host to drag-and-drop songs to override the vote-based order.
  - [ ] **Veto / Blacklist:** Allow hosts to permanently ban certain tracks or artists for the duration of the party.
  - [ ] **Auto-play fallback:** If the queue is empty and auto-add is off, play a "radio" stream based on the party's history.

- **Social & Engagement:**
  - [ ] **Chat / Reactions:** Allow guests to send emojis or short reactions that appear over the YouTube video or in a live stream.
  - [ ] **Song Dedications:** Let users add a short text message ("To my best friend!") that appears when their song plays.
  - [ ] **Enhanced Profiles:** Allow users to choose an avatar if they don't want to take a photo.

- **Technical / Robustness:**
  - [ ] **Offline Handling:** Add a "Reconnecting..." banner and local queue persistence if the connection drops.
  - [ ] **Volume Control (Host):** Allow the host to control the YouTube volume directly from the SnapTrack UI.
  - [ ] **Security:** Implement rate limiting for song submissions to prevent spam.

## 🛠 Stability Fixes (Verified)
- [x] **Delete Policy:** Standardized RLS policies to ensure hosts can reliably remove songs.
- [x] **Theme Consistency:** Ensured all charts and insights components respect the selected theme.
- [x] **Double Countdown:** Fixed the camera countdown from firing twice on certain devices.
