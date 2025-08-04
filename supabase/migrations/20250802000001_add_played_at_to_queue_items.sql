-- Add played_at column to queue_items table
ALTER TABLE public.queue_items
ADD COLUMN played_at TIMESTAMP WITH TIME ZONE;

-- Optional: Create a policy to allow public read access to played_at column
-- This assumes you want played_at to be visible to all users.
-- If you have more granular RLS, adjust accordingly.
CREATE POLICY "Allow public read access to played_at" ON public.queue_items
FOR SELECT
USING (true);