import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useRef, useState } from 'react';
import { Link as LinkIcon, MoreHorizontal, Package, Smartphone, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/useMarketingLibrary';
import { toast } from '@/hooks/use-toast';

export function AddProductModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (item: { id: string; name: string; thumb: string }, kind: 'product' | 'app') => void;
}) {
  const [tab, setTab] = useState<'product' | 'app'>('product');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { products, loading, uploadProductImages, createFromUrl } = useProducts();

  const handleUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    try {
      const id = await createFromUrl(url.trim());
      toast({ title: 'Product imported', description: id ? 'Ready to use.' : 'Saved with limited data.' });
      setUrl('');
    } catch (e: any) {
      toast({ title: 'Import failed', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = async (files: FileList) => {
    const arr = Array.from(files).slice(0, 6);
    if (arr.length === 0) return;
    setBusy(true);
    try {
      const name = arr[0].name.replace(/\.[^.]+$/, '').slice(0, 32) || 'My product';
      await uploadProductImages(arr, name);
      toast({ title: 'Product added' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e?.message ?? '', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-ms-surface border-ms-border p-0 overflow-hidden">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="p-5">
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

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground uppercase mb-2">
                {tab === 'product' ? 'Add your product' : 'Add your app'}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {tab === 'product'
                  ? 'Add a link or upload images to use your product across generations.'
                  : 'Turn your app link into a creative brief that captures interface, voice, flows, and product story.'}
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrl()}
                    placeholder={tab === 'product' ? 'www.yourproduct.com' : 'www.yourapp.com'}
                    disabled={busy}
                    className="w-full pl-9 pr-3 h-10 rounded-full bg-ms-surface-2 border border-ms-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/40"
                  />
                </div>
                <span className="text-xs text-muted-foreground">or</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="px-4 h-10 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Upload images'}
                </button>
              </div>
              {url && (
                <button
                  onClick={handleUrl}
                  disabled={busy}
                  className="mt-3 px-4 h-9 rounded-full bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  {busy ? 'Importing…' : 'Import from URL'}
                </button>
              )}
            </div>

            <div className="hidden md:flex justify-end">
              <div className="flex items-center -space-x-3">
                {products.slice(0, 3).map((p, i) => (
                  <div
                    key={p.id}
                    className="w-24 h-32 rounded-2xl overflow-hidden border-2 border-ms-surface shadow-xl bg-ms-surface-2"
                    style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                  >
                    {p.primary_thumb && <img src={p.primary_thumb} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[40vh] overflow-y-auto ms-scroll pr-1">
            {loading && <div className="col-span-full text-center text-muted-foreground text-sm py-6">Loading…</div>}
            {!loading && products.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground text-sm py-6">
                No products yet. Paste a URL or upload images above.
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
      </DialogContent>
    </Dialog>
  );
}
