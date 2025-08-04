SnapTrack (MVP)
📚 Project Description

SnapTrack is a browser-based social jukebox app designed for parties and events. It plays YouTube videos on a host laptop while allowing guests to queue songs and vote on them — but with a twist: to add a song, users must submit a selfie or photo.

SnapTrack runs in a single shared room with no login or authentication. Guests interact through their phone browsers using a shared URL or QR code, and their submissions/votes update live on the host screen.
🚀 Key Features
🎛️ Host Mode (Laptop View)

    Displays Now Playing YouTube video

    Shows a live-updating queue of upcoming songs

    Each song in the queue includes:

        Video title

        Thumbnail of the submitter's selfie or photo

        Live vote count

    Automatically plays the next song when the current one ends

    Basic admin controls:

        Skip song

        Pause playback

        Clear queue (optional)

📱 Guest Mode (Phone View – Same App, Responsive)

    Search YouTube videos via API

    Submit a song by:

        Selecting a video

        Taking or uploading a photo

    Vote on songs in the queue (+1 or –1)

    Each user can vote once per song (tracked via local storage/fingerprint)

    No accounts, no authentication

🧠 Business Logic

    Queue is ordered by:

        Total vote score (descending)

        Submission time (earlier first, if tied)

    When a video ends, the next highest-ranked unplayed video begins playing

    Songs marked as “played” are not replayed

    Duplicate video IDs are disallowed in the queue

    Songs over a max length (e.g., 6 minutes) are blocked (optional)

🧱 Tech Stack (MVP)
Layer	Tech
Frontend	React + Vite + TailwindCSS or shadcn/ui
Video	YouTube IFrame Player API
Backend	Supabase (Postgres, Realtime, Storage)
Auth	None (anonymous public session)
Hosting	Vercel, Netlify, or static file server
🗃️ Data Schema
queue_items table

Stores all submitted songs.
Field	Type	Notes
id	UUID	Primary key
title	text	Song title
video_id	text	YouTube video ID
photo_url	text	Supabase Storage file URL
submitted_at	timestamp	Default to now()
votes	int	Default 0, used for sorting
played	boolean	Default false
votes table

Tracks per-user (session) votes.
Field	Type	Notes
id	UUID	Primary key
queue_id	UUID	Foreign key to queue_items
fingerprint	text	Session or browser fingerprint
vote	int	+1 or -1
📁 Core Frontend Components

    App.tsx — initializes Supabase, layout

    NowPlaying.tsx — shows current video using YouTube IFrame API

    QueueList.tsx — lists upcoming tracks with voting UI

    SubmitSong.tsx — handles search + upload + submission form

    YouTubeSearch.tsx — calls YouTube Data API v3

    PhotoUploader.tsx — takes or uploads a selfie, saves to Supabase Storage

📦 Supabase Requirements

    Supabase project with:

        Public storage bucket for images

        Realtime enabled

        Public row-level access to queue_items and votes

    Row-level security (RLS) disabled or permissive for MVP

    supabase-js v2 client installed

✅ MVP Success Criteria

    Can play YouTube videos in order based on votes

    Submissions require a photo

    Everyone sees live-updating queue

    Guests can search, submit, and vote with no login

    Mobile-friendly and laptop-ready out of the box