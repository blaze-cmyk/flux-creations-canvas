
-- Spaces projects table
CREATE TABLE public.spaces_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Space',
  cover_image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to spaces_projects"
  ON public.spaces_projects FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Spaces nodes table (stores canvas nodes per project)
CREATE TABLE public.spaces_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.spaces_projects(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  node_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to spaces_nodes"
  ON public.spaces_nodes FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);

-- Spaces edges table
CREATE TABLE public.spaces_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.spaces_projects(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL,
  source_node TEXT NOT NULL,
  target_node TEXT NOT NULL,
  source_handle TEXT,
  target_handle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.spaces_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to spaces_edges"
  ON public.spaces_edges FOR ALL
  TO anon, authenticated
  USING (true) WITH CHECK (true);
