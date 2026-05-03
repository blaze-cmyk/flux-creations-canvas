import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type CreateProject = {
  id: string;
  name: string;
  slug: string;
  thumbUrl?: string | null;
  createdAt: number;
};

type State = {
  projects: CreateProject[];
  activeProjectId: string | null;
  sidebarCollapsed: boolean;
  loaded: boolean;
  toggleSidebar: () => void;
  setActiveProject: (id: string | null) => void;
  loadProjects: () => Promise<void>;
  createProject: (name?: string) => Promise<CreateProject>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
};

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || 'project'
  ) + '-' + Math.random().toString(36).slice(2, 6);
}

export const useCreateProjectsStore = create<State>((set, get) => ({
  projects: [],
  activeProjectId: localStorage.getItem('create-active-project') || null,
  sidebarCollapsed: localStorage.getItem('create-sb-collapsed') === '1',
  loaded: false,

  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    set({ sidebarCollapsed: next });
    localStorage.setItem('create-sb-collapsed', next ? '1' : '0');
  },

  setActiveProject: (id) => {
    set({ activeProjectId: id });
    if (id) localStorage.setItem('create-active-project', id);
    else localStorage.removeItem('create-active-project');
  },

  loadProjects: async () => {
    if (get().loaded) return;
    const { data, error } = await supabase
      .from('create_projects' as any)
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(200) as any;
    if (error) {
      console.error('Load create_projects error:', error);
      set({ loaded: true });
      return;
    }
    const projects: CreateProject[] = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      thumbUrl: r.thumb_url,
      createdAt: new Date(r.created_at).getTime(),
    }));
    set({ projects, loaded: true });
  },

  createProject: async (name = 'New project') => {
    const slug = slugify(name);
    const { data, error } = await supabase
      .from('create_projects' as any)
      .insert({ name, slug } as any)
      .select()
      .single() as any;
    if (error || !data) throw error;
    const proj: CreateProject = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      thumbUrl: data.thumb_url,
      createdAt: new Date(data.created_at).getTime(),
    };
    set({ projects: [proj, ...get().projects], activeProjectId: proj.id });
    localStorage.setItem('create-active-project', proj.id);
    return proj;
  },

  renameProject: async (id, name) => {
    set({
      projects: get().projects.map((p) => (p.id === id ? { ...p, name } : p)),
    });
    await supabase.from('create_projects' as any).update({ name } as any).eq('id', id);
  },

  deleteProject: async (id) => {
    set({
      projects: get().projects.filter((p) => p.id !== id),
      activeProjectId: get().activeProjectId === id ? null : get().activeProjectId,
    });
    if (get().activeProjectId === null) localStorage.removeItem('create-active-project');
    await supabase.from('create_projects' as any).delete().eq('id', id);
  },
}));
