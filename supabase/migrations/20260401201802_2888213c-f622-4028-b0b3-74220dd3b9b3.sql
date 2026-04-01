
CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  prompt TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'text-to-video',
  aspect_ratio TEXT NOT NULL DEFAULT '16:9',
  duration TEXT NOT NULL DEFAULT '5',
  status TEXT NOT NULL DEFAULT 'processing',
  video_url TEXT,
  thumbnail_url TEXT,
  reference_images TEXT[] DEFAULT '{}',
  provider TEXT,
  task_id TEXT,
  response_url TEXT,
  status_url TEXT,
  error TEXT
);

ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to video_generations"
ON public.video_generations
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
