ALTER POLICY "Users can delete their own skip votes" ON skip_votes
    USING (fingerprint = (SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));