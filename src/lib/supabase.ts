/**
 * Supabase client configuration for SnapTrack
 * Handles database operations, real-time subscriptions, and file storage
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables - check .env file')
}

// Initialize Supabase client with anonymous access (no authentication required)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Type definition for queue items in the database
 * Represents a song submission with voting data
 */
export type QueueItem = {
  id: string;
  created_at: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  votes: number;
  submitted_by: string;
  played: boolean;
  played_at?: string | null;
  photo_url: string;
  submitted_at: string;
  party_id: string;
};

/**
 * Type definition for vote records in the database
 * Tracks individual user votes on queue items
 */
export type Vote = {
  id: string
  queue_id: string
  fingerprint: string
  vote: number // 1 for upvote, -1 for downvote
}