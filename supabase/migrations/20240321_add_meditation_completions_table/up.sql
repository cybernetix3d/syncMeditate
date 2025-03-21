-- Create meditation_completions table if not exists
CREATE TABLE IF NOT EXISTS meditation_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    event_id UUID REFERENCES meditation_events(id),
    duration INTEGER NOT NULL,
    completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    meditation_type VARCHAR(20) DEFAULT 'scheduled',
    notes TEXT
);

-- Enable Row Level Security
ALTER TABLE meditation_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for meditation_completions
CREATE POLICY "Users can record own meditation completions"
ON meditation_completions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own meditation completions"
ON meditation_completions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own meditation completions"
ON meditation_completions FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meditation_completions_user_id ON meditation_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_completions_completed_at ON meditation_completions(completed_at);
CREATE INDEX IF NOT EXISTS idx_meditation_completions_type ON meditation_completions(meditation_type); 