import { create } from 'zustand';

type State = {
  search: string;
  modelFilter: string | null; // model id, null = all
  dateFilter: 'all' | 'today' | '7d' | '30d';
  setSearch: (s: string) => void;
  setModelFilter: (m: string | null) => void;
  setDateFilter: (d: 'all' | 'today' | '7d' | '30d') => void;
  reset: () => void;
};

export const useGridFilterStore = create<State>((set) => ({
  search: '',
  modelFilter: null,
  dateFilter: 'all',
  setSearch: (s) => set({ search: s }),
  setModelFilter: (m) => set({ modelFilter: m }),
  setDateFilter: (d) => set({ dateFilter: d }),
  reset: () => set({ search: '', modelFilter: null, dateFilter: 'all' }),
}));
