# SnapTrack

SnapTrack is a browser-based social jukebox app designed for parties and events. It plays YouTube videos on a host device while allowing guests to queue songs and vote on them — but with a social twist: to add a song, users must submit a selfie or photo.

## 🚀 Features

- **Multi-user Parties**: Create or join unique party rooms using a short code.
- **Visual Queue**: Every song in the queue is paired with the submitter's photo.
- **Democratic Playback**: Upvote or downvote songs to influence the play order.
- **AI Song Suggestions**: Personalized song recommendations based on the party's current vibe and history.
- **Party Insights**: Real-time stats showing Top DJs, Crowd Favorites, and the current Party Vibe.
- **Host Controls**: Full control over playback (play/pause/skip) and queue management.
- **Responsive Design**: Works perfectly on both mobile (guests) and desktop (host).

## 🛠 Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Backend**: Supabase (Postgres, Realtime, Edge Functions, Storage)
- **AI**: Gemini 2.0 (via Supabase Edge Functions)
- **Video**: YouTube IFrame Player API

## 🏁 Getting Started

### Prerequisites

- Node.js (v18+)
- Supabase CLI (optional, for local development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your Supabase credentials.
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.