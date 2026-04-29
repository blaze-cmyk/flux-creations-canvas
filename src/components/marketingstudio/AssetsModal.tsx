import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useState } from 'react';
import { Plus } from 'lucide-react';

const MOCK_GENERATIONS = Array.from({ length: 18 }).map((_, i) => ({
  id: `g${i}`,
  url: `https://picsum.photos/seed/ms-gen-${i}/300/400`,
}));

export function AssetsModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (url: string) => void;
}) {
  const [tab, setTab] = useState<'uploads' | 'generations' | 'liked'>('generations');
  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'uploads', label: 'Uploads' },
    { id: 'generations', label: 'Image Generations' },
    { id: 'liked', label: 'Liked' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-ms-surface border-ms-border p-0 overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-ms-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 h-9 rounded-full text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-ms-surface-2'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 max-h-[70vh] overflow-y-auto ms-scroll">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {tab === 'uploads' && (
              <button className="aspect-square rounded-xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-muted-foreground/40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <div className="w-9 h-9 rounded-full bg-ms-border grid place-items-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-xs font-medium text-foreground">Upload media</div>
              </button>
            )}
            {MOCK_GENERATIONS.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  onSelect?.(g.url);
                  onOpenChange(false);
                }}
                className="group relative aspect-square rounded-xl overflow-hidden bg-ms-surface-2"
              >
                <img src={g.url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-0 ring-0 group-hover:ring-2 ring-ms-cta rounded-xl transition-all" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
