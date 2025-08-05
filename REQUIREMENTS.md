# SnapTrack Host-Client System Requirements

This document outlines the requirements for implementing a multi-user, host-client system for SnapTrack.

## 1. Core Concepts

- **Party:** A temporary, shared session for a group of users. Each party has a unique, shareable code.
- **Host:** The user who controls the party and music playback. There is only one host per party at a time.
- **Client:** A user who joins a party to participate by adding and voting on songs.
- **Party Code:** A short, unique, alphanumeric code that allows clients to join a specific party (e.g., `a6b19`).
- **Host Password:** A password set by the initial host to allow for host privileges to be transferred to another user.

## 2. Functional Requirements

### 2.1. Party Management

- **Create Party:** A user can create a new party. Upon creation:
    - A unique, easy-to-share Party Code is generated.
    - The creator sets a Host Password for the party.
    - The creator automatically becomes the Host.
- **Join Party:**
    - A user can join an existing party by entering a valid Party Code.
    - Alternatively, a user can join by navigating directly to a party-specific URL (e.g., `snaptrack.com/a6b19`).
- **End Party:** The host should have an option to end the party, which would clear the queue and disconnect all clients.

### 2.2. Roles and Permissions

#### 2.2.1. Host Role

- The Host has all the permissions of a regular user and more.
- **Playback Control:**
    - Play, pause, and skip the current song.
    - Manually reorder the upcoming queue.
- **Queue Management:**
    - Remove any song from the queue.
    - Clear the entire queue.
- **Host Transfer:**
    - Another user can gain Host privileges by entering the correct Host Password for the current party. This allows for host-switching without interrupting the party.

#### 2.2.2. Client Role

- Clients have a limited set of permissions focused on participation.
- **View-Only:**
    - View the currently playing song.
    - View the upcoming song queue.
    - View the history of played songs and their associated photos.
- **Interaction:**
    - Add new songs to the queue.
    - Vote on songs in the queue.
    - Upload photos for songs they have queued.

### 2.3. User Interface & Routing

- **Entry Point:** The main page of the application should present two options: "Create a Party" or "Join a Party".
- **Party URL:** Each party will have a dedicated URL structure, incorporating the Party Code (e.g., `snaptrack.com/party/a6b19`).
- **Host View:** The UI for the host will include the playback and queue management controls.
- **Client View:** The UI for the client will be simplified, hiding the host-specific controls.
- **Host Authentication:** An interface element (e.g., a button or modal) should be available for a user to input the Host Password and gain host privileges.

## 3. Non-Functional Requirements

- **Usability:** The distinction between the Host and Client views should be clear and intuitive. Joining a party should be a seamless process.
- **State Management:** The application state (queue, current song, etc.) must be synchronized in real-time across all participants of a party.
- **Security:** The Host Password should be handled securely.
