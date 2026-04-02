import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { VIDEO_MODELS, VIDEO_ASPECT_RATIOS, VIDEO_DURATIONS } from '@/store/videoStore';
import { Video, Play, Minus, Plus, Settings, ChevronDown, Search } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NodeToolbar } from './NodeToolbar';
import { logSpacesEvent } from '@/lib/spacesHistory';
import { NodeConnectors } from './NodeConnectors';
import { NODE_INPUTS, NODE_OUTPUTS } from '@/lib/connectionRules';

const NODE_MODELS = VIDEO_MODELS.map(m => ({ id: m.id, name: m.name }));

export function VideoGeneratorNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const { updateNodeData, getConnectedInputs } = useCanvasStore();
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [quantity, setQuantity] = useState(1);
  const [modelOpen, setModelOpen] = useState(false);
  const [arOpen, setArOpen] = useState(false);
  const [durOpen, setDurOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const [soundEffects, setSoundEffects] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const arRef = useRef<HTMLDivElement>(null);
  const durRef = useRef<HTMLDivElement>(null);

  const selectedModel = data.model || 'kling-v3-pro';
  const selectedAR = data.aspectRatio || '16:9';
  const selectedDuration = '5';
  const modelName = NODE_MODELS.find(m => m.id === selectedModel)?.name || 'Auto';

  const filteredModels = NODE_MODELS.filter(m =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (arRef.current && !arRef.current.contains(e.target as Node)) setArOpen(false);
      if (durRef.current && !durRef.current.contains(e.target as Node)) setDurOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    updateNodeData(id, { status: 'running' });

    const inputs = getConnectedInputs(id);
    const finalPrompt = [...inputs.texts, prompt].filter(Boolean).join('\n');
    const refImages = [...(inputs.startImage ? [inputs.startImage] : []), ...(inputs.endImage ? [inputs.endImage] : []), ...inputs.images];
    const hasImage = refImages.length > 0;
    const mode = hasImage ? 'image-to-video' : 'text-to-video';

    if (!finalPrompt.trim() && !hasImage) {
      updateNodeData(id, { status: 'error' });
      setGenerating(false);
      return;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('generate-video', {
        body: {
          action: 'submit',
          prompt: finalPrompt || 'generate a video',
          referenceImages: refImages,
          model: selectedModel,
          aspectRatio: selectedAR,
          duration: selectedDuration,
          mode,
        },
      });

      if (error || result?.error) {
        updateNodeData(id, { status: 'error' });
        setGenerating(false);
        return;
      }

      if (result?.submitted) {
        const pollInterval = setInterval(async () => {
          try {
            const { data: pollResult } = await supabase.functions.invoke('generate-video', {
              body: {
                action: 'poll',
                provider: result.provider,
                taskId: result.taskId,
                responseUrl: result.responseUrl,
                statusUrl: result.statusUrl,
              },
            });
            if (pollResult?.status === 'complete' && pollResult.videoUrl) {
              clearInterval(pollInterval);
              updateNodeData(id, { status: 'complete', videoUrl: pollResult.videoUrl });
              const projectId = useCanvasStore.getState().projectId;
              if (projectId) logSpacesEvent({ projectId, nodeId: id, eventType: 'video_generated', contentUrl: pollResult.videoUrl, prompt: finalPrompt, model: selectedModel, metadata: { aspectRatio: selectedAR, duration: selectedDuration } });
              setGenerating(false);
            } else if (pollResult?.status === 'failed') {
              clearInterval(pollInterval);
              updateNodeData(id, { status: 'error' });
              setGenerating(false);
            }
          } catch {
            clearInterval(pollInterval);
            updateNodeData(id, { status: 'error' });
            setGenerating(false);
          }
        }, 5000);
      } else if (result?.videoUrl) {
        updateNodeData(id, { status: 'complete', videoUrl: result.videoUrl });
        const projectId = useCanvasStore.getState().projectId;
        if (projectId) logSpacesEvent({ projectId, nodeId: id, eventType: 'video_generated', contentUrl: result.videoUrl, prompt: finalPrompt, model: selectedModel, metadata: { aspectRatio: selectedAR, duration: selectedDuration } });
        setGenerating(false);
      }
    } catch {
      updateNodeData(id, { status: 'error' });
      setGenerating(false);
    }
  }, [prompt, generating, selectedModel, selectedAR, selectedDuration, id, updateNodeData, getConnectedInputs]);

  return (
    <div className="space-node w-[520px] rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative">
      {selected && <NodeToolbar nodeId={id} nodeType="video-generator" />}

      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
        <Video className="w-4 h-4" />
        {data.label}
      </div>

      <div className="relative px-3 pb-3">
        <div className="relative rounded-xl overflow-hidden bg-[hsl(var(--background))]" style={{ minHeight: 340 }}>
          {data.videoUrl ? (
            <video src={data.videoUrl} controls className="w-full h-[340px] object-contain bg-black/20" />
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); updateNodeData(id, { prompt: e.target.value }); }}
              placeholder="Describe the video you want to generate..."
              className="w-full h-[340px] bg-transparent p-4 pt-6 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none border-0 focus:outline-none"
            />
          )}
        </div>

        {/* Toolbar row 1 */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <div className="flex items-center gap-0.5 bg-[hsl(var(--muted))] rounded-full px-2 py-1.5">
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Minus className="w-3 h-3" /></button>
            <span className="text-xs font-medium text-foreground min-w-[24px] text-center">x{quantity}</span>
            <button onClick={() => setQuantity(Math.min(4, quantity + 1))} className="w-5 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"><Plus className="w-3 h-3" /></button>
          </div>

          <div ref={modelRef} className="relative">
            <button onClick={() => { setModelOpen(!modelOpen); setArOpen(false); setDurOpen(false); }} className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors">
              {modelName.length > 14 ? modelName.slice(0, 14) + '…' : modelName}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {modelOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-[260px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2">
                  <div className="flex items-center gap-2 bg-[hsl(var(--muted))] rounded-lg px-2 py-1.5">
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="Search" className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none w-full" autoFocus />
                  </div>
                </div>
                <div className="max-h-[280px] overflow-y-auto px-1 pb-1">
                  {filteredModels.map(m => (
                    <button key={m.id} onClick={() => { updateNodeData(id, { model: m.id }); setModelOpen(false); setModelSearch(''); }} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${m.id === selectedModel ? 'bg-[hsl(var(--accent))] text-accent-foreground' : 'text-foreground hover:bg-[hsl(var(--muted))]'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={arRef} className="relative">
            <button onClick={() => { setArOpen(!arOpen); setModelOpen(false); setDurOpen(false); }} className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors">
              <span className="w-3 h-3 border border-muted-foreground/50 rounded-sm" />
              {selectedAR}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {arOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-[120px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden p-1">
                {VIDEO_ASPECT_RATIOS.map(ar => (
                  <button key={ar} onClick={() => { updateNodeData(id, { aspectRatio: ar }); setArOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${ar === selectedAR ? 'bg-[hsl(var(--accent))] text-accent-foreground' : 'text-foreground hover:bg-[hsl(var(--muted))]'}`}>
                    {ar}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div ref={durRef} className="relative">
            <button onClick={() => { setDurOpen(!durOpen); setModelOpen(false); setArOpen(false); }} className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors">
              Auto
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {durOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-[100px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden p-1">
                <button onClick={() => setDurOpen(false)} className="w-full text-left px-3 py-1.5 text-xs rounded-lg text-foreground hover:bg-[hsl(var(--muted))]">Auto</button>
                {VIDEO_DURATIONS.map(d => (
                  <button key={d} onClick={() => setDurOpen(false)} className="w-full text-left px-3 py-1.5 text-xs rounded-lg text-foreground hover:bg-[hsl(var(--muted))]">{d}s</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toolbar row 2 */}
        <div className="flex items-center gap-2 mt-2 px-1">
          <button onClick={() => setSoundEffects(!soundEffects)} className="flex items-center gap-2">
            <div className={`w-9 h-5 rounded-full relative transition-colors ${soundEffects ? 'bg-primary' : 'bg-[hsl(var(--muted))]'}`}>
              <div className={`w-4 h-4 rounded-full bg-foreground absolute top-0.5 transition-all ${soundEffects ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
            <span className="text-xs text-muted-foreground">Sound Effects</span>
          </button>

          <button className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          <button onClick={handleGenerate} disabled={generating} className="w-9 h-9 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <Play className="w-4 h-4" />
          </button>
        </div>

        {generating && (
          <div className="absolute inset-3 rounded-xl bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Generating…
            </div>
          </div>
        )}
      </div>

      {/* Smart connectors — Video Generator accepts: text, start image, end image, references. Outputs: start img, end img, video, audio */}
      <NodeConnectors inputs={NODE_INPUTS['video-generator']} outputs={NODE_OUTPUTS['video-generator']} />
    </div>
  );
}
