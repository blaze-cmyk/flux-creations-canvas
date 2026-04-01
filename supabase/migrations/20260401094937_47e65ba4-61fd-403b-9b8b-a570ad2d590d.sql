
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT '2K',
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- No RLS for now (no auth system)
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to generations"
  ON public.generations
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Storage bucket for generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read on generated-images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'generated-images');

CREATE POLICY "Allow public insert on generated-images"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'generated-images');
