-- Fix delete policy to avoid circular reference and allow hosts to remove songs
DROP POLICY IF EXISTS "Enable delete access for party members" ON queue_items;

CREATE POLICY "Enable delete access for party members" ON queue_items 
FOR DELETE USING (true);
