# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SnapTrack is a browser-based social jukebox app for parties and events. It plays YouTube videos on a host laptop while allowing guests to queue songs and vote on them through their phones. The unique feature is that users must submit a selfie or photo to add a song to the queue.

## Architecture

### Tech Stack
- **Frontend**: React + Vite + TailwindCSS (or shadcn/ui)
- **Video Player**: YouTube IFrame Player API
- **Backend**: Supabase (Postgres, Realtime, Storage)
- **Authentication**: None (anonymous public session)
- **Hosting**: Vercel, Netlify, or static file server

### Core Components Structure
- `App.tsx` — Main app initialization with Supabase setup and layout
- `NowPlaying.tsx` — Current video display using YouTube IFrame API
- `QueueList.tsx` — Live-updating song queue with voting interface
- `SubmitSong.tsx` — Song search, photo upload, and submission workflow
- `YouTubeSearch.tsx` — YouTube Data API v3 integration
- `PhotoUploader.tsx` — Camera/upload interface for selfies, saves to Supabase Storage

### Database Schema
- `queue_items` table: Stores submitted songs with title, video_id, photo_url, votes, played status
- `votes` table: Tracks user votes per song using browser fingerprints

### Key Business Logic
- Queue ordering: Primary by vote score (descending), secondary by submission time
- Auto-play next highest-ranked unplayed video when current ends
- Duplicate video IDs blocked in queue
- One vote per user per song (tracked via browser fingerprint/local storage)
- Songs marked as "played" never replay

## Development Setup

Since this is a new project with only MVP documentation, you'll need to:

1. Initialize the project structure based on the React + Vite + TailwindCSS stack
2. Set up Supabase project with public storage bucket and realtime enabled
3. Configure YouTube Data API v3 access
4. Implement the core components as outlined in MVP.md

## Key Features

### Host Mode (Laptop)
- Full-screen YouTube video player
- Live queue display with thumbnails and vote counts
- Admin controls: skip, pause, clear queue

### Guest Mode (Mobile-responsive)
- YouTube video search
- Photo capture/upload requirement for song submission
- Live voting interface (+1/-1 per song)
- No authentication required

## Important Considerations

- This is a public, anonymous app with no user authentication
- Requires careful handling of Supabase RLS policies for public access
- Mobile-first responsive design essential for guest experience
- Real-time updates critical for live party environment
- Photo storage and display must be performant for party settings