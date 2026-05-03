ALTER TABLE public.ms_generations
  ADD COLUMN IF NOT EXISTS liked boolean NOT NULL DEFAULT false;