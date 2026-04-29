import { MarketingStudioLayout } from '@/components/marketingstudio/MarketingStudioLayout';
import { PromptBar } from '@/components/marketingstudio/PromptBar';
import { Sparkles } from 'lucide-react';

const FORMATS = [
  { id: 'f1', label: 'Hyper Motion', img: 'https://picsum.photos/seed/fmt-hyper/400/700' },
  { id: 'f2', label: 'Unboxing', img: 'https://picsum.photos/seed/fmt-unbox/400/700' },
  { id: 'f3', label: 'Hyper Motion', img: 'https://picsum.photos/seed/fmt-hyper2/400/700' },
  { id: 'f4', label: 'UGC', img: 'https://picsum.photos/seed/fmt-ugc1/400/700' },
  { id: 'f5', label: 'UGC', img: 'https://picsum.photos/seed/fmt-ugc2/400/700' },
  { id: 'f6', label: 'UGC Virtual Try On', img: 'https://picsum.photos/seed/fmt-tryon/400/700' },
  { id: 'f7', label: 'UGC', img: 'https://picsum.photos/seed/fmt-ugc3/400/700' },
  { id: 'f8', label: 'UGC', img: 'https://picsum.photos/seed/fmt-ugc4/400/700' },
  { id: 'f9', label: 'TV Spot', img: 'https://picsum.photos/seed/fmt-tv/400/700' },
  { id: 'f10', label: 'Unboxing', img: 'https://picsum.photos/seed/fmt-unbox2/400/700' },
];

export default function MarketingStudio() {
  return (
    <MarketingStudioLayout>
      {/* Hero glow */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0 h-[520px] ms-hero-glow pointer-events-none" />

        <section className="relative px-4 md:px-8 pt-10 md:pt-16 pb-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase mb-4">
              Marketing Studio
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground uppercase leading-[1.05]">
              Turn Any Product
              <br />
              Into a Video Ad
            </h1>
          </div>

          <div className="mt-10">
            <PromptBar />
          </div>
        </section>
      </div>

      {/* Formats grid */}
      <section className="px-4 md:px-8 pb-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6 mt-6">
          <Sparkles className="w-4 h-4 text-ms-cta" />
          <h2 className="text-base font-semibold text-foreground">Generate across formats</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {FORMATS.map((f) => (
            <button key={f.id} className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-ms-surface-2 ring-1 ring-ms-border hover:ring-foreground/30 transition-all">
              <img src={f.img} alt={f.label} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-[11px] font-medium text-white">
                {f.label}
              </div>
            </button>
          ))}
        </div>
      </section>
    </MarketingStudioLayout>
  );
}
