-- Alter queue_items table to add missing columns
ALTER TABLE public.queue_items ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.queue_items ADD COLUMN IF NOT EXISTS submitted_by TEXT;

-- Create votes table if it doesn't exist
CREATE TABLE IF NOT EXISTS votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  queue_id UUID REFERENCES queue_items(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,
  vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(queue_id, fingerprint)
);

-- Enable Row Level Security
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (MVP - no authentication)
DROP POLICY IF EXISTS "Enable read access for all users" ON queue_items;
CREATE POLICY "Enable read access for all users" ON queue_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON queue_items;
CREATE POLICY "Enable insert access for all users" ON queue_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON queue_items;
CREATE POLICY "Enable update access for all users" ON queue_items FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable read access for all users" ON votes;
CREATE POLICY "Enable read access for all users" ON votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert access for all users" ON votes;
CREATE POLICY "Enable insert access for all users" ON votes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for all users" ON votes;
CREATE POLICY "Enable update access for all users" ON votes FOR UPDATE USING (true);


-- Create function to update vote count
CREATE OR REPLACE FUNCTION update_queue_votes()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE queue_items 
  SET votes = (
    SELECT COALESCE(SUM(vote), 0) 
    FROM votes 
    WHERE queue_id = COALESCE(NEW.queue_id, OLD.queue_id)
  )
  WHERE id = COALESCE(NEW.queue_id, OLD.queue_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update vote counts
DROP TRIGGER IF EXISTS update_queue_votes_trigger ON votes;
CREATE TRIGGER update_queue_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_votes();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for photo uploads
DROP POLICY IF EXISTS "Enable upload for all users" ON storage.objects;
CREATE POLICY "Enable upload for all users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');

DROP POLICY IF EXISTS "Enable read access for all users" ON storage.objects;
CREATE POLICY "Enable read access for all users" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
