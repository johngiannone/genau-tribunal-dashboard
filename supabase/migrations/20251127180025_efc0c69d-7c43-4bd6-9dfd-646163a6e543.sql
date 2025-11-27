-- Create storage bucket for audit files
INSERT INTO storage.buckets (id, name, public)
VALUES ('audits', 'audits', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload audit files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audits' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access
CREATE POLICY "Public can view audit files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'audits');