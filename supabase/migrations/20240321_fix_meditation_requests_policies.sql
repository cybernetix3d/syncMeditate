-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own requests" ON meditation_requests;
DROP POLICY IF EXISTS "Users can create their own requests" ON meditation_requests;
DROP POLICY IF EXISTS "Users can update their own requests" ON meditation_requests;
DROP POLICY IF EXISTS "Users can update own requests" ON meditation_requests;
DROP POLICY IF EXISTS "Users can view all active requests" ON meditation_requests;
DROP POLICY IF EXISTS "Users can create requests" ON meditation_requests;

-- Create a permissive policy for viewing requests if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'meditation_requests' 
        AND policyname = 'Users can view all active requests'
    ) THEN
        CREATE POLICY "Users can view all active requests"
        ON meditation_requests FOR SELECT
        TO authenticated
        USING (is_active = true);
    END IF;
END $$;

-- Create a policy for creating requests if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'meditation_requests' 
        AND policyname = 'Users can create requests'
    ) THEN
        CREATE POLICY "Users can create requests"
        ON meditation_requests FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Create a policy for updating requests if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'meditation_requests' 
        AND policyname = 'Users can update their own requests'
    ) THEN
        CREATE POLICY "Users can update their own requests"
        ON meditation_requests FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (
            auth.uid() = user_id AND
            (is_active = false OR is_active = true)
        );
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON meditation_requests TO authenticated;
GRANT ALL ON meditation_requests TO anon;

-- Ensure RLS is enabled
ALTER TABLE meditation_requests ENABLE ROW LEVEL SECURITY;

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema'; 