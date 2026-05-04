-- Private bucket for keyframes (signed URLs only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ms-keyframes',
  'ms-keyframes',
  false,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read policy (project is anon-mode like ms-products signed URL pattern; keyframes are gated by 1h signed URLs)
CREATE POLICY "ms-keyframes anon read"
ON storage.objects FOR SELECT
USING (bucket_id = 'ms-keyframes');

CREATE POLICY "ms-keyframes anon write"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ms-keyframes');

CREATE POLICY "ms-keyframes anon update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ms-keyframes');

CREATE POLICY "ms-keyframes anon delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'ms-keyframes');