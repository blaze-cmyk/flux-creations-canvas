import { supabase } from '@/integrations/supabase/client';
import { MSGeneration, MSProject, useMarketingStudioStore } from '@/store/marketingStudioStore';

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';

/** Create a project in the DB (single source of truth) and mirror into the store. */
export async function createProjectDB(name: string): Promise<MSProject> {
  const baseSlug = slugify(name);
  // Make slug unique with a short suffix to avoid collisions
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await supabase
    .from('ms_projects')
    .insert({ name, slug })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create project');
  const project: MSProject = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    thumbUrl: data.thumb_url ?? undefined,
    createdAt: new Date(data.created_at).getTime(),
    generations: [],
  };
  // Mirror into store
  useMarketingStudioStore.setState((s) => ({ projects: [project, ...s.projects.filter((p) => p.id !== project.id)] }));
  return project;
}

/** Hydrate all projects + their generations from the DB into the store. */
export async function hydrateMarketingStudio() {
  const [{ data: projects, error: pErr }, { data: gens, error: gErr }] = await Promise.all([
    supabase.from('ms_projects').select('*').order('created_at', { ascending: false }),
    supabase.from('ms_generations').select('*').order('created_at', { ascending: false }),
  ]);
  if (pErr || gErr) {
    console.error('[ms hydrate] failed', pErr || gErr);
    return;
  }

  const byProject = new Map<string, MSGeneration[]>();
  for (const g of gens || []) {
    if (!g.project_id) continue;
    const arr = byProject.get(g.project_id) || [];
    arr.push({
      id: g.id,
      thumbUrl: g.thumb_url || '',
      videoUrl: g.video_url || undefined,
      prompt: g.prompt,
      mode: (g.format as any) || 'UGC',
      surface: (g.surface as any) || 'Product',
      aspect: (g.aspect as any) || 'Auto',
      resolution: (g.resolution as any) || '720p',
      duration: g.duration_seconds ? `${g.duration_seconds}s` : '8s',
      productId: g.product_id || undefined,
      avatarId: g.avatar_id || undefined,
      createdAt: new Date(g.created_at).getTime(),
      submittedAt: new Date(g.created_at).getTime(),
      status: (g.status as any) || 'queued',
      falRequestId: g.fal_request_id || undefined,
      error: g.error || undefined,
    });
    byProject.set(g.project_id, arr);
  }

  const ms: MSProject[] = (projects || []).map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    thumbUrl: p.thumb_url ?? byProject.get(p.id)?.[0]?.thumbUrl,
    createdAt: new Date(p.created_at).getTime(),
    generations: byProject.get(p.id) || [],
  }));

  // Merge with any local-only projects (e.g. created before this migration) so we don't lose state
  useMarketingStudioStore.setState((s) => {
    const dbIds = new Set(ms.map((p) => p.id));
    const localOnly = s.projects.filter((p) => !dbIds.has(p.id));
    return { projects: [...ms, ...localOnly] };
  });
}
