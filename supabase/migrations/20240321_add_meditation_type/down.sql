-- Drop index
DROP INDEX IF EXISTS idx_meditation_completions_type;

-- Remove the column
ALTER TABLE meditation_completions DROP COLUMN IF EXISTS meditation_type; 