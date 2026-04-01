import { create } from 'zustand';

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
};

type GeneratorState = {
  prompt: string;
  referenceImages: string[]; // base64 or URLs, max 5
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
  { id: 'auto', name: 'Auto', desc: 'The best model for any prompt, chosen for you', featured: true },
  { id: 'higgsfield-soul-2', name: 'Higgsfield Soul 2.0', desc: 'Next generation ultra-realistic fashion visuals', featured: true, badge: 'NEW' },
  { id: 'higgsfield-soul-cinema', name: 'Higgsfield Soul Cinema', desc: 'Cinema-grade visual creation', featured: true, badge: 'NEW' },
  { id: 'seedream-5-lite', name: 'Seedream 5.0 lite', desc: 'Intelligent visual reasoning', featured: true, badge: 'UNLIMITED' },
  { id: 'seedream-4.5', name: 'Seedream 4.5', desc: "ByteDance's next-gen 4K image model", featured: true, badge: 'UNLIMITED' },
  { id: 'nano-banana-2', name: 'Nano Banana 2', desc: 'Pro quality at Flash speed', featured: true },
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', desc: "Google's flagship generation model", featured: true },
  { id: 'nano-banana', name: 'Nano Banana', desc: "Google's standard generation model", badge: 'UNLIMITED' },
  { id: 'higgsfield-soul', name: 'Higgsfield Soul', desc: 'Ultra-realistic fashion visuals', badge: 'UNLIMITED' },
  { id: 'flux-dev', name: 'Flux Dev', desc: 'High quality open source model' },
  { id: 'flux-pro', name: 'Flux Pro', desc: 'Professional quality generation' },
  { id: 'dall-e-3', name: 'DALL-E 3', desc: 'OpenAI image generation' },
  { id: 'sdxl', name: 'Stable Diffusion XL', desc: 'Open source diffusion model' },
];

export const ASPECT_RATIOS = [
  'Auto', '1:1', '3:4', '4:3', '2:3', '3:2', '9:16', '16:9', '5:4', '4:5', '21:9'
];

export const QUALITIES = ['1K', '2K', '4K'];

export const useGeneratorStore = create<GeneratorState>((set, get) => ({
  prompt: '',
  referenceImages: [],
  model: 'nano-banana-pro',
  quality: '4K',
  aspectRatio: '9:16',
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

    // Simulate generation (replace with real API call)
    newImages.forEach((img) => {
      const delay = 2000 + Math.random() * 3000;
      setTimeout(() => {
        const statuses: GeneratedImage['status'][] = ['complete', 'complete', 'complete', 'failed'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        set({
          images: get().images.map((i) =>
            i.id === img.id
              ? {
                  ...i,
                  status,
                  imageUrl: status === 'complete'
                    ? `https://picsum.photos/seed/${img.id}/${aspectRatio === '9:16' ? '576/1024' : aspectRatio === '16:9' ? '1024/576' : aspectRatio === '1:1' ? '768/768' : aspectRatio === '3:4' ? '576/768' : aspectRatio === '4:3' ? '768/576' : '576/1024'}`
                    : undefined,
                  width: 3072,
                  height: 5504,
                }
              : i
          ),
        });
      }, delay);
    });
  },

  retryImage: (id) => {
    set({
      images: get().images.map((i) =>
        i.id === id ? { ...i, status: 'generating' } : i
      ),
    });
    setTimeout(() => {
      set({
        images: get().images.map((i) =>
          i.id === id
            ? { ...i, status: 'complete', imageUrl: `https://picsum.photos/seed/${id}-retry/576/1024`, width: 3072, height: 5504 }
            : i
        ),
      });
    }, 3000);
  },

  deleteImage: (id) => {
    set({ images: get().images.filter((i) => i.id !== id), selectedImageId: get().selectedImageId === id ? null : get().selectedImageId });
  },

  useAsReference: (imageUrl) => {
    const refs = get().referenceImages;
    if (refs.length < 5) {
      set({ referenceImages: [...refs, imageUrl], selectedImageId: null });
    }
  },
}));
