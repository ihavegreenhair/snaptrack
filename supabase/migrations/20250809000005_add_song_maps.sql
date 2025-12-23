-- Table to store crowdsourced visual maps for YouTube videos
CREATE TABLE IF NOT EXISTS song_maps (
  video_id TEXT PRIMARY KEY,
  bpm INTEGER,
  cues JSONB DEFAULT '[]'::jsonb, -- Array of {time: number, type: string}
  energy_profile FLOAT[] DEFAULT '{}', -- Low-res energy map for the breakdown detection
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE song_maps ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read maps
CREATE POLICY "Anyone can read song maps" ON song_maps
  FOR SELECT USING (true);

-- Allow anyone to contribute/update maps (upsert logic)
CREATE POLICY "Anyone can contribute song maps" ON song_maps
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update song maps" ON song_maps
  FOR UPDATE USING (true);
