-- Add missing attendance_status column to event_rsvps table if it doesn't exist
ALTER TABLE public.event_rsvps 
ADD COLUMN IF NOT EXISTS attendance_status TEXT CHECK (attendance_status IN ('attending', 'interested', NULL)) DEFAULT NULL;

-- Create the missing function for getting meditation events by string ID
CREATE OR REPLACE FUNCTION public.get_meditation_event_by_string_id(event_id_param TEXT)
RETURNS SETOF public.meditation_events
LANGUAGE sql
SECURITY INVOKER
AS $$
  SELECT *
  FROM public.meditation_events
  WHERE id::text = event_id_param
  OR id::text = SPLIT_PART(event_id_param, '-', 1);
$$;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.get_meditation_event_by_string_id(TEXT) TO anon, authenticated, service_role;

-- Comment on function to document its purpose
COMMENT ON FUNCTION public.get_meditation_event_by_string_id IS 'Gets a meditation event by its string ID, handling cases where IDs might have date-specific suffixes'; 