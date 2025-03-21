-- Create a function to run arbitrary SQL commands for administrative purposes
CREATE OR REPLACE FUNCTION run_manual_migration(sql_statement TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
  EXECUTE sql_statement;
END;
$$;

-- Create a function to add guest permissions to tables
CREATE OR REPLACE FUNCTION add_guest_event_permissions(sql_command TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable guest access to the meditation_events table
  EXECUTE sql_command;
END;
$$;

-- Allow guest access to meditation_events table by default
ALTER TABLE IF EXISTS meditation_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous (non-authenticated) users to create meditation events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'meditation_events' 
    AND policyname = 'Allow anonymous users to create events'
  ) THEN
    CREATE POLICY "Allow anonymous users to create events"
    ON meditation_events FOR INSERT
    WITH CHECK (true);
  END IF;
END $$;

-- Create policy to allow any user to view all meditation events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'meditation_events' 
    AND policyname = 'Anyone can view meditation events'
  ) THEN
    CREATE POLICY "Anyone can view meditation events"
    ON meditation_events FOR SELECT
    USING (true);
  END IF;
END $$;

-- Create policy for users to update their own events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies 
    WHERE tablename = 'meditation_events' 
    AND policyname = 'Users can update their own events'
  ) THEN
    CREATE POLICY "Users can update their own events"
    ON meditation_events FOR UPDATE
    USING (created_by = auth.uid() OR created_by = 'guest-user');
  END IF;
END $$; 