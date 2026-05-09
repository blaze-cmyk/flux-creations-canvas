import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { useCreateProjectsStore } from '@/store/createProjectsStore';

export type GeneratedImage = {
  id: string;
  prompt: string;
  referenceImages: string[];
  model: string;
  quality: string;
  aspectRatio: string;
  status: 'generating' | 'complete' | 'failed' | 'nsfw';
  imageUrl?: string;
  width?: number;
  height?: number;
  createdAt: number;
  error?: string;
  projectId?: string | null;
  liked?: boolean;
};

type GeneratorState = {
  prompt: string;
  referenceImages: string[];
  model: string;
  quality: string;
  aspectRatio: string;
  quantity: number;
  images: GeneratedImage[];
  selectedImageId: string | null;
  loadedProjects: Set<string>;
  setPrompt: (prompt: string) => void;
  addReferenceImage: (img: string) => void;
  removeReferenceImage: (index: number) => void;
  reorderReferenceImages: (fromIndex: number, toIndex: number) => void;
  setModel: (model: string) => void;
  setQuality: (quality: string) => void;
  setAspectRatio: (ar: string) => void;
  setQuantity: (qty: number) => void;
  setSelectedImageId: (id: string | null) => void;
  generate: () => Promise<void>;
  retryImage: (id: string) => void;
  deleteImage: (id: string) => void;
  useAsReference: (imageUrl: string) => void;
  loadHistory: (projectId?: string | null) => Promise<void>;
  upsertFromRealtime: (row: any) => void;
  removeById: (id: string) => void;
  moveImageToProject: (id: string, projectId: string | null) => Promise<void>;
  toggleLike: (id: string) => void;
};

export const MODELS = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', desc: "Google's flagship generation model", featured: true, maxRefs: 14 },
  { id: 'nano-banana-2', name: 'Nano Banana 2', desc: 'Pro quality at Flash speed', featured: true, badge: 'NEW' as const, maxRefs: 14 },
  { id: 'seedream-4', name: 'Seedream 4.0', desc: "ByteDance's next-gen 4K image model", featured: true, maxRefs: 10 },
  { id: 'seedream-5-lite', name: 'Seedream 5.0 Lite', desc: 'Intelligent visual reasoning', featured: true, maxRefs: 10 },
  { id: 'grok-imagine', name: 'Grok Imagine', desc: "xAI's highly aesthetic image generation", featured: true, maxRefs: 0 },
  { id: 'kling', name: 'Kling Image V3', desc: 'Latest Kling image model with face control', featured: true, maxRefs: 1 },
  { id: 'flux', name: 'Flux 2 Pro', desc: 'State-of-the-art Flux generation & editing', featured: true, maxRefs: 10 },
  { id: 'wan', name: 'Wan 2.2', desc: 'Photorealistic high-resolution generation', featured: true, maxRefs: 0 },
];

export function getModelMaxRefs(modelId: string): number {
  return MODELS.find((m) => m.id === modelId)?.maxRefs ?? 5;
}


export const ASPECT_RATIOS = [
  'Auto', '1:1', '3:4', '4:3', '2:3', '3:2', '9:16', '16:9', '5:4', '4:5', '21:9',
];

export const QUALITIES = ['1K', '2K', '4K'];

async function callGenerateAPI(params: {
  prompt: string;
  referenceImages: string[];
  model: string;
  quality: string;
  aspectRatio: string;
  generationId?: string;
  projectId?: string | null;
}): Promise<{ imageUrl?: string; imageBase64?: string; error?: string; nsfw?: boolean }> {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: {
      prompt: params.prompt,
      referenceImages: params.referenceImages,
      model: params.model,
      quality: params.quality,
      aspectRatio: params.aspectRatio,
      generationId: params.generationId,
      projectId: params.projectId,
    },
  });

  if (error) {
    console.error('Edge function error:', error);
    // Try to parse the error body for a better message
    try {
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json();
        if (body?.error) {
          const isNsfw = body.error.includes('policy') || body.error.includes('filtered') || body.error.includes('Prohibited');
          return { error: body.error, nsfw: isNsfw };
        }
      }
    } catch { /* ignore parse errors */ }
    return { error: error.message || 'Generation failed' };
  }

  if (data?.error) {
    const isNsfw = data.filtered || data.error.includes('policy') || data.error.includes('filtered') || data.error.includes('Prohibited');
    return { error: data.error, nsfw: isNsfw };
  }

  return { imageUrl: data?.imageUrl, imageBase64: data?.imageBase64 };
}

