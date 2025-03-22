-- Create event_rsvps table if not exists
CREATE TABLE IF NOT EXISTS event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES meditation_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reminder_sent BOOLEAN DEFAULT FALSE,
  notification_id TEXT,
  UNIQUE(event_id, user_id)
);

-- Add RLS policies
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- Allow users to see all RSVPs (for counting purposes)
DROP POLICY IF EXISTS "Users can view all RSVPs" ON event_rsvps;
CREATE POLICY "Users can view all RSVPs" 
  ON event_rsvps FOR SELECT 
  USING (true);

-- Allow users to create/delete their own RSVPs
DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON event_rsvps;
CREATE POLICY "Users can manage their own RSVPs" 
  ON event_rsvps FOR ALL 
  USING (auth.uid() = user_id);

-- Create notification settings table
CREATE TABLE IF NOT EXISTS user_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  event_reminders BOOLEAN DEFAULT TRUE,
  reminder_time INTEGER DEFAULT 15,
  daily_meditation_reminder BOOLEAN DEFAULT FALSE,
  daily_reminder_time TEXT DEFAULT '08:00',
  community_notifications BOOLEAN DEFAULT TRUE,
  system_notifications BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Allow users to manage only their own notification settings
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON user_notification_settings;
CREATE POLICY "Users can manage their own notification settings" 
  ON user_notification_settings FOR ALL 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_id ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user_id ON event_rsvps(user_id); 