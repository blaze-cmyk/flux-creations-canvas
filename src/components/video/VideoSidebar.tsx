import { useVideoStore, VIDEO_MODELS, VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS } from '@/store/videoStore';
import { ImagePlus, ChevronRight, Check, Search, Play, Video, Film, Wand2, Volume2, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';
import { MotionControlPanel } from './MotionControlPanel';
import { EditVideoPanel } from './EditVideoPanel';
import { CreateVideoPanel } from './CreateVideoPanel';
import { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export function VideoSidebar() {
  const {
    prompt, setPrompt, referenceImages, addReferenceImage, setReferenceImageAt, removeReferenceImage,
    model, setModel, mode, setMode, aspectRatio, setAspectRatio,
    duration, setDuration, generate,
  } = useVideoStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [enhance, setEnhance] = useState(true);
  const [sound, setSound] = useState(true);

  const selectedModel = VIDEO_MODELS.find(m => m.id === model);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    arr.slice(0, 3 - referenceImages.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => addReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length, addReferenceImage]);

  const tabs = [
    { id: 'text-to-video' as const, label: 'Create Video' },
    { id: 'image-to-video' as const, label: 'Edit Video' },
    { id: 'motion-control' as const, label: 'Motion Control' },
  ];

  return (
    <div className="w-[280px] shrink-0 border-r border-border bg-popover flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 pt-3 pb-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`text-xs px-2 py-1.5 transition-colors whitespace-nowrap ${
              mode === tab.id
                ? 'text-foreground font-medium border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* === CREATE VIDEO === */}
        {mode === 'text-to-video' && (
          <CreateVideoPanel
            prompt={prompt}
            setPrompt={setPrompt}
            referenceImages={referenceImages}
            addReferenceImage={addReferenceImage}
            removeReferenceImage={removeReferenceImage}
            fileInputRef={fileInputRef}
            selectedModel={selectedModel}
            enhance={enhance}
            setEnhance={setEnhance}
            sound={sound}
            setSound={setSound}
          />
        )}

        {/* === EDIT VIDEO === */}
        {mode === 'image-to-video' && (
          <EditVideoPanel
            prompt={prompt}
            setPrompt={setPrompt}
            referenceImages={referenceImages}
            addReferenceImage={addReferenceImage}
            removeReferenceImage={removeReferenceImage}
            fileInputRef={fileInputRef}
          />
        )}

        {/* === MOTION CONTROL === */}
        {mode === 'motion-control' && (
          <MotionControlPanel
            referenceImages={referenceImages}
            addReferenceImage={addReferenceImage}
            setReferenceImageAt={setReferenceImageAt}
            removeReferenceImage={removeReferenceImage}
            fileInputRef={fileInputRef}
          />
        )}

        {/* Model selector */}
        <div className="relative">
          <button
            ref={modelBtnRef}
            onClick={() => setModelOpen(!modelOpen)}
            className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5 hover:bg-muted transition-colors"
          >
            <div className="text-left">
              <span className="text-[10px] text-muted-foreground block">Model</span>
              <span className="text-sm text-foreground">{selectedModel?.name || model}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          {modelOpen && (
            <SidebarModelDropdown
              model={model}
              setModel={m => { setModel(m); setModelOpen(false); }}
              search={modelSearch}
              setSearch={setModelSearch}
              onClose={() => setModelOpen(false)}
              mode={mode}
              anchorRef={modelBtnRef}
            />
          )}
        </div>

        {/* Duration / Aspect / Quality row */}
        <div className="flex gap-2">
          <div className="flex-1 bg-card border border-border rounded-xl px-3 py-2">
            <span className="text-[10px] text-muted-foreground block mb-1">Duration</span>
            <div className="flex gap-1">
              {VIDEO_DURATIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 text-xs py-1 rounded-lg transition-colors ${duration === d ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl px-3 py-2">
            <span className="text-[10px] text-muted-foreground block mb-1">Ratio</span>
            <div className="flex gap-1">
              {VIDEO_ASPECT_RATIOS.map(ar => (
                <button
                  key={ar}
                  onClick={() => setAspectRatio(ar)}
                  className={`flex-1 text-xs py-1 rounded-lg transition-colors ${aspectRatio === ar ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Generate button */}
      <div className="px-3 pb-3 pt-1">
        <button
          onClick={generate}
          className="w-full flex items-center justify-center gap-2 font-semibold text-sm py-3 rounded-xl transition-opacity"
          style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
        >
          <Play className="w-4 h-4" />
          Generate
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );
}


function SidebarModelDropdown({ model, setModel, search, setSearch, onClose, mode, anchorRef }: {
  model: string; setModel: (m: string) => void; search: string; setSearch: (s: string) => void; onClose: () => void; mode: string; anchorRef: React.RefObject<HTMLButtonElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = VIDEO_MODELS
    .filter(m => (m.modes as readonly string[]).includes(mode))
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        ref={ref}
        className="fixed w-[260px] max-h-[420px] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-[70] flex flex-col"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="p-2 border-b border-border">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none flex-1" autoFocus />
          </div>
        </div>
        <div className="px-3 py-1.5 border-b border-border">
          <span className="text-[10px] text-muted-foreground">All models</span>
        </div>
        <div className="flex-1 overflow-y-auto px-1 py-1" style={{ scrollbarWidth: 'none' }}>
          {filtered.map(m => (
            <button key={m.id} onClick={() => setModel(m.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-muted transition-colors ${model === m.id ? 'bg-muted' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-foreground">{m.name}</span>
                  {m.badge && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-primary/20 text-primary">{m.badge}</span>}
                </div>
                <span className="text-[10px] text-muted-foreground truncate block">{m.desc}</span>
              </div>
              {model === m.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}
