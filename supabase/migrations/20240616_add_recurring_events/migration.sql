-- Add recurring event fields to meditation_events table
ALTER TABLE meditation_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE meditation_events ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL;
ALTER TABLE meditation_events ADD COLUMN IF NOT EXISTS system_created BOOLEAN DEFAULT FALSE;

-- Create app_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_app_settings_updated_at ON app_settings;
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on app_settings
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read app_settings
CREATE POLICY "Anyone can read app settings"
ON app_settings
FOR SELECT
USING (true);

-- Create policy to allow authenticated users to update app_settings
CREATE POLICY "Authenticated users can update app settings"
ON app_settings
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- Create policy to allow authenticated users to insert app_settings
CREATE POLICY "Authenticated users can insert app settings"
ON app_settings
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Add function to migrate existing event data
CREATE OR REPLACE FUNCTION migrate_events_to_recurring()
RETURNS void AS $$
BEGIN
    -- Update events that are marked as recurring but have NULL recurrence_type
    UPDATE meditation_events
    SET recurrence_type = 'daily'
    WHERE is_recurring = true AND recurrence_type IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
SELECT migrate_events_to_recurring();

-- Drop the function since it's no longer needed after migration
DROP FUNCTION migrate_events_to_recurring(); 