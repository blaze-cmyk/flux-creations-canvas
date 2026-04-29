import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMemo, useState } from 'react';
import { Search, Plus, Pin, Sparkles, Mars, Venus } from 'lucide-react';

interface Avatar {
  id: string;
  name: string;
  gender: 'male' | 'female';
  thumb: string;
  pinned?: boolean;
  mine?: boolean;
}

const AVATARS: Avatar[] = [
  { id: 'av1', name: 'Emily', gender: 'female', thumb: 'https://picsum.photos/seed/av-emily/240/300' },
  { id: 'av2', name: 'Sofia 4', gender: 'female', thumb: 'https://picsum.photos/seed/av-sofia4/240/300' },
  { id: 'av3', name: 'sofia 2', gender: 'female', thumb: 'https://picsum.photos/seed/av-sofia2/240/300' },
  { id: 'av4', name: 'Sofia', gender: 'female', thumb: 'https://picsum.photos/seed/av-sofia/240/300' },
  { id: 'av5', name: 'Jayden', gender: 'male', thumb: 'https://picsum.photos/seed/av-jayden/240/300' },
  { id: 'av6', name: 'Stefan', gender: 'male', thumb: 'https://picsum.photos/seed/av-stefan/240/300' },
  { id: 'av7', name: 'Mei', gender: 'female', thumb: 'https://picsum.photos/seed/av-mei/240/300' },
  { id: 'av8', name: 'Yuna', gender: 'female', thumb: 'https://picsum.photos/seed/av-yuna/240/300' },
  { id: 'av9', name: 'Adriana', gender: 'female', thumb: 'https://picsum.photos/seed/av-adriana/240/300' },
  { id: 'av10', name: 'Nora', gender: 'female', thumb: 'https://picsum.photos/seed/av-nora/240/300' },
  { id: 'av11', name: 'Luca', gender: 'male', thumb: 'https://picsum.photos/seed/av-luca/240/300' },
  { id: 'av12', name: 'Ines', gender: 'female', thumb: 'https://picsum.photos/seed/av-ines/240/300' },
];

export function AvatarModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (a: Avatar) => void;
}) {
  const [tab, setTab] = useState<'all' | 'pinned' | 'mine'>('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return AVATARS.filter((a) => {
      if (tab === 'pinned' && !a.pinned) return false;
      if (tab === 'mine' && !a.mine) return false;
      if (gender !== 'all' && a.gender !== gender) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [tab, gender, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-ms-surface border-ms-border p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4 border-b border-ms-border">
          <div className="text-sm font-semibold text-foreground">Select Avatar</div>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 h-9 rounded-full bg-ms-surface-2 border border-ms-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/40"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-[180px_1fr] max-h-[70vh]">
          {/* Left filter rail */}
          <div className="hidden md:block border-r border-ms-border p-3 space-y-1">
            {([
              { id: 'all', label: 'All', icon: Sparkles },
              { id: 'pinned', label: 'Pinned', icon: Pin },
              { id: 'mine', label: 'My avatars', icon: Sparkles },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 h-9 rounded-lg text-sm transition-colors ${
                  tab === t.id ? 'bg-ms-surface-2 text-foreground' : 'text-muted-foreground hover:bg-ms-surface-2 hover:text-foreground'
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
            <div className="mt-4 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">Gender</div>
            <div className="flex gap-2 px-1 mt-1">
              <button
                onClick={() => setGender(gender === 'male' ? 'all' : 'male')}
                className={`flex items-center gap-1 px-3 h-8 rounded-full text-xs border ${
                  gender === 'male' ? 'bg-ms-surface-2 border-foreground/40 text-foreground' : 'border-ms-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Mars className="w-3 h-3" /> Male
              </button>
              <button
                onClick={() => setGender(gender === 'female' ? 'all' : 'female')}
                className={`flex items-center gap-1 px-3 h-8 rounded-full text-xs border ${
                  gender === 'female' ? 'bg-ms-surface-2 border-foreground/40 text-foreground' : 'border-ms-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Venus className="w-3 h-3" /> Female
              </button>
            </div>
          </div>

          {/* Avatar grid */}
          <div className="p-4 overflow-y-auto ms-scroll">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <button className="aspect-[4/5] rounded-xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-foreground/40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <div className="w-10 h-10 rounded-lg bg-ms-border grid place-items-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-xs font-medium text-foreground">Create avatar</div>
              </button>
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    onSelect?.(a);
                    onOpenChange(false);
                  }}
                  className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-ms-surface-2"
                >
                  <img src={a.thumb} alt={a.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-xs font-semibold text-white">{a.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
