-- Add dedication and pin columns
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS dedication TEXT;
ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create blacklist table
CREATE TABLE IF NOT EXISTS blacklisted_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(video_id, party_id)
);

-- Add RLS for blacklist
ALTER TABLE blacklisted_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for party members" ON blacklisted_songs
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for everyone" ON blacklisted_songs
  FOR INSERT WITH CHECK (true);
