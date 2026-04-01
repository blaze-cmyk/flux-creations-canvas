import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export type GeneratedVideo = {
  id: string;
  prompt: string;
  referenceImages: string[];
  model: string;
  mode: 'text-to-video' | 'image-to-video' | 'motion-control';
  aspectRatio: string;
  duration: string;
  status: 'generating' | 'complete' | 'failed' | 'nsfw';
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: number;
  error?: string;
};

export const VIDEO_MODELS = [
  // Kling (via fal.ai)
  { id: 'kling-v3-pro', name: 'Kling 3.0 Pro', desc: 'Top-tier cinematic visuals, fluid motion, audio', featured: true, badge: 'NEW' as const, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  { id: 'kling-v3-motion', name: 'Kling 3.0 Motion Control', desc: 'Transfer motion from video to image', featured: true, badge: 'NEW' as const, provider: 'fal', modes: ['motion-control'] as const },
  { id: 'kling-o3-pro', name: 'Kling O3 Pro', desc: 'Start+end frame animation with style guidance', featured: true, badge: 'NEW' as const, provider: 'fal', modes: ['image-to-video'] as const },
  { id: 'kling-v2.5-turbo-pro', name: 'Kling 2.5 Turbo Pro', desc: 'Fast cinematic video, great prompt precision', featured: true, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  { id: 'kling-v2.6-pro', name: 'Kling 2.6 Pro', desc: 'High-quality image-to-video with audio', featured: false, provider: 'fal', modes: ['image-to-video'] as const },
  { id: 'kling-v2.6-motion-std', name: 'Kling Motion Control', desc: 'Control motion with video references (Standard)', featured: true, provider: 'fal', modes: ['motion-control'] as const },
  { id: 'kling-v2.6-motion-pro', name: 'Kling Motion Control Pro', desc: 'Pro-quality motion transfer, complex dance', featured: true, provider: 'fal', modes: ['motion-control'] as const },
  // Veo (via fal.ai)
  { id: 'veo-3.1', name: 'Veo 3.1', desc: 'Google\'s most advanced video model, with sound', featured: true, badge: 'NEW' as const, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  { id: 'veo-3.1-fast', name: 'Veo 3.1 Fast', desc: 'Faster Veo 3.1 for quick iterations', featured: true, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  { id: 'veo-3.1-lite', name: 'Veo 3.1 Lite', desc: 'Balanced quality and speed', featured: false, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  // MiniMax / Hailuo (via fal.ai)
  { id: 'minimax-video', name: 'MiniMax Hailuo', desc: 'Generate video clips from prompts', featured: true, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  // PixVerse (via fal.ai)
  { id: 'pixverse-v6', name: 'PixVerse V6', desc: 'Lifelike physics and striking visuals', featured: true, badge: 'NEW' as const, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  // LTX (via fal.ai)
  { id: 'ltx-2-19b', name: 'LTX-2 19B', desc: 'Video with audio from images', featured: false, provider: 'fal', modes: ['text-to-video', 'image-to-video'] as const },
  // Seedance (via Runware)
  { id: 'rw-seedance-1.5-pro', name: 'Seedance 1.5 Pro', desc: 'ByteDance motion control video', featured: true, badge: 'NEW' as const, provider: 'runware', modes: ['text-to-video', 'image-to-video', 'motion-control'] as const },
  // Runway (via Runware)  
  { id: 'rw-runway-gen4.5', name: 'Runway Gen-4.5', desc: 'Advanced multimodal video generation', featured: true, provider: 'runware', modes: ['text-to-video', 'image-to-video'] as const },
  // Sora (via Runware)
  { id: 'rw-sora-2', name: 'Sora 2', desc: 'OpenAI video generation', featured: true, provider: 'runware', modes: ['text-to-video', 'image-to-video'] as const },
  // Kling via Runware
  { id: 'rw-kling-2.5', name: 'RW Kling 2.5 Turbo Pro', desc: 'Kling via Runware, no filter', featured: false, provider: 'runware', modes: ['text-to-video', 'image-to-video'] as const },
  // Veo via Runware
  { id: 'rw-veo-3.1', name: 'RW Veo 3.1', desc: 'Google Veo via Runware', featured: false, provider: 'runware', modes: ['text-to-video', 'image-to-video'] as const },
  { id: 'rw-veo-3.1-fast', name: 'RW Veo 3.1 Fast', desc: 'Fast Veo via Runware', featured: false, provider: 'runware', modes: ['text-to-video', 'image-to-video'] as const },
];

export const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1'];
export const VIDEO_DURATIONS = ['5', '10'];

type VideoState = {
  prompt: string;
  referenceImages: string[];
  motionVideo: string | null;
  model: string;
  mode: 'text-to-video' | 'image-to-video' | 'motion-control';
  aspectRatio: string;
  duration: string;
  videos: GeneratedVideo[];
  selectedVideoId: string | null;
  setPrompt: (p: string) => void;
  addReferenceImage: (img: string) => void;
  removeReferenceImage: (idx: number) => void;
  setMotionVideo: (v: string | null) => void;
  setModel: (m: string) => void;
  setMode: (m: 'text-to-video' | 'image-to-video' | 'motion-control') => void;
  setAspectRatio: (ar: string) => void;
  setDuration: (d: string) => void;
  setSelectedVideoId: (id: string | null) => void;
  generate: () => void;
  retryVideo: (id: string) => void;
  deleteVideo: (id: string) => void;
};

export const useVideoStore = create<VideoState>()((set, get) => ({
  prompt: '',
  referenceImages: [],
  motionVideo: null,
  model: 'kling-v3-pro',
  mode: 'text-to-video',
  aspectRatio: '16:9',
  duration: '5',
  videos: [],
  selectedVideoId: null,

  setPrompt: (prompt) => set({ prompt }),
  addReferenceImage: (img) => {
    const refs = get().referenceImages;
    if (refs.length < 3) set({ referenceImages: [...refs, img] });
  },
  removeReferenceImage: (idx) => set({ referenceImages: get().referenceImages.filter((_, i) => i !== idx) }),
  setMotionVideo: (v) => set({ motionVideo: v }),
  setModel: (model) => set({ model }),
  setMode: (mode) => set({ mode }),
  setAspectRatio: (ar) => set({ aspectRatio: ar }),
  setDuration: (d) => set({ duration: d }),
  setSelectedVideoId: (id) => set({ selectedVideoId: id }),

  generate: () => {
    const { prompt, referenceImages, model, mode, aspectRatio, duration } = get();
    if (!prompt.trim() && mode === 'text-to-video') return;
    if (mode === 'image-to-video' && referenceImages.length === 0) return;

    const newVideo: GeneratedVideo = {
      id: crypto.randomUUID(),
      prompt,
      referenceImages: [...referenceImages],
      model,
      mode,
      aspectRatio,
      duration,
      status: 'generating',
      createdAt: Date.now(),
    };

    set({ videos: [newVideo, ...get().videos] });

    supabase.functions.invoke('generate-video', {
      body: { prompt, referenceImages, model, mode, aspectRatio, duration },
    }).then(async ({ data, error }) => {
      if (error) {
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) {
              set({ videos: get().videos.map(v => v.id === newVideo.id ? { ...v, status: 'failed', error: body.error } : v) });
              return;
            }
          }
        } catch {}
        set({ videos: get().videos.map(v => v.id === newVideo.id ? { ...v, status: 'failed', error: error.message } : v) });
        return;
      }

      if (data?.error) {
        const isNsfw = data.filtered;
        set({ videos: get().videos.map(v => v.id === newVideo.id ? { ...v, status: isNsfw ? 'nsfw' : 'failed', error: data.error } : v) });
        return;
      }

      set({ videos: get().videos.map(v => v.id === newVideo.id ? { ...v, status: 'complete', videoUrl: data?.videoUrl } : v) });
    }).catch((e) => {
      set({ videos: get().videos.map(v => v.id === newVideo.id ? { ...v, status: 'failed', error: e.message } : v) });
    });
  },

  retryVideo: (id) => {
    const video = get().videos.find(v => v.id === id);
    if (!video) return;
    set({ videos: get().videos.map(v => v.id === id ? { ...v, status: 'generating', error: undefined } : v) });

    supabase.functions.invoke('generate-video', {
      body: { prompt: video.prompt, referenceImages: video.referenceImages, model: video.model, mode: video.mode, aspectRatio: video.aspectRatio, duration: video.duration },
    }).then(async ({ data, error }) => {
      if (error || data?.error) {
        set({ videos: get().videos.map(v => v.id === id ? { ...v, status: 'failed', error: data?.error || error?.message || 'Failed' } : v) });
        return;
      }
      set({ videos: get().videos.map(v => v.id === id ? { ...v, status: 'complete', videoUrl: data?.videoUrl } : v) });
    });
  },

  deleteVideo: (id) => {
    set({
      videos: get().videos.filter(v => v.id !== id),
      selectedVideoId: get().selectedVideoId === id ? null : get().selectedVideoId,
    });
  },
}));
