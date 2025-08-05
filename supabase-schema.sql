-- Create queue_items table
CREATE TABLE queue_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  video_id TEXT NOT NULL,
  thumbnail_url TEXT,
  photo_url TEXT NOT NULL,
  submitted_by TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  votes INTEGER DEFAULT 0,
  played BOOLEAN DEFAULT FALSE
);

-- Create votes table
CREATE TABLE votes (
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
CREATE POLICY "Enable read access for all users" ON queue_items FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON queue_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON queue_items FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON votes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON votes FOR UPDATE USING (true);

-- Create function to update vote count
CREATE OR REPLACE FUNCTION update_queue_votes()
RETURNS TRIGGER AS $
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
CREATE TRIGGER update_queue_votes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_queue_votes();

-- Create storage bucket for photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for photo uploads
CREATE POLICY "Enable upload for all users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Enable read access for all users" ON storage.objects FOR SELECT USING (bucket_id = 'photos');