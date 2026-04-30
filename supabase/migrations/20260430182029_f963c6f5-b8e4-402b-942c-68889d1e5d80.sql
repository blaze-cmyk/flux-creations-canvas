
CREATE TABLE IF NOT EXISTS public.ms_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL DEFAULT 'New project',
  slug text NOT NULL,
  thumb_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

ALTER TABLE public.ms_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_projects public" ON public.ms_projects FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER ms_projects_updated BEFORE UPDATE ON public.ms_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ms_generations
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.ms_projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ms_generations_project_idx ON public.ms_generations(project_id, created_at DESC);
