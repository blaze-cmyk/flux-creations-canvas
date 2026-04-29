import { useState } from 'react';
import { Plus, Sparkles, Package, Smartphone, ChevronDown, Smartphone as PhoneIcon, Gem, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AssetsModal } from './AssetsModal';
import { AddProductModal } from './AddProductModal';
import { AvatarModal } from './AvatarModal';
import {
  MSAspect,
  MSDuration,
  MSGeneration,
  MSMode,
  MSResolution,
  MSSurface,
  useMarketingStudioStore,
} from '@/store/marketingStudioStore';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

const MODES: MSMode[] = ['UGC', 'Hyper Motion', 'Unboxing', 'TV Spot', 'UGC Virtual Try On'];
const ASPECTS: MSAspect[] = ['9:16', '1:1', '16:9'];
const RESOLUTIONS: MSResolution[] = ['480p', '720p', '1080p'];
const DURATIONS: MSDuration[] = ['4s', '8s', '12s'];

interface Props {
  projectId?: string;
  projectName?: string;
}

export function PromptBar({ projectId, projectName }: Props) {
  const [surface, setSurface] = useState<MSSurface>('Product');
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<MSMode>('UGC');
  const [aspect, setAspect] = useState<MSAspect>('9:16');
  const [res, setRes] = useState<MSResolution>('720p');
  const [duration, setDuration] = useState<MSDuration>('8s');
  const [productThumb, setProductThumb] = useState<string | null>(null);
  const [avatarThumb, setAvatarThumb] = useState<string | null>(null);

  const [assetsOpen, setAssetsOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const { createProject, addGeneration } = useMarketingStudioStore();
  const navigate = useNavigate();

  const cost = surface === 'Product' ? 4840 : 16286;

  const handleGenerate = () => {
    let pid = projectId;
    let pslug: string | undefined;
    if (!pid) {
      const p = createProject(prompt.slice(0, 28) || 'New project');
      pid = p.id;
      pslug = p.slug;
    }
    const gen: MSGeneration = {
      id: crypto.randomUUID(),
      thumbUrl: productThumb || `https://picsum.photos/seed/gen-${Date.now()}/400/720`,
      prompt: prompt || 'Untitled ad',
      mode,
      surface,
      aspect,
      resolution: res,
      duration,
      createdAt: Date.now(),
    };
    addGeneration(pid, gen);
    toast({ title: 'Generation started', description: 'Your ad is being created (mock).' });
    if (pslug) navigate(`/marketingstudio/${pslug}`);
    setPrompt('');
  };

  return (
    <div className="relative w-full max-w-[1100px] mx-auto">
      <div className="relative flex items-stretch gap-2.5">
        {/* Left vertical pill: Product / App — liquid glass, floats left */}
        <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(100%+10px)] flex-col gap-1.5 p-1.5 rounded-2xl ms-glass z-10">
          {(['Product', 'App'] as MSSurface[]).map((s) => {
            const active = s === surface;
            const Icon = s === 'Product' ? Package : Smartphone;
            return (
              <button
                key={s}
                onClick={() => setSurface(s)}
                className={`flex flex-col items-center justify-center w-[56px] h-[56px] rounded-xl text-[10px] font-medium transition-all ${
                  active
                    ? 'ms-glass-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Icon className="w-[18px] h-[18px] mb-1" strokeWidth={1.5} />
                {s}
              </button>
            );
          })}
        </div>

        {/* Main bar — liquid glass */}
        <div className="flex-1 rounded-[22px] ms-glass p-2.5 flex flex-col gap-2 min-w-0">
          {/* Top row: + + textarea + Product/Avatar/Generate */}
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => setAssetsOpen(true)}
              className="grid place-items-center w-9 h-9 self-start mt-1 rounded-lg ms-chip-glass text-foreground shrink-0"
              aria-label="Add reference"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="Describe what happens in the ad..."
              className="flex-1 bg-transparent border-0 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none min-w-0 self-center px-1"
            />

            {/* Right: Product, Avatar, Generate (md+) */}
            <div className="hidden md:flex items-stretch gap-2">
              <button
                onClick={() => setProductOpen(true)}
                className="ms-glass-2 flex flex-col items-center justify-center w-[88px] h-[88px] rounded-2xl text-[10px] font-semibold text-foreground/90 overflow-hidden relative tracking-wider transition-all"
              >
                {productThumb ? (
                  <img src={productThumb} alt="product" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                ) : null}
                <div className="grid place-items-center w-7 h-7 rounded-full bg-white/10 mb-1.5 relative">
                  <Plus className="w-4 h-4 text-foreground/90" strokeWidth={1.5} />
                </div>
                <span className="relative">PRODUCT</span>
              </button>
              <button
                onClick={() => setAvatarOpen(true)}
                className="ms-glass-2 flex flex-col items-center justify-center w-[88px] h-[88px] rounded-2xl text-[10px] font-semibold text-foreground/90 overflow-hidden relative tracking-wider transition-all"
              >
                {avatarThumb ? (
                  <img src={avatarThumb} alt="avatar" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                ) : null}
                <div className="grid place-items-center w-7 h-7 rounded-full bg-white/10 mb-1.5 relative">
                  <Plus className="w-4 h-4 text-foreground/90" strokeWidth={1.5} />
                </div>
                <span className="relative">AVATAR</span>
              </button>
              <button
                onClick={handleGenerate}
                className="ms-cta flex items-center justify-center gap-1.5 w-[170px] h-[88px] rounded-2xl text-white text-[12px] font-extrabold tracking-wider"
              >
                GENERATE
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[12px] font-bold opacity-95">{(cost / 100).toFixed(2)}</span>
              </button>
            </div>
          </div>

          {/* Bottom row: chips */}
          <div className="flex items-center gap-2 flex-wrap pl-1">
            <Chip
              icon={<ModeIcon />}
              value={mode}
              options={MODES}
              onChange={setMode as (v: string) => void}
              showChevron
            />
            {surface === 'App' && (
              <Chip icon={<PhoneIcon className="w-3.5 h-3.5" />} value="Mobile" options={['Mobile', 'Desktop']} onChange={() => {}} showChevron />
            )}
            <Chip icon={<AspectIcon />} value={aspect} options={ASPECTS} onChange={(v) => setAspect(v as MSAspect)} />
            <Chip icon={<Gem className="w-3.5 h-3.5" />} value={res} options={RESOLUTIONS} onChange={(v) => setRes(v as MSResolution)} />
            <Chip icon={<Clock className="w-3.5 h-3.5" />} value={duration} options={DURATIONS} onChange={(v) => setDuration(v as MSDuration)} />
          </div>

          {/* Mobile generate row */}
          <div className="flex md:hidden gap-2">
            <button
              onClick={() => setProductOpen(true)}
              className="ms-glass-2 flex-1 h-12 rounded-xl text-[11px] font-semibold text-foreground"
            >
              + PRODUCT
            </button>
            <button
              onClick={() => setAvatarOpen(true)}
              className="ms-glass-2 flex-1 h-12 rounded-xl text-[11px] font-semibold text-foreground"
            >
              + AVATAR
            </button>
            <button
              onClick={handleGenerate}
              className="ms-cta flex-1 h-12 rounded-xl text-white text-[11px] font-extrabold"
            >
              GENERATE ✦ {(cost / 100).toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      <AssetsModal open={assetsOpen} onOpenChange={setAssetsOpen} onSelect={(url) => setProductThumb(url)} />
      <AddProductModal open={productOpen} onOpenChange={setProductOpen} onSelect={(it) => setProductThumb(it.thumb)} />
      <AvatarModal open={avatarOpen} onOpenChange={setAvatarOpen} onSelect={(a) => setAvatarThumb(a.thumb)} />
    </div>
  );
}

function Chip({
  icon,
  value,
  options,
  onChange,
  showChevron = true,
}: {
  icon: React.ReactNode;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  showChevron?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ms-chip-glass flex items-center gap-1.5 px-3.5 h-9 rounded-full text-xs text-foreground transition-all">
          <span className="text-muted-foreground">{icon}</span>
          {value}
          <ChevronDown className="w-3 h-3 text-muted-foreground/70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-ms-surface-2 border-ms-border">
        {options.map((o) => (
          <DropdownMenuItem key={o} onClick={() => onChange(o)} className="text-sm">
            {o}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
      <path d="M12 2 L14 8 L20 9 L15.5 13 L17 19 L12 16 L7 19 L8.5 13 L4 9 L10 8 Z" />
    </svg>
  );
}
function AspectIcon() {
  return <div className="w-3 h-3.5 rounded-[3px] border border-current" />;
}
