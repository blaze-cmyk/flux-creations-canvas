import { create } from 'zustand';

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

// Approx target tile width (px) per zoom level — JS masonry uses this with
// container width to compute the column count responsively.
export const ZOOM_TILE_WIDTHS: number[] = [160, 200, 260, 340, 460];
