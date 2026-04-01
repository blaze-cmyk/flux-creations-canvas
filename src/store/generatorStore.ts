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
  setPrompt: (prompt: string) => void;
  addReferenceImage: (img: string) => void;
  removeReferenceImage: (index: number) => void;
  setModel: (model: string) => void;
  setQuality: (quality: string) => void;
  setAspectRatio: (ar: string) => void;
  setQuantity: (qty: number) => void;
  setSelectedImageId: (id: string | null) => void;
  generate: () => void;
  retryImage: (id: string) => void;
  deleteImage: (id: string) => void;
  useAsReference: (imageUrl: string) => void;
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

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  prompt: '',
  referenceImages: [],
  model: 'gemini-3.1-flash-image',
  quality: '2K',
  aspectRatio: '1:1',
  quantity: 4,
  images: [],
  selectedImageId: null,

  setPrompt: (prompt) => set({ prompt }),
  addReferenceImage: (img) => {
    const refs = get().referenceImages;
    if (refs.length < 5) set({ referenceImages: [...refs, img] });
  },
  removeReferenceImage: (index) => {
    set({ referenceImages: get().referenceImages.filter((_, i) => i !== index) });
  },
  setModel: (model) => set({ model }),
  setQuality: (quality) => set({ quality }),
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  setQuantity: (qty) => set({ quantity: Math.max(1, Math.min(4, qty)) }),
  setSelectedImageId: (id) => set({ selectedImageId: id }),

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

    // Call API for each image
    newImages.forEach(async (img) => {
      try {
        const result = await callGenerateAPI({
          prompt,
          referenceImages,
          model,
          quality,
          aspectRatio,
        });

        if (result.error) {
          set({
            images: get().images.map((i) =>
              i.id === img.id ? { ...i, status: 'failed' as const, error: result.error } : i
            ),
          });
        } else {
          const finalUrl = result.imageBase64 || result.imageUrl;
          set({
            images: get().images.map((i) =>
              i.id === img.id
                ? { ...i, status: 'complete' as const, imageUrl: finalUrl }
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
    }).then((result) => {
      if (result.error) {
        set({
          images: get().images.map((i) =>
            i.id === id ? { ...i, status: 'failed' as const, error: result.error } : i
          ),
        });
      } else {
        const finalUrl = result.imageBase64 || result.imageUrl;
        set({
          images: get().images.map((i) =>
            i.id === id ? { ...i, status: 'complete' as const, imageUrl: finalUrl } : i
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
  },

  useAsReference: (imageUrl) => {
    const refs = get().referenceImages;
    if (refs.length < 5) {
      set({ referenceImages: [...refs, imageUrl], selectedImageId: null });
    }
  },
}));
