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
$$ LANGUAGE plpgsql SECURITY DEFINER;