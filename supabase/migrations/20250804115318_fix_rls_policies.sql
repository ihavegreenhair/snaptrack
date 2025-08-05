-- Fix RLS policies for queue_items and votes tables

-- Enable RLS on tables
ALTER TABLE queue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Ensure all functions are security definer and search_path is set correctly
ALTER FUNCTION public.get_queue_item_votes(item_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_queue_item_votes(item_id uuid) SECURITY DEFINER;

ALTER FUNCTION public.get_party_id_from_queue_item(item_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_party_id_from_queue_item(item_id uuid) SECURITY DEFINER;

ALTER FUNCTION public.get_party_id_from_vote(vote_id uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_party_id_from_vote(vote_id uuid) SECURITY DEFINER;

-- Add a policy to allow authenticated users to update their own votes
CREATE POLICY "Allow authenticated users to update their own votes"
ON public.votes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Add a policy to allow authenticated users to delete their own votes
CREATE POLICY "Allow authenticated users to delete their own votes"
ON public.votes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add a policy to allow authenticated users to insert votes
CREATE POLICY "Allow authenticated users to insert votes"
ON public.votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
