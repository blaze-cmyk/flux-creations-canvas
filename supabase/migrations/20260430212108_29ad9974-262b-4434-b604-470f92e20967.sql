-- 1. ms_avatars: voice + description
ALTER TABLE public.ms_avatars
  ADD COLUMN IF NOT EXISTS voice_sample_url text,
  ADD COLUMN IF NOT EXISTS voice_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS voice_id text,
  ADD COLUMN IF NOT EXISTS description text;

-- 2. ms_generations: script + keyframe + stage tracking
ALTER TABLE public.ms_generations
  ADD COLUMN IF NOT EXISTS script_text text,
  ADD COLUMN IF NOT EXISTS keyframe_url text,
  ADD COLUMN IF NOT EXISTS keyframe_path text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'queued';

-- 3. Storage bucket for voice reference samples
INSERT INTO storage.buckets (id, name, public)
VALUES ('ms-voice-samples', 'ms-voice-samples', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for the bucket: service role does all writes via edge function; allow public read so signed URLs work cleanly.
DROP POLICY IF EXISTS "ms_voice_samples read" ON storage.objects;
CREATE POLICY "ms_voice_samples read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ms-voice-samples');

DROP POLICY IF EXISTS "ms_voice_samples write" ON storage.objects;
CREATE POLICY "ms_voice_samples write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ms-voice-samples');

DROP POLICY IF EXISTS "ms_voice_samples update" ON storage.objects;
CREATE POLICY "ms_voice_samples update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ms-voice-samples');