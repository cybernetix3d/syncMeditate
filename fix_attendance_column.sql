-- Add the missing attendance_status column
ALTER TABLE public.event_rsvps 
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT NULL;

-- Add check constraint if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_status_check' 
    AND conrelid = 'public.event_rsvps'::regclass
  ) THEN
    ALTER TABLE public.event_rsvps 
    ADD CONSTRAINT attendance_status_check 
    CHECK (attendance_status IN ('attending', 'interested', NULL));
  END IF;
END
$$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema'; 