// Upload image to storage and return public URL
async function uploadToStorage(imageData: string, id: string): Promise<string | null> {
  try {
    if (imageData.startsWith('http') && imageData.includes(`/storage/v1/object/public/generated-images/${id}.`)) {
      return imageData;
    }

    let blob: Blob;
    let ext = 'png';

    if (imageData.startsWith('data:')) {
      const match = imageData.match(/^data:(image\/(\w+));base64,(.+)$/);
      if (!match) return null;
      ext = match[2] === 'jpeg' ? 'jpg' : match[2];
      const binary = atob(match[3]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: match[1] });
    } else if (imageData.startsWith('http')) {
      const resp = await fetch(imageData);
      if (!resp.ok) return null;
      blob = await resp.blob();
      const ct = resp.headers.get('content-type') || 'image/png';
      ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png';
    } else {
      return null;
    }

    const path = `${id}.${ext}`;
    const { error } = await supabase.storage
      .from('generated-images')
      .upload(path, blob, { contentType: blob.type, upsert: true });

    if (error) {
      console.error('Storage upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('generated-images')
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Upload error:', e);
    return null;
  }
}

// Upload a reference image (base64) to storage and return a persistent URL
// Detect aspect ratio from a reference image and snap to closest supported value
const SUPPORTED_ARS: Array<[string, number]> = [
  ['1:1', 1], ['3:4', 3/4], ['4:3', 4/3], ['2:3', 2/3], ['3:2', 3/2],
  ['9:16', 9/16], ['16:9', 16/9], ['5:4', 5/4], ['4:5', 4/5], ['21:9', 21/9],
];
async function detectAspectRatio(url: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const r = img.naturalWidth / img.naturalHeight;
        let best = '1:1', bestDiff = Infinity;
        for (const [label, val] of SUPPORTED_ARS) {
          const d = Math.abs(Math.log(r / val));
          if (d < bestDiff) { bestDiff = d; best = label; }
        }
        resolve(best);
      };
      img.onerror = () => resolve('1:1');
      img.src = url;
    } catch { resolve('1:1'); }
  });
}

async function uploadReferenceImage(dataUri: string): Promise<string> {
  if (!dataUri.startsWith('data:')) return dataUri; // already a URL
  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const url = await uploadToStorage(dataUri, id);
  return url || dataUri; // fallback to dataUri if upload fails
}

function persistReferenceImages(imgs: string[]) {
  try {
    // Only persist URLs (not base64) to avoid quota issues
    const urls = imgs.filter(i => i.startsWith('http'));
    localStorage.setItem('gen-ref-images', JSON.stringify(urls));
  } catch { /* ignore */ }
}

