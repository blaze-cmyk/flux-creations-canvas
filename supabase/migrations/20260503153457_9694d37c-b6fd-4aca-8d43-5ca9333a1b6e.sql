-- Project scoping columns
ALTER TABLE public.generations       ADD COLUMN IF NOT EXISTS create_project_id uuid;
ALTER TABLE public.generations       ADD COLUMN IF NOT EXISTS width  integer;
ALTER TABLE public.generations       ADD COLUMN IF NOT EXISTS height integer;
ALTER TABLE public.video_generations ADD COLUMN IF NOT EXISTS project_id uuid;
ALTER TABLE public.video_generations ADD COLUMN IF NOT EXISTS create_project_id uuid;

-- Backfill: existing rows belong to their legacy project_id
UPDATE public.generations
   SET create_project_id = project_id
 WHERE create_project_id IS NULL AND project_id IS NOT NULL;

-- Hot-path indexes (per-project feed)
CREATE INDEX IF NOT EXISTS idx_generations_project_created
  ON public.generations (create_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_generations_project_created
  ON public.video_generations (create_project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ms_generations_project_created
  ON public.ms_generations (create_project_id, created_at DESC);

-- Lookup indexes
CREATE INDEX IF NOT EXISTS idx_create_projects_slug
  ON public.create_projects (slug);
CREATE INDEX IF NOT EXISTS idx_ms_generations_active
  ON public.ms_generations (status, stage)
  WHERE status IN ('queued','generating','processing');
CREATE INDEX IF NOT EXISTS idx_video_generations_active
  ON public.video_generations (status)
  WHERE status IN ('processing','generating','queued');

-- Cascade-delete foreign keys (NOT VALID skips a full historical scan)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generations_create_project_fk') THEN
    ALTER TABLE public.generations
      ADD CONSTRAINT generations_create_project_fk
      FOREIGN KEY (create_project_id)
      REFERENCES public.create_projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_generations_create_project_fk') THEN
    ALTER TABLE public.video_generations
      ADD CONSTRAINT video_generations_create_project_fk
      FOREIGN KEY (create_project_id)
      REFERENCES public.create_projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ms_generations_create_project_fk') THEN
    ALTER TABLE public.ms_generations
      ADD CONSTRAINT ms_generations_create_project_fk
      FOREIGN KEY (create_project_id)
      REFERENCES public.create_projects(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;