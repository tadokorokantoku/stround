-- Add Spotify integration columns to profiles table
ALTER TABLE profiles ADD COLUMN spotify_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN spotify_access_token TEXT;
ALTER TABLE profiles ADD COLUMN spotify_refresh_token TEXT;
ALTER TABLE profiles ADD COLUMN spotify_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Add index for Spotify ID for efficient lookups
CREATE INDEX idx_profiles_spotify_id ON profiles(spotify_id);