function loadPersistedReferenceImages(): string[] {
  try {
    const raw = localStorage.getItem('gen-ref-images');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

// Save a completed generation to the database
async function saveToDb(img: GeneratedImage, storageUrl: string, projectId: string | null) {
  const { error } = await supabase.from('generations').upsert({
    id: img.id,
    prompt: img.prompt,
    model: img.model,
    quality: img.quality,
    aspect_ratio: img.aspectRatio,
    image_url: storageUrl,
    status: img.status,
    error: img.error || null,
    project_id: projectId,
    create_project_id: projectId,
  } as any, { onConflict: 'id' });
  if (error) console.error('DB upsert error:', error);

  // Set/refresh project thumbnail with the latest image — only if user hasn't locked one
  if (projectId && storageUrl) {
    try {
      await useCreateProjectsStore.getState().bumpProjectThumbIfUnlocked(projectId, storageUrl);
    } catch (e) { console.error('thumb bump error:', e); }
  }
}

export const useGeneratorStore = create<GeneratorState>()((set, get) => ({
  prompt: localStorage.getItem('gen-last-prompt') || '',
  referenceImages: loadPersistedReferenceImages(),
  model: (() => {
    const stored = localStorage.getItem('gen-last-model');
    const valid = ['nano-banana-pro','nano-banana-2','seedream-4','seedream-5-lite','grok-imagine','kling','flux','wan'];
    return stored && valid.includes(stored) ? stored : 'nano-banana-pro';
  })(),
  quality: (localStorage.getItem('gen-last-quality') as string) || '2K',
  aspectRatio: (localStorage.getItem('gen-last-ar') as string) || '1:1',
  quantity: 4,
  images: [],
  selectedImageId: null,
  loadedProjects: new Set<string>(),

  setPrompt: (prompt) => { set({ prompt }); localStorage.setItem('gen-last-prompt', prompt); },
  addReferenceImage: (img) => {
    const refs = get().referenceImages;
    const max = getModelMaxRefs(get().model);
    if (refs.length < max) {
      const next = [...refs, img];
      set({ referenceImages: next });
      if (img.startsWith('data:')) {
        uploadReferenceImage(img).then((url) => {
          if (url !== img) {
            const updated = get().referenceImages.map(r => r === img ? url : r);
            set({ referenceImages: updated });
            persistReferenceImages(updated);
          }
        });
      } else {
        persistReferenceImages(next);
      }
    }
  },
  removeReferenceImage: (index) => {
    const next = get().referenceImages.filter((_, i) => i !== index);
    set({ referenceImages: next });
    persistReferenceImages(next);
  },
  reorderReferenceImages: (fromIndex, toIndex) => {
    const imgs = [...get().referenceImages];
    const [moved] = imgs.splice(fromIndex, 1);
    imgs.splice(toIndex, 0, moved);
    set({ referenceImages: imgs });
    persistReferenceImages(imgs);
  },
  setModel: (model) => {
    const max = getModelMaxRefs(model);
    const refs = get().referenceImages;
    const trimmed = refs.length > max ? refs.slice(0, max) : refs;
    set({ model, referenceImages: trimmed });
    if (trimmed !== refs) persistReferenceImages(trimmed);
    localStorage.setItem('gen-last-model', model);
  },
  setQuality: (quality) => { set({ quality }); localStorage.setItem('gen-last-quality', quality); },
  setAspectRatio: (aspectRatio) => { set({ aspectRatio }); localStorage.setItem('gen-last-ar', aspectRatio); },
  setQuantity: (qty) => set({ quantity: Math.max(1, Math.min(4, qty)) }),
  setSelectedImageId: (id) => set({ selectedImageId: id }),

  loadHistory: async (projectId?: string | null) => {
    const key = projectId ?? '__all__';
    try {
      let q = supabase
        .from('generations')
        .select('id,prompt,model,quality,aspect_ratio,status,image_url,created_at,error,project_id,create_project_id,liked')
        .order('created_at', { ascending: false })
        .limit(500);
      if (projectId) q = q.or(`create_project_id.eq.${projectId},project_id.eq.${projectId}`);
      const { data, error } = await (q as any);
      if (error) {
        console.error('Load history error:', error);
        return;
      }
      const loaded: GeneratedImage[] = (data || []).map((row: any) => ({
        id: row.id,
        prompt: row.prompt,
        referenceImages: [],
        model: row.model,
        quality: row.quality,
        aspectRatio: row.aspect_ratio,
        status: row.status as GeneratedImage['status'],
        imageUrl: row.image_url,
        createdAt: new Date(row.created_at).getTime(),
        error: row.error,
        projectId: row.create_project_id ?? row.project_id ?? null,
        liked: !!row.liked,
      }));
      const current = get().images;
      const byId = new Map<string, GeneratedImage>();
      [...loaded, ...current].forEach((img) => {
        const existing = byId.get(img.id);
        byId.set(img.id, existing ? { ...existing, ...img, referenceImages: existing.referenceImages } : img);
      });
      const nextLoaded = new Set(get().loadedProjects);
      nextLoaded.add(key);
      set({
        images: Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt),
        loadedProjects: nextLoaded,
      });
    } catch (e) {
      console.error('Load history error:', e);
    }
  },

  generate: async () => {
    const { prompt, referenceImages, model, quality, aspectRatio: rawAr, quantity } = get();
    if (!prompt.trim()) return;

    // Auto AR: derive from first reference image's natural dimensions
    let aspectRatio = rawAr;
    if (rawAr === 'Auto' && referenceImages.length > 0) {
      try {
        aspectRatio = await detectAspectRatio(referenceImages[0]);
        console.log('[generator] Auto AR resolved →', aspectRatio);
      } catch { aspectRatio = '1:1'; }
    } else if (rawAr === 'Auto') {
      aspectRatio = '1:1';
    }

    // Resolve active project FIRST so placeholders carry the correct projectId.
    const projStore = useCreateProjectsStore.getState();
    let projectId: string | null = projStore.activeProjectId;
    if (!projectId) {
      const name = prompt.split(/\s+/).slice(0, 5).join(' ').slice(0, 60) || 'New project';
      try {
        const proj = await projStore.createProject(name);
        projectId = proj.id;
      } catch {
        projectId = null;
      }
    }

    const newImages: GeneratedImage[] = Array.from({ length: quantity }, () => ({
      id: crypto.randomUUID(),
      prompt,
      referenceImages: [...referenceImages],
      model,
      quality,
      aspectRatio,
      status: 'generating' as const,
      createdAt: Date.now(),
      projectId: projectId ?? undefined,
    }));

    set({ images: [...newImages, ...get().images] });

    // Persist placeholder rows immediately so a refresh mid-generation doesn't lose them.
    const placeholderRows = newImages.map((img) => ({
      id: img.id,
      prompt: img.prompt,
      model: img.model,
      quality: img.quality,
      aspect_ratio: img.aspectRatio,
      image_url: null,
      status: 'generating',
      project_id: projectId,
      create_project_id: projectId,
    }));
    await supabase.from('generations').upsert(placeholderRows as any, { onConflict: 'id' }).then(({ error }) => {
      if (error) console.error('Placeholder insert error:', error);
    });

    newImages.forEach(async (img) => {
      try {
        const result = await callGenerateAPI({ prompt, referenceImages, model, quality, aspectRatio, generationId: img.id, projectId });

        if (result.error) {
          const status = result.nsfw ? 'nsfw' as const : 'failed' as const;
          set({
            images: get().images.map((i) =>
              i.id === img.id ? { ...i, status, error: result.error } : i
            ),
          });
          supabase.from('generations').update({ status, error: result.error } as any).eq('id', img.id).then(({ error }) => {
            if (error) console.error('Status update error:', error);
          });
        } else {
          const rawUrl = result.imageBase64 || result.imageUrl;
          let persistentUrl = rawUrl;
          if (rawUrl) {
            const storageUrl = await uploadToStorage(rawUrl, img.id);
            if (storageUrl) {
              persistentUrl = storageUrl;
              await saveToDb(
                { ...img, status: 'complete', imageUrl: persistentUrl, projectId },
                persistentUrl,
                projectId,
              );
            }
          }

          set({
            images: get().images.map((i) =>
              i.id === img.id
                ? { ...i, status: 'complete' as const, imageUrl: persistentUrl, projectId }
                : i
            ),
          });

          // Update project thumb in store
          if (projectId && persistentUrl) {
            useCreateProjectsStore.setState((s) => ({
              projects: s.projects.map((p) =>
                p.id === projectId ? { ...p, thumbUrl: persistentUrl } : p
              ),
            }));
          }
        }
      } catch (e) {
        console.error('Generation error:', e);
        const message = e instanceof Error ? e.message : 'Unknown error';
        set({
          images: get().images.map((i) =>
            i.id === img.id
              ? { ...i, status: 'failed' as const, error: message }
              : i
          ),
        });
        supabase.from('generations').update({ status: 'failed', error: message } as any).eq('id', img.id).then(({ error }) => {
          if (error) console.error('Status update error:', error);
        });
      }
    });
  },

  retryImage: (id) => {
    const img = get().images.find((i) => i.id === id);
    if (!img) return;

    set({
      images: get().images.map((i) =>
        i.id === id ? { ...i, status: 'generating' as const, error: undefined } : i
      ),
    });

    callGenerateAPI({
      prompt: img.prompt,
      referenceImages: img.referenceImages,
      model: img.model,
      quality: img.quality,
      aspectRatio: img.aspectRatio,
      generationId: id,
      projectId: img.projectId ?? null,
    }).then(async (result) => {
      if (result.error) {
        set({
          images: get().images.map((i) =>
            i.id === id ? { ...i, status: 'failed' as const, error: result.error } : i
          ),
        });
      } else {
        const rawUrl = result.imageBase64 || result.imageUrl;
        let persistentUrl = rawUrl;
        if (rawUrl) {
          const storageUrl = await uploadToStorage(rawUrl, id);
          if (storageUrl) {
            persistentUrl = storageUrl;
            await saveToDb({ ...img, status: 'complete', imageUrl: persistentUrl }, persistentUrl, img.projectId ?? null);
          }
        }
        set({
          images: get().images.map((i) =>
            i.id === id ? { ...i, status: 'complete' as const, imageUrl: persistentUrl } : i
          ),
        });
      }
    });
  },

  deleteImage: (id) => {
    set({
      images: get().images.filter((i) => i.id !== id),
      selectedImageId: get().selectedImageId === id ? null : get().selectedImageId,
    });
    // Also delete from DB
    supabase.from('generations').delete().eq('id', id).then(({ error }) => {
      if (error) console.error('DB delete error:', error);
    });
  },

  useAsReference: (imageUrl) => {
    const refs = get().referenceImages;
    const max = getModelMaxRefs(get().model);
    if (refs.length < max) {
      set({ referenceImages: [...refs, imageUrl], selectedImageId: null });
    }
  },

  moveImageToProject: async (id, projectId) => {
    set({
      images: get().images.map((i) => (i.id === id ? { ...i, projectId } : i)),
    });
    const { error } = await supabase
      .from('generations')
      .update({ project_id: projectId, create_project_id: projectId } as any)
      .eq('id', id);
    if (error) console.error('Move image error:', error);
  },

  toggleLike: (id) => {
    const next = !get().images.find((i) => i.id === id)?.liked;
    set({ images: get().images.map((i) => (i.id === id ? { ...i, liked: next } : i)) });
    supabase.from('generations').update({ liked: next } as any).eq('id', id).then(({ error }) => {
      if (error) console.error('Toggle like error:', error);
    });
  },

  upsertFromRealtime: (row) => {
    if (!row?.id) return;
    const mapped: GeneratedImage = {
      id: row.id,
      prompt: row.prompt ?? '',
      referenceImages: [],
      model: row.model,
      quality: row.quality,
      aspectRatio: row.aspect_ratio,
      status: row.status as GeneratedImage['status'],
      imageUrl: row.image_url ?? undefined,
      createdAt: new Date(row.created_at).getTime(),
      error: row.error ?? undefined,
      projectId: row.create_project_id ?? row.project_id ?? null,
      liked: !!row.liked,
    };
    const list = get().images;
    const idx = list.findIndex((i) => i.id === mapped.id);
    if (idx >= 0) {
      const merged = { ...list[idx], ...mapped, referenceImages: list[idx].referenceImages };
      const next = [...list];
      next[idx] = merged;
      set({ images: next });
    } else {
      set({ images: [mapped, ...list] });
    }
  },

  removeById: (id) => {
    set({
      images: get().images.filter((i) => i.id !== id),
      selectedImageId: get().selectedImageId === id ? null : get().selectedImageId,
    });
  },
}));
