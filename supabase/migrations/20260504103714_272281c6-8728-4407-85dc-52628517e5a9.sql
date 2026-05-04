-- Enable Supabase Realtime for generation tables so the UI updates instantly
ALTER TABLE public.ms_generations REPLICA IDENTITY FULL;
ALTER TABLE public.generations REPLICA IDENTITY FULL;
ALTER TABLE public.video_generations REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.ms_generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generations;