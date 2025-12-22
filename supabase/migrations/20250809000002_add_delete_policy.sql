-- Enable delete access for party members (so hosts can remove songs)
CREATE POLICY "Enable delete access for party members" ON queue_items 
FOR DELETE USING (
  party_id = (SELECT party_id FROM queue_items WHERE id = queue_items.id)
);