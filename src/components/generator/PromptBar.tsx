import { useGeneratorStore, MODELS, QUALITIES, ASPECT_RATIOS } from '@/store/generatorStore';
import { ImagePlus, Minus, Plus, X, ChevronDown, Check, Search, AtSign, PenLine } from 'lucide-react';
import { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export function PromptBar() {
  const {
    prompt, setPrompt, referenceImages, addReferenceImage, removeReferenceImage,
    model, setModel, quality, setQuality, aspectRatio, setAspectRatio,
    quantity, setQuantity, generate,
  } = useGeneratorStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [aspectOpen, setAspectOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [freeGens, setFreeGens] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const selectedModel = MODELS.find((m) => m.id === model);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [prompt]);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    arr.slice(0, 5 - referenceImages.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => addReferenceImage(reader.result as string);
      reader.readAsDataURL(file);
    });
  }, [referenceImages.length, addReferenceImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  // Drag & drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) setDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (prompt.trim()) generate();
  };

  return (
    <div className="shrink-0 flex justify-center px-4 pb-4 pt-2">
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full max-w-3xl bg-popover border border-border rounded-2xl shadow-2xl transition-all ${dragging ? 'ring-2 ring-primary border-primary' : ''}`}
      >
        {/* Drag overlay */}
        {dragging && (
          <div className="absolute inset-0 rounded-2xl bg-primary/10 flex items-center justify-center z-10 pointer-events-none">
            <span className="text-sm font-medium text-primary">Drop images here</span>
          </div>
        )}

        <div className="relative px-4 pt-3 pb-2">
          {/* Reference images row */}
          {referenceImages.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              {referenceImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="" className="w-10 h-10 rounded-lg object-cover border border-border cursor-pointer" onClick={() => setPreviewImg(img)} />
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

          {/* Prompt row */}
          <div className="flex items-end gap-3">
            {referenceImages.length === 0 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-9 h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Describe what you want to generate..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 resize-none border-0 focus:outline-none py-2 leading-5"
            />

            {/* Generate button — lime/chartreuse like Higgsfield */}
            <button
              onClick={handleSubmit}
              disabled={!prompt.trim()}
              className="shrink-0 flex items-center gap-1.5 font-semibold text-sm px-5 py-2.5 rounded-xl transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}
            >
              Generate
              <span className="text-xs opacity-70">✦ {quantity}</span>
            </button>
          </div>

          {/* Bottom controls bar */}
          <div className="flex items-center gap-1 mt-1.5 border-t border-border/50 pt-2">
            {/* Model */}
            <div className="relative">
              <button
                onClick={() => { setModelOpen(!modelOpen); setQualityOpen(false); setAspectOpen(false); }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-full hover:bg-muted transition-colors border border-border/50"
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-full hover:bg-muted transition-colors border border-border/50"
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
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-full hover:bg-muted transition-colors border border-border/50"
              >
                ♡ {quality}
              </button>
              {qualityOpen && <QualityDropdown quality={quality} setQuality={(q) => { setQuality(q); setQualityOpen(false); }} onClose={() => setQualityOpen(false)} />}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-0.5 text-xs text-muted-foreground border border-border/50 rounded-full px-1.5 py-0.5">
              <button onClick={() => setQuantity(quantity - 1)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center text-foreground text-xs">{quantity}/4</span>
              <button onClick={() => setQuantity(quantity + 1)} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* @ mention */}
            <button className="flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors">
              <AtSign className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1" />

            {/* Extra free gens toggle */}
            <button
              onClick={() => setFreeGens(!freeGens)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground px-2.5 py-1.5 rounded-full hover:bg-muted transition-colors border border-border/50"
            >
              Extra free gens
              <div className={`w-8 h-4 rounded-full relative transition-colors ${freeGens ? 'bg-primary' : 'bg-muted'}`}>
                <div className={`w-3 h-3 rounded-full absolute top-0.5 transition-all ${freeGens ? 'right-0.5 bg-primary-foreground' : 'left-0.5 bg-muted-foreground/50'}`} />
              </div>
            </button>

            {/* Draw */}
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-full hover:bg-muted transition-colors border border-border/50">
              <PenLine className="w-3 h-3" />
              Draw
            </button>
          </div>
        </div>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewImg} onOpenChange={() => setPreviewImg(null)}>
        <DialogContent className="max-w-2xl p-2 bg-popover border-border">
          {previewImg && <img src={previewImg} alt="Preview" className="w-full h-auto rounded-lg object-contain max-h-[80vh]" />}
        </DialogContent>
      </Dialog>
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

function ModelRow({ m, selected, onClick }: { m: { id: string; name: string; desc: string; featured: boolean; badge?: string }; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-muted transition-colors ${selected ? 'bg-muted' : ''}`}>
      <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-primary shrink-0">G</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-foreground">{m.name}</span>
          {m.badge && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
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
