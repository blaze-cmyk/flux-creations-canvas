import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MSMode =
  | 'UGC'
  | 'Tutorial'
  | 'Unboxing'
  | 'Hyper Motion'
  | 'Product Review'
  | 'TV Spot'
  | 'Wild Card'
  | 'UGC Virtual Try On'
  | 'Pro Virtual Try On';
export type MSAspect = 'Auto' | '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '21:9';
export type MSResolution = '480p' | '720p' | '1080p';
export type MSDuration = string; // e.g. "8s" — supports 1s..15s
export type MSSurface = 'Product' | 'App';

export type MSGenStatus = 'queued' | 'running' | 'done' | 'failed';

export interface MSGeneration {
  id: string;
  thumbUrl: string;
  videoUrl?: string;
  prompt: string;
  mode: MSMode;
  surface: MSSurface;
  aspect: MSAspect;
  resolution: MSResolution;
  duration: MSDuration;
  productId?: string;
  avatarId?: string;
  createdAt: number;
  liked?: boolean;
  status?: MSGenStatus;
  falRequestId?: string;
  error?: string;
}

export interface MSProject {
  id: string;
  slug: string;
  name: string;
  thumbUrl?: string;
  createdAt: number;
  generations: MSGeneration[];
}

interface MSState {
  projects: MSProject[];
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  createProject: (name?: string) => MSProject;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  addGeneration: (projectId: string, gen: MSGeneration) => void;
  updateGeneration: (projectId: string, genId: string, patch: Partial<MSGeneration>) => void;
  removeGeneration: (projectId: string, genId: string) => void;
  toggleLike: (projectId: string, genId: string) => void;
  getProjectBySlug: (slug: string) => MSProject | undefined;
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';

export const useMarketingStudioStore = create<MSState>()(
  persist(
    (set, get) => ({
      projects: [],
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      createProject: (name = 'New project') => {
        const id = crypto.randomUUID();
        const baseSlug = slugify(name);
        const existing = new Set(get().projects.map((p) => p.slug));
        let slug = baseSlug;
        let i = 2;
        while (existing.has(slug)) slug = `${baseSlug}-${i++}`;
        const project: MSProject = { id, slug, name, createdAt: Date.now(), generations: [] };
        set({ projects: [project, ...get().projects] });
        return project;
      },
      renameProject: (id, name) => {
        set({
          projects: get().projects.map((p) =>
            p.id === id ? { ...p, name, slug: slugify(name) } : p,
          ),
        });
      },
      deleteProject: (id) => set({ projects: get().projects.filter((p) => p.id !== id) }),
      addGeneration: (projectId, gen) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, generations: [gen, ...p.generations], thumbUrl: p.thumbUrl ?? gen.thumbUrl }
              : p,
          ),
        });
      },
      toggleLike: (projectId, genId) => {
        set({
          projects: get().projects.map((p) =>
            p.id === projectId
              ? { ...p, generations: p.generations.map((g) => (g.id === genId ? { ...g, liked: !g.liked } : g)) }
              : p,
          ),
        });
      },
      getProjectBySlug: (slug) => get().projects.find((p) => p.slug === slug),
    }),
    { name: 'korsola-marketing-studio' },
  ),
);
