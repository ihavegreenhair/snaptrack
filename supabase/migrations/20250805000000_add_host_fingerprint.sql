-- Add host_fingerprint column to parties table
ALTER TABLE parties ADD COLUMN host_fingerprint TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_parties_host_fingerprint ON parties(host_fingerprint);