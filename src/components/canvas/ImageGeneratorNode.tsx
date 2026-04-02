import { Handle, Position, useNodeId } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { MODELS, ASPECT_RATIOS } from '@/store/generatorStore';
import { Image, Play, Minus, Plus, Settings, Type, ImageIcon, Search, ChevronDown, X } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NodeToolbar } from './NodeToolbar';

const NODE_MODELS = MODELS.map(m => ({ id: m.id, name: m.name }));

export function ImageGeneratorNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const { updateNodeData, getConnectedInputs } = useCanvasStore();
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [quantity, setQuantity] = useState(1);
  const [modelOpen, setModelOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<HTMLDivElement>(null);

  const selectedModel = data.model || 'gemini-3.1-flash-image';
  const selectedAR = data.aspectRatio || '1:1';
  const modelName = NODE_MODELS.find(m => m.id === selectedModel)?.name || 'Auto';

  const filteredModels = NODE_MODELS.filter(m =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (arRef.current && !arRef.current.contains(e.target as Node)) setArOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    updateNodeData(id, { status: 'running' });

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-image', {
        body: {
          prompt,
          referenceImages: [],
          model: selectedModel,
          quality: '2K',
          aspectRatio: selectedAR,
        },
      });

      if (error || result?.error) {
        updateNodeData(id, { status: 'error' });
      } else {
        const imageUrl = result?.imageBase64 || result?.imageUrl;
        updateNodeData(id, { status: 'complete', imageUrl });
      }
    } catch {
      updateNodeData(id, { status: 'error' });
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating, selectedModel, selectedAR, id, updateNodeData]);

  return (
    <div className="space-node w-[520px] rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative">
      {selected && <NodeToolbar nodeId={id} nodeType="image-generator" />}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
        <Image className="w-4 h-4" />
        {data.label}
      </div>

      {/* Main content area */}
      <div className="relative px-3 pb-3">
        <div className="relative rounded-xl overflow-hidden bg-[hsl(var(--background))]" style={{ minHeight: 340 }}>
          {data.imageUrl ? (
            <img src={data.imageUrl} alt="" className="w-full h-[340px] object-contain bg-black/20" />
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                updateNodeData(id, { prompt: e.target.value });
              }}
              placeholder="Describe the image you want to generate..."
              className="w-full h-[340px] bg-transparent p-4 pt-6 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none border-0 focus:outline-none"
            />
          )}

        </div>

        {/* Left side connector icons — anchored to card edge */}
        <div className="absolute left-0 bottom-16 -translate-x-1/2 flex flex-col gap-3 z-10">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center cursor-pointer hover:bg-[hsl(var(--muted)/0.8)] transition-colors" title="Text input">
            <Type className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center cursor-pointer hover:bg-[hsl(var(--muted)/0.8)] transition-colors" title="Reference image">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Right side output icon — anchored to card edge */}
        <div className="absolute right-0 top-8 translate-x-1/2 z-10">
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center cursor-pointer hover:bg-[hsl(var(--muted)/0.8)] transition-colors" title="Generated image output">
            <ImageIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="flex items-center gap-2 mt-3 px-1">
          {/* Quantity selector */}
          <div className="flex items-center gap-0.5 bg-[hsl(var(--muted))] rounded-full px-2 py-1.5">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-xs font-medium text-foreground min-w-[24px] text-center">x{quantity}</span>
            <button onClick={() => setQuantity(Math.min(4, quantity + 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Model selector */}
          <div ref={modelRef} className="relative">
            <button
              onClick={() => { setModelOpen(!modelOpen); setArOpen(false); }}
              className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors"
            >
              {modelName.length > 14 ? modelName.slice(0, 14) + '…' : modelName}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {modelOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-[240px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2">
                  <div className="flex items-center gap-2 bg-[hsl(var(--muted))] rounded-lg px-2 py-1.5">
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <input
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      placeholder="Search"
                      className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none w-full"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[260px] overflow-y-auto px-1 pb-1">
                  {filteredModels.map(m => (
                    <button
                      key={m.id}
                      onClick={() => {
                        updateNodeData(id, { model: m.id });
                        setModelOpen(false);
                        setModelSearch('');
                      }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${m.id === selectedModel ? 'bg-[hsl(var(--accent))] text-accent-foreground' : 'text-foreground hover:bg-[hsl(var(--muted))]'}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[hsl(var(--border)/0.2)] px-3 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>All models</span>
                  <span>↑↓ Navigate</span>
                </div>
              </div>
            )}
          </div>

          {/* Aspect ratio selector */}
          <div ref={arRef} className="relative">
            <button
              onClick={() => { setArOpen(!arOpen); setModelOpen(false); }}
              className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors"
            >
              <span className="w-3 h-3 border border-muted-foreground/50 rounded-sm" />
              {selectedAR}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {arOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-[120px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden p-1">
                {ASPECT_RATIOS.map(ar => (
                  <button
                    key={ar}
                    onClick={() => {
                      updateNodeData(id, { aspectRatio: ar });
                      setArOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${ar === selectedAR ? 'bg-[hsl(var(--accent))] text-accent-foreground' : 'text-foreground hover:bg-[hsl(var(--muted))]'}`}
                  >
                    {ar}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <button className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-9 h-9 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>

        {/* Generating overlay */}
        {generating && (
          <div className="absolute inset-3 rounded-xl bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Generating…
            </div>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="img-in" className="!w-3 !h-3 !bg-muted-foreground/50 !border-0" />
      <Handle type="source" position={Position.Right} id="img-out" className="!w-3 !h-3 !bg-muted-foreground/50 !border-0" />
    </div>
  );
}
