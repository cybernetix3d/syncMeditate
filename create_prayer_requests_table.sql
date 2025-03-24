-- Create an enum type for request types
CREATE TYPE request_type AS ENUM ('prayer', 'healing', 'vibe', 'meditation');

-- Create the prayer/healing requests table
CREATE TABLE IF NOT EXISTS public.meditation_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    request_type request_type NOT NULL,
    tradition VARCHAR(50) REFERENCES faith_traditions(id),
    full_name TEXT,
    image_url TEXT,
    location TEXT,
    location_precision VARCHAR(20) DEFAULT 'city',
    focus_area TEXT NOT NULL,
    desired_outcome TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.meditation_requests ENABLE ROW LEVEL SECURITY;

-- Policy for viewing requests
CREATE POLICY "Anyone can view active requests" ON public.meditation_requests
    FOR SELECT
    USING (is_active = true);

-- Policy for creating requests
CREATE POLICY "Authenticated users can create requests" ON public.meditation_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Policy for updating own requests
CREATE POLICY "Users can update own requests" ON public.meditation_requests
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create function to handle request updates
CREATE OR REPLACE FUNCTION handle_meditation_request_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
CREATE TRIGGER update_meditation_request_timestamp
    BEFORE UPDATE ON public.meditation_requests
    FOR EACH ROW
    EXECUTE FUNCTION handle_meditation_request_update();

-- Grant access to authenticated users
GRANT SELECT ON public.meditation_requests TO authenticated;
GRANT INSERT ON public.meditation_requests TO authenticated;
GRANT UPDATE ON public.meditation_requests TO authenticated;

-- Notify schema changes
NOTIFY pgrst, 'reload schema'; 