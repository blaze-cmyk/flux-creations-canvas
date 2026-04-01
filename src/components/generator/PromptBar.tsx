import { useGeneratorStore, MODELS, QUALITIES, ASPECT_RATIOS } from '@/store/generatorStore';
import { ImagePlus, Minus, Plus, Sparkles, X, ChevronDown, Check, Search } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

export function PromptBar() {
  const {
    prompt, setPrompt, referenceImages, addReferenceImage, removeReferenceImage,
    model, setModel, quality, setQuality, aspectRatio, setAspectRatio,
    quantity, setQuantity, generate,
  } = useGeneratorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [aspectOpen, setAspectOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');

  const selectedModel = MODELS.find((m) => m.id === model);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 5 - referenceImages.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => addReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = () => {
    if (prompt.trim()) generate();
  };

  return (
    <div className="shrink-0 border-t border-border bg-popover">
      {/* Boost banner */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-muted/30 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-bold">NEW</span>
          <span className="text-destructive font-medium">🔥 42% OFF</span>
          <span className="text-muted-foreground">More generations with <span className="text-foreground font-medium">Boost Credits</span> Run up to 24 generations in parallel</span>
        </div>
        <button className="flex items-center gap-1 bg-muted text-foreground px-3 py-1 rounded-full text-xs hover:bg-muted/80 transition-colors">
          <Sparkles className="w-3 h-3" />
          Boost speed
        </button>
      </div>

      {/* Main prompt area */}
      <div className="px-4 py-3">
        {/* Reference images row */}
        {referenceImages.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {referenceImages.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
                <button
                  onClick={() => removeReferenceImage(i)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5 text-destructive-foreground" />
                </button>
              </div>
            ))}
            {referenceImages.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-foreground/30 hover:text-foreground/50 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Upload button when no refs */}
          {referenceImages.length === 0 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

          {/* Prompt textarea */}
          <div className="flex-1">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Describe what you want to generate..."
              rows={2}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none border-0 focus:outline-none"
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim()}
            className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Generate
            <span className="text-xs opacity-70">+ {quantity}</span>
          </button>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center gap-1 mt-2">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => { setModelOpen(!modelOpen); setQualityOpen(false); setAspectOpen(false); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">G</span>
              {selectedModel?.name || model}
              <ChevronDown className="w-3 h-3" />
            </button>

            {modelOpen && <ModelDropdown model={model} setModel={(m) => { setModel(m); setModelOpen(false); }} search={modelSearch} setSearch={setModelSearch} onClose={() => setModelOpen(false)} />}
          </div>

          {/* Aspect ratio */}
          <div className="relative">
            <button
              onClick={() => { setAspectOpen(!aspectOpen); setModelOpen(false); setQualityOpen(false); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="w-3 h-4 border border-muted-foreground/50 rounded-sm" />
              {aspectRatio}
            </button>
            {aspectOpen && <AspectDropdown aspectRatio={aspectRatio} setAspectRatio={(ar) => { setAspectRatio(ar); setAspectOpen(false); }} onClose={() => setAspectOpen(false)} />}
          </div>

          {/* Quality */}
          <div className="relative">
            <button
              onClick={() => { setQualityOpen(!qualityOpen); setModelOpen(false); setAspectOpen(false); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              ♡ {quality}
            </button>
            {qualityOpen && <QualityDropdown quality={quality} setQuality={(q) => { setQuality(q); setQualityOpen(false); }} onClose={() => setQualityOpen(false)} />}
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-0.5 text-xs text-muted-foreground ml-1">
            <button onClick={() => setQuantity(quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-5 text-center text-foreground">{quantity}</span>
            <button onClick={() => setQuantity(quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <div className="flex-1" />

          {/* Extra toggles */}
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            Extra free gens
            <div className="w-8 h-4 rounded-full bg-muted relative">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/50 absolute left-0.5 top-0.5" />
            </div>
          </label>

          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-muted transition-colors">
            ✏️ Draw
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelDropdown({ model, setModel, search, setSearch, onClose }: { model: string; setModel: (m: string) => void; search: string; setSearch: (s: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = MODELS.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()));
  const featured = filtered.filter((m) => m.featured);
  const all = filtered.filter((m) => !m.featured);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 w-72 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="p-2">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none flex-1" />
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto px-1 pb-1">
        {featured.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1">
              <ChevronDown className="w-3 h-3" /> Featured models
            </div>
            {featured.map((m) => (
              <ModelRow key={m.id} m={m} selected={model === m.id} onClick={() => setModel(m.id)} />
            ))}
          </>
        )}
        {all.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <ChevronDown className="w-3 h-3" /> All models
            </div>
            {all.map((m) => (
              <ModelRow key={m.id} m={m} selected={model === m.id} onClick={() => setModel(m.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function ModelRow({ m, selected, onClick }: { m: typeof MODELS[0]; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors ${selected ? 'bg-muted' : ''}`}>
      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-primary shrink-0">G</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-foreground">{m.name}</span>
          {m.badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.badge === 'NEW' ? 'bg-[hsl(var(--badge-bg))] text-[hsl(var(--badge-text))]' : m.badge === 'UNLIMITED' ? 'bg-[hsl(var(--badge-bg))] text-[hsl(var(--badge-text))]' : 'bg-muted text-muted-foreground'}`}>
              {m.badge}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground truncate block">{m.desc}</span>
      </div>
      {selected && <Check className="w-4 h-4 text-primary shrink-0" />}
    </button>
  );
}

function QualityDropdown({ quality, setQuality, onClose }: { quality: string; setQuality: (q: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full right-0 mb-2 w-44 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="p-1.5 text-xs text-muted-foreground px-3 pt-2">Select quality</div>
      {QUALITIES.map((q) => (
        <button key={q} onClick={() => setQuality(q)} className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors ${quality === q ? 'text-foreground' : 'text-muted-foreground'}`}>
          {q}
          {quality === q && <Check className="w-4 h-4 text-primary" />}
        </button>
      ))}
    </div>
  );
}

function AspectDropdown({ aspectRatio, setAspectRatio, onClose }: { aspectRatio: string; setAspectRatio: (ar: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-2 w-48 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="p-1.5 text-xs text-muted-foreground px-3 pt-2">Aspect ratio</div>
      <div className="max-h-72 overflow-y-auto">
        {ASPECT_RATIOS.map((ar) => (
          <button key={ar} onClick={() => setAspectRatio(ar)} className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted transition-colors ${aspectRatio === ar ? 'text-foreground' : 'text-muted-foreground'}`}>
            <AspectIcon ratio={ar} />
            {ar}
            {aspectRatio === ar && <Check className="w-4 h-4 text-primary ml-auto" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function AspectIcon({ ratio }: { ratio: string }) {
  if (ratio === 'Auto') return <span className="w-4 h-4 border border-current rounded-sm" />;
  const [w, h] = ratio.split(':').map(Number);
  const maxSize = 16;
  const scale = maxSize / Math.max(w, h);
  return <span className="w-4 h-4 flex items-center justify-center"><span className="border border-current rounded-sm" style={{ width: w * scale, height: h * scale }} /></span>;
}
