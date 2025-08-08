-- Add unique constraint to prevent duplicate unplayed songs in the same party
-- This constraint ensures that for each party, a video_id can only exist once if played = false
-- Multiple entries are allowed if played = true (for history tracking)

-- Create a partial unique index that only applies to unplayed songs
-- Note: Cannot use CONCURRENTLY in migration transactions, so using regular CREATE INDEX
CREATE UNIQUE INDEX IF NOT EXISTS unique_unplayed_songs_per_party 
ON queue_items (party_id, video_id) 
WHERE played = false;

-- Add a comment to document the constraint purpose
COMMENT ON INDEX unique_unplayed_songs_per_party IS 'Prevents duplicate unplayed songs within the same party';