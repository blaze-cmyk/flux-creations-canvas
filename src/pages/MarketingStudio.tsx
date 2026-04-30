import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const expandTimer = useRef<number | null>(null);

  useEffect(() => {
    if (hovered) {
      ref.current?.play().catch(() => {});
      expandTimer.current = window.setTimeout(() => setExpanded(true), 350);
    } else {
      if (expandTimer.current) window.clearTimeout(expandTimer.current);
      setExpanded(false);
      if (ref.current) {
        ref.current.pause();
        ref.current.currentTime = 0;
      }
      setMuted(true);
    }
    return () => {
      if (expandTimer.current) window.clearTimeout(expandTimer.current);
    };
  }, [hovered]);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative aspect-[2/3]"
    >
      <div
        className={`absolute inset-0 rounded-2xl overflow-hidden bg-ms-surface-2 ring-1 ring-white/5 transition-all duration-500 ease-out will-change-transform ${
          expanded
            ? 'scale-[1.08] z-30 ring-white/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]'
            : 'scale-100 z-0 hover:ring-white/10'
        }`}
      >
        <video
          ref={ref}
          src={src}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />

        {/* Top gradient + label */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent" />
        <div className="absolute top-3 left-0 right-0 px-3 flex items-center justify-center">
          <span className="text-[13px] font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] whitespace-nowrap">
            {label}
          </span>
        </div>

        {/* Mute toggle — appears on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          className={`absolute top-2.5 right-2.5 grid place-items-center w-8 h-8 rounded-full bg-black/55 backdrop-blur-md text-white transition-all duration-300 ${
            hovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none'
          }`}
          aria-label={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Recreate button — slides up from bottom on hover */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 overflow-hidden">
          <button
            className={`w-full h-11 rounded-full bg-white text-black text-sm font-semibold shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out ${
              hovered ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0'
            }`}
          >
            Recreate
          </button>
        </div>
      </div>
    </div>
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
