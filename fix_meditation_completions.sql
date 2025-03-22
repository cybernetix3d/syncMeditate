-- Add meditation_type column to user_meditation_history (which seems to be called meditation_completions)
ALTER TABLE meditation_completions ADD COLUMN IF NOT EXISTS meditation_type TEXT;

-- If the table doesn't exist, create it
CREATE TABLE IF NOT EXISTS meditation_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES meditation_events(id),
    date TIMESTAMPTZ DEFAULT NOW(),
    duration INTEGER NOT NULL,
    tradition TEXT,
    meditation_type TEXT,
    notes TEXT,
    mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
    mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
    tags TEXT[] DEFAULT '{}'
);

-- Enable RLS on the table
ALTER TABLE meditation_completions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for meditation_completions
DROP POLICY IF EXISTS "Users can record own meditation completions" ON meditation_completions;
CREATE POLICY "Users can record own meditation completions"
ON meditation_completions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own meditation completions" ON meditation_completions;
CREATE POLICY "Users can view own meditation completions"
ON meditation_completions FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own meditation completions" ON meditation_completions;
CREATE POLICY "Users can update own meditation completions"
ON meditation_completions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meditation_completions_user_id ON meditation_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_completions_date ON meditation_completions(date); 