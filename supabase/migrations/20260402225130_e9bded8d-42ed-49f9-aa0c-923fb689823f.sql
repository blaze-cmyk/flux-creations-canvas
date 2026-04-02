
CREATE TABLE public.spaces_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.spaces_projects(id) ON DELETE CASCADE,
  node_id TEXT,
  event_type TEXT NOT NULL DEFAULT 'creation',
  content_url TEXT,
  prompt TEXT,
  model TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to spaces_history"
  ON public.spaces_history
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_spaces_history_project ON public.spaces_history(project_id);
CREATE INDEX idx_spaces_history_created ON public.spaces_history(created_at DESC);
