-- Add duration_ms column to music table
ALTER TABLE music ADD COLUMN duration_ms INTEGER;

-- Add index for duration for potential filtering/sorting
CREATE INDEX idx_music_duration_ms ON music(duration_ms);