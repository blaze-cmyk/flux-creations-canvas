import { create } from 'zustand';

// Zoom 0..4 → smaller = more columns, larger = fewer columns
type LayoutState = {
  zoom: number;
  setZoom: (z: number) => void;
};

const STORAGE_KEY = 'gen-grid-zoom';

export const useLayoutStore = create<LayoutState>()((set) => ({
  zoom: (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const n = raw ? parseInt(raw, 10) : 2;
      return isNaN(n) ? 2 : Math.max(0, Math.min(4, n));
    } catch {
      return 2;
    }
  })(),
  setZoom: (z) => {
    const clamped = Math.max(0, Math.min(4, Math.round(z)));
    try { localStorage.setItem(STORAGE_KEY, String(clamped)); } catch {}
    set({ zoom: clamped });
  },
}));

// Tailwind column classes per zoom level (lower zoom = more columns / smaller images)
export const ZOOM_COLUMNS: string[] = [
  'columns-3 sm:columns-4 md:columns-6 xl:columns-7 2xl:columns-8',
  'columns-2 sm:columns-3 md:columns-5 xl:columns-6 2xl:columns-7',
  'columns-2 sm:columns-3 md:columns-4 xl:columns-5 2xl:columns-6',
  'columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5',
  'columns-1 sm:columns-2 md:columns-2 xl:columns-3 2xl:columns-3',
];
