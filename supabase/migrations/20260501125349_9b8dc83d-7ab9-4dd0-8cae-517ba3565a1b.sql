ALTER TABLE public.ms_products ADD COLUMN IF NOT EXISTS vision_analysis jsonb;
ALTER TABLE public.ms_generations ADD COLUMN IF NOT EXISTS script_persona text;