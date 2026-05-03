-- Allow ms_generations rows to belong to a /create project as well as (or instead of) an ms_project.
ALTER TABLE public.ms_generations
  ADD COLUMN IF NOT EXISTS create_project_id uuid;

CREATE INDEX IF NOT EXISTS idx_ms_generations_create_project_id
  ON public.ms_generations (create_project_id);