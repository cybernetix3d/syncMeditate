-- Create enum for location sharing levels
CREATE TYPE location_sharing_level AS ENUM ('none', 'country', 'state', 'city', 'precise');

-- Create privacy settings table
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    location_sharing_level location_sharing_level DEFAULT 'city',
    use_anonymous_id BOOLEAN DEFAULT false,
    share_tradition BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Add RLS policies
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Policy for viewing own settings
CREATE POLICY "Users can view own privacy settings" ON public.user_privacy_settings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy for updating own settings
CREATE POLICY "Users can update own privacy settings" ON public.user_privacy_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to handle updates
CREATE OR REPLACE FUNCTION handle_privacy_settings_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating timestamp
CREATE TRIGGER update_privacy_settings_timestamp
    BEFORE UPDATE ON public.user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION handle_privacy_settings_update();

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_privacy_settings TO authenticated;

-- Notify schema changes
NOTIFY pgrst, 'reload schema'; 