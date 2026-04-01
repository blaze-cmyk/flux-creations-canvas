-- Create a public storage bucket for video input files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-inputs', 'video-inputs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read video inputs" ON storage.objects
FOR SELECT TO public USING (bucket_id = 'video-inputs');

-- Allow anonymous uploads
CREATE POLICY "Allow anonymous uploads to video-inputs" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'video-inputs');
