import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useState } from 'react';
import { Link as LinkIcon, MoreHorizontal, Package, Smartphone } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  thumb: string;
}

const MOCK_PRODUCTS: Item[] = [
  { id: 'p1', name: 'Proud Sister of my Dumb…', thumb: 'https://picsum.photos/seed/prod-1/240/240' },
  { id: 'p2', name: 'Proud Mother of a Few D…', thumb: 'https://picsum.photos/seed/prod-2/240/240' },
  { id: 'p3', name: 'Proud Sister of my Dumb…', thumb: 'https://picsum.photos/seed/prod-3/240/240' },
  { id: 'p4', name: 'Mom Didn\'t Raise A Bitch…', thumb: 'https://picsum.photos/seed/prod-4/240/240' },
];

const MOCK_APPS: Item[] = [
  { id: 'a1', name: 'Hotties Only', thumb: 'https://picsum.photos/seed/app-1/240/240' },
];

export function AddProductModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect?: (item: Item, kind: 'product' | 'app') => void;
}) {
  const [tab, setTab] = useState<'product' | 'app'>('product');
  const items = tab === 'product' ? MOCK_PRODUCTS : MOCK_APPS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-ms-surface border-ms-border p-0 overflow-hidden">
        <div className="p-5">
          {/* Tab switch pill */}
          <div className="flex justify-center mb-5">
            <div className="inline-flex p-1 rounded-full bg-ms-surface-2 border border-ms-border">
              {(['product', 'app'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-4 h-8 rounded-full text-xs font-medium transition-colors ${
                    tab === t
                      ? 'bg-ms-border text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
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
                    placeholder={tab === 'product' ? 'www.yourproduct.com' : 'www.yourapp.com'}
                    className="w-full pl-9 pr-3 h-10 rounded-full bg-ms-surface-2 border border-ms-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-muted-foreground/40"
                  />
                </div>
                <span className="text-xs text-muted-foreground">or</span>
                <button className="px-4 h-10 rounded-full bg-foreground text-background text-sm font-semibold hover:opacity-90">
                  Create manually
                </button>
              </div>
            </div>

            <div className="hidden md:flex justify-end">
              <div className="flex items-center -space-x-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-24 h-32 rounded-2xl overflow-hidden border-2 border-ms-surface shadow-xl"
                    style={{ transform: `rotate(${(i - 2) * 8}deg)` }}
                  >
                    <img src={`https://picsum.photos/seed/hero-${i}/200/280`} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-h-[40vh] overflow-y-auto ms-scroll pr-1">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  onSelect?.(it, tab);
                  onOpenChange(false);
                }}
                className="group text-left"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-ms-surface-2 ring-1 ring-ms-border group-hover:ring-foreground/40 transition-all">
                  <img src={it.thumb} alt={it.name} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 grid place-items-center w-7 h-7 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2 text-xs text-foreground truncate">{it.name}</div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
