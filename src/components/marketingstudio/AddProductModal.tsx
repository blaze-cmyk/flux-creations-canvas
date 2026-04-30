import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEffect, useRef, useState } from 'react';
import {
  Link as LinkIcon,
  MoreHorizontal,
  Package,
  Smartphone,
  Loader2,
  ArrowLeft,
  UploadCloud,
  Plus,
  X,
} from 'lucide-react';
import { useProducts } from '@/hooks/useMarketingLibrary';
import { toast } from '@/hooks/use-toast';

type View = 'list' | 'create';

export function AddProductModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (item: { id: string; name: string; thumb: string }, kind: 'product' | 'app') => void;
}) {
  const [view, setView] = useState<View>('list');
  const [tab, setTab] = useState<'product' | 'app'>('product');
  const { products, loading, uploadProductImages, createFromUrl } = useProducts();

  // create state
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  useEffect(() => {
    if (!open) {
      setView('list');
      setFiles([]);
      setName('');
      setUrl('');
    }
  }, [open]);

  const addFiles = (list: FileList | File[]) => {
    const arr = Array.from(list).slice(0, 6 - files.length);
    if (!arr.length) return;
    setFiles((prev) => [...prev, ...arr].slice(0, 6));
    if (!name) {
      const guess = arr[0].name.replace(/\.[^.]+$/, '').slice(0, 32);
      if (guess) setName(guess);
    }
  };

  const handleCreate = async () => {
    if (tab === 'product') {
      if (files.length === 0 || !name.trim()) return;
      setBusy(true);
      try {
        await uploadProductImages(files, name.trim());
        toast({ title: 'Product added' });
        setView('list');
        setFiles([]);
        setName('');
      } catch (e: any) {
        toast({ title: 'Upload failed', description: e?.message ?? '', variant: 'destructive' });
      } finally {
        setBusy(false);
      }
    } else {
      if (!url.trim()) return;
      setBusy(true);
      try {
        await createFromUrl(url.trim());
        toast({ title: 'App imported' });
        setView('list');
        setUrl('');
      } catch (e: any) {
        toast({ title: 'Import failed', description: e?.message ?? '', variant: 'destructive' });
      } finally {
        setBusy(false);
      }
    }
  };

  const canCreate =
    !busy &&
    ((tab === 'product' && files.length > 0 && name.trim().length > 0) ||
      (tab === 'app' && url.trim().length > 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl bg-ms-surface border-ms-border p-0 overflow-hidden">
        {view === 'list' ? (
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="text-sm font-semibold text-foreground">Select Product</div>
              <div className="inline-flex p-1 rounded-full bg-ms-surface-2 border border-ms-border">
                {(['product', 'app'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-4 h-8 rounded-full text-xs font-medium transition-colors ${
                      tab === t ? 'bg-ms-border text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'product' ? <Package className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                    {t === 'product' ? 'Product' : 'App'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto ms-scroll pr-1">
              <button
                onClick={() => setView('create')}
                className="aspect-square rounded-xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-foreground/40 flex flex-col items-center justify-center gap-2 text-muted-foreground transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-ms-border grid place-items-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="text-xs font-medium text-foreground">
                  {tab === 'product' ? 'Add product' : 'Add app'}
                </div>
              </button>

              {loading && (
                <div className="col-span-full text-center text-muted-foreground text-sm py-6">Loading…</div>
              )}
              {!loading && products.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground text-sm py-6">
                  No products yet. Click "Add product" to get started.
                </div>
              )}
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (p.status === 'failed') return;
                    onSelect?.({ id: p.id, name: p.name, thumb: p.primary_thumb || '' }, tab);
                    onOpenChange(false);
                  }}
                  className="group text-left"
                  disabled={p.status === 'failed'}
                >
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-ms-surface-2 ring-1 ring-ms-border group-hover:ring-foreground/40 transition-all">
                    {p.primary_thumb ? (
                      <img src={p.primary_thumb} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[10px] text-muted-foreground p-2 text-center">
                        {p.status === 'failed' ? p.error || 'Failed to create' : 'No image'}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-foreground truncate">{p.name}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5 md:p-6">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setView('list')}
                className="w-9 h-9 grid place-items-center rounded-full bg-ms-surface-2 hover:bg-ms-border text-foreground"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-base font-semibold text-foreground">
                {tab === 'product' ? 'New product' : 'New app'}
              </div>
              <div className="w-9" />
            </div>

            {/* tab toggle inside create view too */}
            <div className="flex justify-center mb-5">
              <div className="inline-flex p-1 rounded-full bg-ms-surface-2 border border-ms-border">
                {(['product', 'app'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-4 h-8 rounded-full text-xs font-medium transition-colors ${
                      tab === t ? 'bg-ms-border text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t === 'product' ? <Package className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                    {t === 'product' ? 'Product' : 'App'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5 min-h-[440px]">
              {/* Left: upload area (product) or app preview placeholder */}
              <div className="relative">
                {tab === 'product' ? (
                  busy ? (
                    <div className="aspect-square w-full rounded-2xl bg-ms-surface-2 border border-ms-border flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-foreground" />
                      <div className="text-sm font-semibold text-foreground">Uploading</div>
                      <div className="text-xs text-muted-foreground">This may take a few seconds</div>
                    </div>
                  ) : previews.length > 0 ? (
                    <div className="rounded-2xl bg-ms-surface-2 border border-ms-border p-3">
                      <div className="grid grid-cols-3 gap-2">
                        {previews.map((src, i) => (
                          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-ms-border">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/60 text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            {i === 0 && (
                              <div className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] rounded bg-black/60 text-white">
                                Primary
                              </div>
                            )}
                          </div>
                        ))}
                        {files.length < 6 && (
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="aspect-square rounded-lg border border-dashed border-ms-border hover:border-foreground/40 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground text-center">
                        {files.length} / 6 images · first image is the cover
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="group aspect-square w-full rounded-2xl bg-ms-surface-2 border border-dashed border-ms-border hover:border-foreground/40 flex flex-col items-center justify-center gap-3 transition-colors"
                    >
                      <div className="w-14 h-14 rounded-full border border-ms-border grid place-items-center text-muted-foreground group-hover:text-foreground">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-semibold text-foreground">Upload from device</div>
                      <div className="text-xs text-muted-foreground">Up to 6 product images</div>
                    </button>
                  )
                ) : (
                  <div className="aspect-square w-full rounded-2xl bg-ms-surface-2 border border-ms-border flex flex-col items-center justify-center gap-3 text-center px-6">
                    <div className="w-14 h-14 rounded-full border border-ms-border grid place-items-center text-muted-foreground">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-foreground">Paste your app URL</div>
                    <div className="text-xs text-muted-foreground">
                      We'll fetch interface, voice, flows, and product story.
                    </div>
                  </div>
                )}
              </div>

              {/* Right: form */}
              <div className="flex flex-col">
                {tab === 'product' ? (
                  <>
                    <label className="text-sm text-muted-foreground mb-2">Name Product</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Product name"
                        maxLength={48}
                        className="w-full h-12 pl-8 pr-3 rounded-xl bg-ms-surface-2 border border-ms-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <label className="text-sm text-muted-foreground mb-2">App URL</label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="www.yourapp.com"
                        className="w-full h-12 pl-9 pr-3 rounded-xl bg-ms-surface-2 border border-ms-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                      />
                    </div>
                  </>
                )}

                <div className="flex-1" />

                <button
                  disabled={!canCreate}
                  onClick={handleCreate}
                  className="mt-6 h-12 w-full rounded-xl bg-foreground text-background text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {tab === 'product' ? 'Uploading…' : 'Importing…'}
                    </>
                  ) : tab === 'product' ? (
                    'Create Product'
                  ) : (
                    'Import App'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
