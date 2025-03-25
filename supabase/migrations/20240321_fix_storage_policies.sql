-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated uploads ckc383_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing ckc383_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update IMAGE ckc383_0" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update IMAGE ckc383_1" ON storage.objects;
DROP POLICY IF EXISTS "meditation_requests_insert" ON storage.objects;
DROP POLICY IF EXISTS "meditation_requests_select" ON storage.objects;
DROP POLICY IF EXISTS "meditation_requests_update" ON storage.objects;
DROP POLICY IF EXISTS "meditation_requests_delete" ON storage.objects;

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('meditation-requests', 'meditation-requests', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "meditation_requests_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meditation-requests' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view files
CREATE POLICY "meditation_requests_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'meditation-requests');

-- Allow users to update their own files
CREATE POLICY "meditation_requests_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'meditation-requests' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "meditation_requests_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meditation-requests' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema'; 