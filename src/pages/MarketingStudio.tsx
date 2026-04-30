import { useRef } from 'react';
import { MarketingStudioLayout } from '@/components/marketingstudio/MarketingStudioLayout';
import { PromptBar } from '@/components/marketingstudio/PromptBar';

const FORMATS = [
  { id: 'f1', label: 'Hyper Motion', src: '/formats/hyper-motion-1.mp4' },
  { id: 'f2', label: 'Unboxing', src: '/formats/unboxing-1.mp4' },
  { id: 'f3', label: 'Hyper Motion', src: '/formats/hyper-motion-2.mp4' },
  { id: 'f4', label: 'UGC', src: '/formats/ugc-1.mp4' },
  { id: 'f5', label: 'UGC', src: '/formats/ugc-2.mp4' },
  { id: 'f6', label: 'UGC Virtual Try On', src: '/formats/ugc-tryon-1.mp4' },
  { id: 'f7', label: 'Unboxing', src: '/formats/unboxing-2.mp4' },
  { id: 'f8', label: 'UGC Virtual Try On', src: '/formats/ugc-tryon-2.mp4' },
  { id: 'f9', label: 'Tutorial', src: '/formats/tutorial-1.mp4' },
];

function BoltIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M9.33281 1.5704C9.33281 0.752657 8.27767 0.424122 7.81347 1.0973L2.11491 9.3602C1.73366 9.913 2.12939 10.6666 2.80092 10.6666H6.66612V14.4295C6.66612 15.2472 7.72121 15.5758 8.18547 14.9026L13.884 6.63972C14.2653 6.0869 13.8695 5.33328 13.198 5.33328H9.33281V1.5704Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FormatCard({ label, src }: { label: string; src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  return (
    <button
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => {
        if (ref.current) {
          ref.current.pause();
          ref.current.currentTime = 0;
        }
      }}
      className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-ms-surface-2 ring-1 ring-white/5 hover:ring-white/20 transition-all"
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
      <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[13px] font-medium text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)] whitespace-nowrap">
        {label}
      </div>
    </button>
  );
}

export default function MarketingStudio() {
  return (
    <MarketingStudioLayout>
      {/* Hero glow */}
      <div className="relative">
        <div className="absolute -top-14 inset-x-0 h-[640px] ms-hero-glow pointer-events-none" />

        <section className="relative px-4 md:px-8 pt-10 md:pt-16 pb-8 max-w-6xl mx-auto">
          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-[0.22em] text-muted-foreground uppercase mb-4">
              Marketing Studio
            </div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl tracking-tight text-foreground uppercase leading-[1.05] font-semibold"
              style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif' }}
            >
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
          <BoltIcon className="size-4 text-[#ff005b]" />
          <h2 className="text-base font-semibold text-foreground">Generate across formats</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {FORMATS.map((f) => (
            <FormatCard key={f.id} label={f.label} src={f.src} />
          ))}
        </div>
      </section>
    </MarketingStudioLayout>
  );
}
