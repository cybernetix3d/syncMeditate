-- Add meditation_type column to meditation_completions table
ALTER TABLE meditation_completions ADD COLUMN IF NOT EXISTS meditation_type VARCHAR(20) DEFAULT 'scheduled';

-- Update existing records to have the default value
UPDATE meditation_completions SET meditation_type = 'scheduled' WHERE meditation_type IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN meditation_completions.meditation_type IS 'Type of meditation: scheduled, quick, or global';

-- Create an index on the column for faster queries
CREATE INDEX IF NOT EXISTS idx_meditation_completions_type ON meditation_completions(meditation_type); 