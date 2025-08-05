# SnapTrack - MVP Task List

This list is strictly ordered to achieve the Minimum Viable Product (MVP) as defined in `MVP.md`. Tasks should be completed sequentially.

## Phase 1: Foundational MVP Features

*These tasks are the absolute minimum required for the app to function as described in the MVP.* 

- [x] **Project Setup:** Initialize React + Vite + TailwindCSS project.
- [x] **Supabase Setup:** Configure Supabase client and create initial database migration.
- [x] **Component Scaffolding:** Create placeholder files for all core components.
- [x] **Submission Workflow (Core Logic):**
    - [x] Implement YouTube video search (`YouTubeSearch.tsx`). *(Note: Currently using a mock API to ensure stability).* 
    - [x] Implement photo capture/upload (`PhotoUploader.tsx`).
    - [x] Implement the main submission logic in `SubmitSong.tsx`.
- [x] **Basic Queue Display (`QueueList.tsx`):**
    - [x] Fetch and display the list of unplayed songs.
    - [x] Show video title and submitter's photo.
- [x] **Basic Video Playback (`NowPlaying.tsx`):
    - [x] Load and play the highest-voted song.
    - [x] Trigger `onEnded` function when a song finishes.
- [x] **Core App Logic (`App.tsx`):**
    - [x] Implement `handleSongEnd` to advance to the next song.
    - [x] Ensure components receive the correct data.

## Phase 2: MVP Interactivity & Real-time Updates

*With the foundation in place, this phase makes the app interactive and live.* 

- [x] **Voting System (`QueueList.tsx`):**
    - [x] Add UI buttons for upvoting and downvoting.
    - [x] Implement `handleVote` to write to the `votes` table.
    - [x] Use browser fingerprinting for vote uniqueness.
- [x] **Real-time Updates:**
    - [x] Use Supabase Realtime to update the queue on new songs and votes.
    - [x] Ensure the queue is always sorted correctly.
- [x] **Host Controls (`NowPlaying.tsx`):**
    - [x] Implement the "Skip Song" button.
    - [x] Implement the "Play/Pause" button.

## Phase 3: MVP Polish & Finalization

*These tasks address the final requirements to meet the MVP definition.* 

- [x] **Duplicate Song Prevention:** Implement a check to prevent duplicate unplayed songs from being added.
- [x] **Final UI Cleanup & Polish:**
    - [x] Add loading indicators for searching, submitting, and voting.
    - [x] Improve the camera preview in `PhotoUploader.tsx` (e.g., make it mirrored, add a retake button).
    - [x] Improve empty states for the queue and search results.
- [x] **Responsive Design:**
    - [x] Ensure the layout works correctly on both mobile (guest) and desktop (host) screens.

---

*Tasks below this line are considered post-MVP enhancements.*

## Post-MVP Polish

- [x] **Advanced Host Controls:** Implement a "Clear Queue" button.
- [x] **Time Formatting:** Convert timestamps to a user-friendly format (e.g., "2 minutes ago").
- [x] **Code Quality:** Remove `console.log` statements, add comments, and consider refactoring.
- [x] **Library Upgrade:** Upgrade `fingerprintjs2` to a more modern alternative.

---

## Feature: Host-Client System

*Implementation of the multi-user party system as defined in `REQUIREMENTS.md`.*

### Phase 1: Database and Backend

- [x] **Database Schema:**
    - [x] Design and create a `parties` table to store the party code and hashed host password.
    - [x] Add a `party_id` foreign key to the `queue_items` table.
- [x] **Supabase Functions:**
    - [x] Create a `create-party` function that generates a unique code, hashes the host password, and inserts a new party.
    - [x] Create a `join-party` function that validates a given party code.
    - [x] Create a `set-host` function that validates a host password against the stored hash for a party.

### Phase 2: Routing and UI Structure

- [x] **Routing Setup:**
    - [x] Install and configure `react-router-dom`.
    - [x] Implement a root route (`/`) for the new landing page.
    - [x] Implement a dynamic route for parties (e.g., `/party/:partyCode`).
- [x] **Component Creation:**
    - [x] Create a `HomePage.tsx` component for the Create/Join Party UI.
    - [x] Create a `PartyPage.tsx` component that will contain the main app logic, replacing the current `App.tsx` content.
    - [x] Create a `HostAuthModal.tsx` for users to enter the host password.

### Phase 3: State Management and UI Logic

- [x] **State Management:**
    - [x] Create a `PartyContext` to manage the current party state (code, isHost, etc.) across the application.
    - [x] Refactor existing Supabase queries to be scoped by `party_id`.
    - [x] Ensure real-time subscriptions are specific to the user's current party.
- [x] **UI Logic:**
    - [x] On the `HomePage`, implement the logic to call the `create-party` and `join-party` functions and redirect the user.
    - [x] In the `PartyPage`, implement conditional rendering for host vs. client views.
    - [x] Implement the flow for a client to become a host using the `HostAuthModal` and the `set-host` function.

### Phase 4: Final Integration

- [x] **App Entry Point:** Update `main.tsx` to use the new routing structure.
- [x] **Cleanup:** Refactor `App.tsx` to be a simple container for the router, or remove it if `PartyPage.tsx` fully replaces it.
- [ ] **Testing:** Manually test the entire host-client flow, including creating, joining, and switching hosts.