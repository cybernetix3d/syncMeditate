-- Create the function for getting meditation events by string ID
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

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 