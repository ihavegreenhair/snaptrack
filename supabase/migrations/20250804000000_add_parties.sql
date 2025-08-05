-- Create parties table
CREATE TABLE parties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  party_code TEXT NOT NULL UNIQUE,
  host_password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update queue_items table to include party_id
ALTER TABLE queue_items
ADD COLUMN party_id UUID REFERENCES parties(id) ON DELETE CASCADE;

-- Update policies to be party-specific
DROP POLICY IF EXISTS "Enable read access for all users" ON queue_items;
CREATE POLICY "Enable read access for party members" ON queue_items FOR SELECT USING (party_id = (SELECT party_id FROM queue_items WHERE id = queue_items.id));

DROP POLICY IF EXISTS "Enable insert access for all users" ON queue_items;
CREATE POLICY "Enable insert access for party members" ON queue_items FOR INSERT WITH CHECK (party_id = (SELECT party_id FROM queue_items WHERE id = queue_items.id));

DROP POLICY IF EXISTS "Enable update access for all users" ON queue_items;
CREATE POLICY "Enable update access for party members" ON queue_items FOR UPDATE USING (party_id = (SELECT party_id FROM queue_items WHERE id = queue_items.id));

-- Update votes table to be party-specific
ALTER TABLE votes
ADD COLUMN party_id UUID REFERENCES parties(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Enable read access for all users" ON votes;
CREATE POLICY "Enable read access for party members" ON votes FOR SELECT USING (party_id = (SELECT party_id FROM votes WHERE id = votes.id));

DROP POLICY IF EXISTS "Enable insert access for all users" ON votes;
CREATE POLICY "Enable insert access for party members" ON votes FOR INSERT WITH CHECK (party_id = (SELECT party_id FROM votes WHERE id = votes.id));

DROP POLICY IF EXISTS "Enable update access for all users" ON votes;
CREATE POLICY "Enable update access for party members" ON votes FOR UPDATE USING (party_id = (SELECT party_id FROM votes WHERE id = votes.id));
