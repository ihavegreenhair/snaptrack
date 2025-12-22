# Suggested Improvements & Features

This document outlines potential enhancements for SnapTrack, categorized by area of impact.

## 🎨 UI/UX Improvements

- **Animations & Transitions:**
  - Add smooth layout transitions when queue items reorder (using `framer-motion` or View Transitions API).
  - Add a "flying photo" animation when a user submits a song, moving their photo from the submission modal to the queue.
  - Implement a visual "pulse" or confetti effect when a song gets a lot of upvotes.

- **Theme Customization:**
  - Allow hosts to select different "Party Themes" (e.g., Neon Night, Retro 80s, Beach Vibes) that change colors and fonts.
  - Implement a true Dark/Light mode toggle that respects system preferences but allows manual override.

- **Onboarding:**
  - Add a quick "How to Play" tutorial overlay for first-time guests.
  - Improve the empty state on the Host view to be more inviting and instructional.

- **Accessibility:**
  - Ensure all interactive elements have proper `aria-labels` (e.g., voting buttons).
  - Verify color contrast ratios for text on photos/gradients.
  - Add keyboard navigation support for the queue and modals.

## 🚀 New Features

- **"Battle Mode" / Versus:**
  - A special mode where two songs go head-to-head, and the winner plays next.
  - Guests vote for "Left" or "Right".

- **Host Announcements:**
  - Allow the host to send a text notification ("Pizza is here!", "Last call!") that pops up on all guest screens as a toast or modal.

- **Lyrics Integration:**
  - Display synchronized lyrics on the Host screen (if available via an API like Musixmatch) for a karaoke-lite experience.

- **Spotify/Apple Music Integration:**
  - Allow users to search via Spotify (often better search quality) but still play the YouTube equivalent.
  - "Save to Spotify": Allow guests to save the party playlist to their personal Spotify account.

- **"Veto" Power:**
  - Give the host a "Veto" button that doesn't just skip, but visually "burns" or removes a song with a fun animation.

- **User Profiles (Expanded):**
  - Let users choose an avatar if they don't want to take a photo.
  - Show "Top DJ" stats on the party screen (e.g., "Kyle has the most upvoted songs tonight!").

## 🛠 Technical & Architecture

- **State Management:**
  - Consider moving from simple React Context + Supabase subscriptions to a more robust local-first sync engine (like `replicache` or `electric-sql`) if scaling to thousands of concurrent users.
  - Implement optimistic UI updates for *all* actions (voting, submitting) to make the app feel instant even on bad party WiFi.

- **Backend / Security:**
  - **Rate Limiting:** stricter controls on submission rates per IP/fingerprint to prevent spam.
  - **Content Moderation:** Integrate an AI vision API (like Google Vision or AWS Rekognition) to auto-flag inappropriate photos before they hit the screen.
  - **Testing:** Add comprehensive E2E tests (Playwright/Cypress) for the critical "Join -> Submit -> Vote" flow.

- **Performance:**
  - Implement virtualization (e.g., `react-window`) for the history list if parties go on for hours and accumulate hundreds of songs.
  - optimize image delivery (resize/compress photos on upload via Supabase Edge Functions).

## 🐛 Known / Potential Bugs to Watch

- **YouTube API Quotas:** The app relies on the YouTube Data API. Heavy usage could hit rate limits. *Mitigation: Cache search results aggressively or rotate API keys.*
- **Browser Autoplay Policies:** Browsers often block autoplay. Ensure the "Click to Start" overlay on the Host screen is robust.
- **Connection Drops:** If a host disconnects, the party pauses. Consider a "Backup Host" feature where another device can take over playback state.
