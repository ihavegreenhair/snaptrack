-- Create user_profiles table to map fingerprints to names
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint TEXT NOT NULL,
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one name per fingerprint per party
  UNIQUE(fingerprint, party_id)
);

-- Add RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read user profiles (for display purposes)
CREATE POLICY "Anyone can read user profiles" ON user_profiles
  FOR SELECT USING (true);

-- Allow anyone to insert their own profile
CREATE POLICY "Anyone can insert user profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "Anyone can update user profiles" ON user_profiles
  FOR UPDATE USING (true);

-- Create index for efficient lookups
CREATE INDEX idx_user_profiles_fingerprint_party ON user_profiles(fingerprint, party_id);
CREATE INDEX idx_user_profiles_party ON user_profiles(party_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();