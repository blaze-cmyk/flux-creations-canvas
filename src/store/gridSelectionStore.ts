import { create } from 'zustand';

type State = {
  selected: Set<string>;
  toggle: (id: string) => void;
  clear: () => void;
  selectMany: (ids: string[]) => void;
};

export const useGridSelectionStore = create<State>((set, get) => ({
  selected: new Set(),
  toggle: (id) => {
    const s = new Set(get().selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    set({ selected: s });
  },
  clear: () => set({ selected: new Set() }),
  selectMany: (ids) => set({ selected: new Set(ids) }),
}));
