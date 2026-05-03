
CREATE TABLE public.create_projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'New project',
  slug text NOT NULL,
  thumb_url text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.create_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "create_projects public" ON public.create_projects
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_create_projects_updated_at
BEFORE UPDATE ON public.create_projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.generations ADD COLUMN IF NOT EXISTS project_id uuid;
CREATE INDEX IF NOT EXISTS idx_generations_project_id ON public.generations(project_id);
