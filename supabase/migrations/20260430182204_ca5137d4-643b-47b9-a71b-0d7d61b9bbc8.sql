UPDATE public.ms_generations
SET project_id = (SELECT id FROM public.ms_projects WHERE slug = 'recovered-videos')
WHERE project_id IS NULL;