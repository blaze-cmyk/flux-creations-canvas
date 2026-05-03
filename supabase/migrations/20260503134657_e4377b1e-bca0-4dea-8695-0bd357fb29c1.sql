
ALTER TABLE public.create_projects
  ADD COLUMN IF NOT EXISTS thumb_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.generations
  DROP CONSTRAINT IF EXISTS generations_project_id_fkey;

ALTER TABLE public.generations
  ADD CONSTRAINT generations_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.create_projects(id) ON DELETE CASCADE;
