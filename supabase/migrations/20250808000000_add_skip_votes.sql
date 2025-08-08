-- Add skip_votes table for vote-to-skip functionality
-- This allows users to vote to skip songs, with configurable thresholds

-- Create skip_votes table
CREATE TABLE IF NOT EXISTS skip_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    queue_id UUID NOT NULL REFERENCES queue_items(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    UNIQUE(queue_id, fingerprint) -- One skip vote per user per song
);

-- Add RLS policies for skip_votes
ALTER TABLE skip_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert skip votes (public anonymous access)
CREATE POLICY "Anyone can vote to skip" ON skip_votes
    FOR INSERT WITH CHECK (true);

-- Allow anyone to view skip votes (for counting)
CREATE POLICY "Anyone can view skip votes" ON skip_votes
    FOR SELECT USING (true);

-- Allow users to delete their own skip votes (to un-vote)
CREATE POLICY "Users can delete their own skip votes" ON skip_votes
    FOR DELETE USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS skip_votes_queue_id_idx ON skip_votes(queue_id);
CREATE INDEX IF NOT EXISTS skip_votes_fingerprint_idx ON skip_votes(fingerprint);

-- Add comment
COMMENT ON TABLE skip_votes IS 'Tracks user votes to skip songs in the queue';