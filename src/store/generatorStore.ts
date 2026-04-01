import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

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
  historyLoaded: boolean;
  setPrompt: (prompt: string) => void;
  addReferenceImage: (img: string) => void;
  removeReferenceImage: (index: number) => void;
  reorderReferenceImages: (fromIndex: number, toIndex: number) => void;
  setModel: (model: string) => void;
  setQuality: (quality: string) => void;
  setAspectRatio: (ar: string) => void;
  setQuantity: (qty: number) => void;
  setSelectedImageId: (id: string | null) => void;
  generate: () => void;
  retryImage: (id: string) => void;
  deleteImage: (id: string) => void;
  useAsReference: (imageUrl: string) => void;
  loadHistory: () => Promise<void>;
};

export const MODELS = [
  { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image', desc: 'Fast image gen & editing, pro-level quality', featured: true, badge: 'NEW' as const },
  { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image', desc: 'Next-gen image generation, highest quality', featured: true },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', desc: 'Fast & stable, great value', featured: true },
  { id: 'flux-kontext-pro', name: 'Flux Kontext Pro', desc: 'High quality, flexible aspect ratios, uncensored', featured: true },
  { id: 'flux-kontext-max', name: 'Flux Kontext Max', desc: 'Maximum quality, professional grade, uncensored', featured: true },
  { id: 'flux-dev', name: 'Flux Dev', desc: 'Development model, fast iterations', featured: false },
  { id: 'flux-pro', name: 'Flux Pro', desc: 'Production quality flux model', featured: false },
];

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
}): Promise<{ imageUrl?: string; imageBase64?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('generate-image', {
    body: {
      prompt: params.prompt,
      referenceImages: params.referenceImages,
      model: params.model,
      quality: params.quality,
      aspectRatio: params.aspectRatio,
    },
  });

  if (error) {
    console.error('Edge function error:', error);
    return { error: error.message || 'Generation failed' };
  }

  if (data?.error) {
    return { error: data.error };
  }

  return { imageUrl: data?.imageUrl, imageBase64: data?.imageBase64 };
}

// Upload image to storage and return public URL
async function uploadToStorage(imageData: string, id: string): Promise<string | null> {
  try {
    let blob: Blob;
    let ext = 'png';

    if (imageData.startsWith('data:')) {
      // Base64 data URI → blob
      const match = imageData.match(/^data:(image\/(\w+));base64,(.+)$/);
      if (!match) return null;
      ext = match[2] === 'jpeg' ? 'jpg' : match[2];
      const binary = atob(match[3]);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: match[1] });
    } else if (imageData.startsWith('http')) {
      // URL → fetch and upload
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

// Save a completed generation to the database
async function saveToDb(img: GeneratedImage, storageUrl: string) {
  const { error } = await supabase.from('generations').insert({
    id: img.id,
    prompt: img.prompt,
    model: img.model,
    quality: img.quality,
    aspect_ratio: img.aspectRatio,
    image_url: storageUrl,
    status: img.status,
    error: img.error || null,
  } as any);
  if (error) console.error('DB insert error:', error);
}

export const useGeneratorStore = create<GeneratorState>()((set, get) => ({
  prompt: localStorage.getItem('gen-last-prompt') || '',
  referenceImages: [],
  model: (localStorage.getItem('gen-last-model') as string) || 'gemini-3.1-flash-image',
  quality: (localStorage.getItem('gen-last-quality') as string) || '2K',
  aspectRatio: (localStorage.getItem('gen-last-ar') as string) || '1:1',
  quantity: 4,
  images: [],
  selectedImageId: null,
  historyLoaded: false,

  setPrompt: (prompt) => { set({ prompt }); localStorage.setItem('gen-last-prompt', prompt); },
  addReferenceImage: (img) => {
    const refs = get().referenceImages;
    if (refs.length < 5) {
      const next = [...refs, img];
      set({ referenceImages: next });
      set({ referenceImages: next });
    }
  },
  removeReferenceImage: (index) => {
    const next = get().referenceImages.filter((_, i) => i !== index);
    set({ referenceImages: next });
    localStorage.setItem('gen-last-refs', JSON.stringify(next));
  },
  reorderReferenceImages: (fromIndex, toIndex) => {
    const imgs = [...get().referenceImages];
    const [moved] = imgs.splice(fromIndex, 1);
    imgs.splice(toIndex, 0, moved);
    set({ referenceImages: imgs });
  },
  setModel: (model) => { set({ model }); localStorage.setItem('gen-last-model', model); },
  setQuality: (quality) => { set({ quality }); localStorage.setItem('gen-last-quality', quality); },
  setAspectRatio: (aspectRatio) => { set({ aspectRatio }); localStorage.setItem('gen-last-ar', aspectRatio); },
  setQuantity: (qty) => set({ quantity: Math.max(1, Math.min(4, qty)) }),
  setSelectedImageId: (id) => set({ selectedImageId: id }),

  loadHistory: async () => {
    if (get().historyLoaded) return;
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) as any;

      if (error) {
        console.error('Load history error:', error);
        return;
      }

      if (data && data.length > 0) {
        const loaded: GeneratedImage[] = data.map((row: any) => ({
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
        }));

        // Merge: keep any in-progress images, append loaded history
        const current = get().images;
        const currentIds = new Set(current.map((i) => i.id));
        const newFromDb = loaded.filter((i) => !currentIds.has(i.id));
        set({ images: [...current, ...newFromDb], historyLoaded: true });
      } else {
        set({ historyLoaded: true });
      }
    } catch (e) {
      console.error('Load history error:', e);
      set({ historyLoaded: true });
    }
  },

  generate: () => {
    const { prompt, referenceImages, model, quality, aspectRatio, quantity } = get();
    if (!prompt.trim()) return;

    const newImages: GeneratedImage[] = Array.from({ length: quantity }, (_, i) => ({
      id: `img-${Date.now()}-${i}`,
      prompt,
      referenceImages: [...referenceImages],
      model,
      quality,
      aspectRatio,
      status: 'generating' as const,
      createdAt: Date.now(),
    }));

    set({ images: [...newImages, ...get().images] });

    newImages.forEach(async (img) => {
      try {
        const result = await callGenerateAPI({ prompt, referenceImages, model, quality, aspectRatio });

        if (result.error) {
          set({
            images: get().images.map((i) =>
              i.id === img.id ? { ...i, status: 'failed' as const, error: result.error } : i
            ),
          });
        } else {
          const rawUrl = result.imageBase64 || result.imageUrl;
          
          // Upload to storage for persistence
          let persistentUrl = rawUrl;
          if (rawUrl) {
            const storageUrl = await uploadToStorage(rawUrl, img.id);
            if (storageUrl) {
              persistentUrl = storageUrl;
              // Save to database
              await saveToDb(
                { ...img, status: 'complete', imageUrl: persistentUrl },
                persistentUrl
              );
            }
          }

          set({
            images: get().images.map((i) =>
              i.id === img.id
                ? { ...i, status: 'complete' as const, imageUrl: persistentUrl }
                : i
            ),
          });
        }
      } catch (e) {
        console.error('Generation error:', e);
        set({
          images: get().images.map((i) =>
            i.id === img.id
              ? { ...i, status: 'failed' as const, error: e instanceof Error ? e.message : 'Unknown error' }
              : i
          ),
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
            await saveToDb({ ...img, status: 'complete', imageUrl: persistentUrl }, persistentUrl);
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
    if (refs.length < 5) {
      set({ referenceImages: [...refs, imageUrl], selectedImageId: null });
    }
  },
}));
