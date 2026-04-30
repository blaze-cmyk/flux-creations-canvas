import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, Plus, Pin, Sparkles, User, UserRound, Loader2, ArrowLeft, UploadCloud, RefreshCw } from 'lucide-react';
import { useAvatars } from '@/hooks/useMarketingLibrary';
import { toast } from '@/hooks/use-toast';

type View = 'list' | 'create';

export function AvatarModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (a: { id: string; name: string; thumb: string }) => void;
}) {
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<'all' | 'pinned' | 'mine'>('all');
  const [gender, setGender] = useState<'all' | 'male' | 'female'>('all');
  const [query, setQuery] = useState('');
  const { avatars, loading, uploadAvatar } = useAvatars();

  // create-view state
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!open) {
      // reset on close
      setView('list');
      setFile(null);
      setName('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    return avatars.filter((a) => {
      if (tab === 'mine' && a.is_builtin) return false;
      if (gender !== 'all' && a.gender && a.gender !== gender) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [avatars, tab, gender, query]);

  const handleCreate = async () => {
    if (!file || !name.trim()) return;
    setCreating(true);
    try {
      await uploadAvatar(file, name.trim());
      toast({ title: 'Avatar created' });
      setView('list');
      setFile(null);
      setName('');
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-ms-surface border-ms-border p-0 overflow-hidden">
        {view === 'list' ? (
          <>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <button
                    onClick={() => setView('create')}
                    className="aspect-[4/5] rounded-xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-foreground/40 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-ms-border grid place-items-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-medium text-foreground">Create avatar</div>
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
          </>
        ) : (
          <CreateAvatarView
            file={file}
            previewUrl={previewUrl}
            name={name}
            creating={creating}
            onPickFile={() => fileRef.current?.click()}
            onChangeName={setName}
            onBack={() => setView('list')}
            onCreate={handleCreate}
            fileRef={fileRef}
            onFileSelected={setFile}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateAvatarView({
  file,
  previewUrl,
  name,
  creating,
  onPickFile,
  onChangeName,
  onBack,
  onCreate,
  fileRef,
  onFileSelected,
}: {
  file: File | null;
  previewUrl: string;
  name: string;
  creating: boolean;
  onPickFile: () => void;
  onChangeName: (v: string) => void;
  onBack: () => void;
  onCreate: () => void;
  fileRef: React.RefObject<HTMLInputElement>;
  onFileSelected: (f: File) => void;
}) {
  const canCreate = !!file && name.trim().length > 0 && !creating;

  return (
    <div className="p-5 md:p-6">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
          e.target.value = '';
        }}
      />
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={onBack}
          className="w-9 h-9 grid place-items-center rounded-full bg-ms-surface-2 hover:bg-ms-border text-foreground"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-base font-semibold text-foreground">New avatar</div>
        <div className="w-9" />
      </div>

      <div className="grid md:grid-cols-2 gap-5 min-h-[440px]">
        {/* Upload zone */}
        <div className="relative">
          {creating ? (
            <div className="aspect-[4/5] w-full rounded-2xl bg-ms-surface-2 border border-ms-border flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-foreground" />
              <div className="text-sm font-semibold text-foreground">Uploading</div>
              <div className="text-xs text-muted-foreground">This may take a few seconds</div>
            </div>
          ) : previewUrl ? (
            <div className="relative aspect-[4/5] w-full rounded-2xl overflow-hidden bg-ms-surface-2 border border-ms-border">
              <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
              <button
                onClick={onPickFile}
                className="absolute bottom-3 left-3 inline-flex items-center gap-2 h-9 px-4 rounded-full bg-background/90 backdrop-blur text-foreground text-xs font-semibold hover:bg-background"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Replace
              </button>
            </div>
          ) : (
            <button
              onClick={onPickFile}
              className="group aspect-[4/5] w-full rounded-2xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-foreground/40 flex flex-col items-center justify-center gap-3 transition-colors"
            >
              <div className="w-14 h-14 rounded-full border border-ms-border grid place-items-center text-muted-foreground group-hover:text-foreground">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-foreground">Upload from device</div>
              <div className="text-xs text-muted-foreground">Upload photo to create avatar</div>
            </button>
          )}
        </div>

        {/* Right: name + create */}
        <div className="flex flex-col">
          <label className="text-sm text-muted-foreground mb-2">Name Avatar</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
            <input
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              placeholder="Avatar name"
              maxLength={32}
              className="w-full h-12 pl-8 pr-3 rounded-xl bg-ms-surface-2 border border-ms-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
            />
          </div>

          <div className="flex-1" />

          <button
            disabled={!canCreate}
            onClick={onCreate}
            className="mt-6 h-12 w-full rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
              </>
            ) : (
              'Create Avatar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
