import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMemo, useRef, useState } from 'react';
import { Search, Plus, Pin, Sparkles, User, UserRound, Loader2 } from 'lucide-react';
import { useAvatars, DBAvatar } from '@/hooks/useMarketingLibrary';
import { toast } from '@/hooks/use-toast';

export function AvatarModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (a: { id: string; name: string; thumb: string }) => void;
}) {
  const [tab, setTab] = useState<'all' | 'pinned' | 'mine'>('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [query, setQuery] = useState('');
  const { avatars, loading, uploadAvatar } = useAvatars();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return avatars.filter((a) => {
      if (tab === 'mine' && a.is_builtin) return false;
      if (gender !== 'all' && a.gender && a.gender !== gender) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [avatars, tab, gender, query]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const name = file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'My avatar';
      await uploadAvatar(file, name);
      toast({ title: 'Avatar added' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

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
                <User className="w-3 h-3" /> Male
              </button>
              <button
                onClick={() => setGender(gender === 'female' ? 'all' : 'female')}
                className={`flex items-center gap-1 px-3 h-8 rounded-full text-xs border ${
                  gender === 'female' ? 'bg-ms-surface-2 border-foreground/40 text-foreground' : 'border-ms-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserRound className="w-3 h-3" /> Female
              </button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto ms-scroll">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = '';
              }}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="aspect-[4/5] rounded-xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-foreground/40 flex flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                <div className="w-10 h-10 rounded-lg bg-ms-border grid place-items-center">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </div>
                <div className="text-xs font-medium text-foreground">{uploading ? 'Uploading…' : 'Create avatar'}</div>
              </button>
              {loading ? (
                <div className="col-span-full text-center text-muted-foreground py-8 text-sm">Loading…</div>
              ) : (
                filtered.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      onSelect?.({ id: a.id, name: a.name, thumb: a.thumb });
                      onOpenChange(false);
                    }}
                    className="group relative aspect-[4/5] rounded-xl overflow-hidden bg-ms-surface-2"
                  >
                    {a.thumb ? (
                      <img src={a.thumb} alt={a.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full bg-ms-border" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="text-xs font-semibold text-white">{a.name}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
