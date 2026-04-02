import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Pen, MessageSquareText, Sparkles, Settings, Play, ChevronDown, Search } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { NodeToolbar } from './NodeToolbar';
import { logSpacesEvent } from '@/lib/spacesHistory';
import { NodeConnectors } from './NodeConnectors';
import { NODE_INPUTS, NODE_OUTPUTS } from '@/lib/connectionRules';

const AI_MODELS = [
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'openai/gpt-5', name: 'GPT-5' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano' },
  { id: 'openai/gpt-5.2', name: 'GPT-5.2' },
];

const EXPORT_OPTIONS = ['Export as text', 'Export as markdown', 'Export as JSON'];

export function AssistantNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const { updateNodeData, getConnectedInputs } = useCanvasStore();
  const [prompt, setPrompt] = useState(data.prompt || '');
  const [response, setResponse] = useState(data.text || '');
  const [mode, setMode] = useState<'chat' | 'creative'>('chat');
  const [modelOpen, setModelOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  const [generating, setGenerating] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const selectedModel = data.model || 'openai/gpt-5-mini';
  const modelName = AI_MODELS.find(m => m.id === selectedModel)?.name || 'GPT-5 Mini';

  const filteredModels = AI_MODELS.filter(m =>
    m.name.toLowerCase().includes(modelSearch.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    updateNodeData(id, { status: 'running' });

    const inputs = getConnectedInputs(id);
    const connectedTexts = inputs.texts.filter(Boolean);
    const finalPrompt = [...connectedTexts, prompt].filter(Boolean).join('\n\n');

    if (!finalPrompt.trim()) {
      updateNodeData(id, { status: 'error' });
      setGenerating(false);
      return;
    }

    try {
      const { data: result, error } = await supabase.functions.invoke('ai-assistant', {
        body: { prompt: finalPrompt, model: selectedModel, mode, referenceImages: inputs.images },
      });

      if (error || result?.error) {
        updateNodeData(id, { status: 'error' });
      } else {
        const text = result?.text || result?.content || '';
        setResponse(text);
        updateNodeData(id, { status: 'complete', text });
        const projectId = useCanvasStore.getState().projectId;
        if (projectId) logSpacesEvent({ projectId, nodeId: id, eventType: 'assistant_response', prompt: finalPrompt, model: selectedModel, metadata: { mode, responseLength: text.length } });
      }
    } catch {
      updateNodeData(id, { status: 'error' });
    } finally {
      setGenerating(false);
    }
  }, [prompt, generating, selectedModel, mode, id, updateNodeData, getConnectedInputs]);

  return (
    <div className="space-node w-[520px] rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative">
      {selected && <NodeToolbar nodeId={id} nodeType="assistant" />}

      <div className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground">
        <Pen className="w-4 h-4" />
        {data.label}
      </div>

      <div className="relative px-3 pb-3">
        <div className="relative rounded-xl overflow-hidden bg-[hsl(var(--background))]" style={{ minHeight: 380 }}>
          {/* Mode toggle */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-0.5 bg-[hsl(var(--muted))] rounded-lg p-0.5">
            <button onClick={() => setMode('chat')} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${mode === 'chat' ? 'bg-[hsl(var(--card))] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Chat mode">
              <MessageSquareText className="w-4 h-4" />
            </button>
            <button onClick={() => setMode('creative')} className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${mode === 'creative' ? 'bg-[hsl(var(--card))] text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`} title="Creative mode">
              <Sparkles className="w-4 h-4" />
            </button>
          </div>

          {response ? (
            <div className="w-full h-[380px] p-4 pt-16 text-sm text-foreground overflow-y-auto whitespace-pre-wrap">{response}</div>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); updateNodeData(id, { prompt: e.target.value }); }}
              placeholder="Assistant is your creative sidekick—powered by a large language model."
              className="w-full h-[380px] bg-transparent p-4 pt-16 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none border-0 focus:outline-none"
            />
          )}
        </div>

        <div className="flex items-center gap-2 mt-3 px-1">
          <div ref={modelRef} className="relative">
            <button onClick={() => { setModelOpen(!modelOpen); setExportOpen(false); }} className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors">
              {modelName}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {modelOpen && (
              <div className="absolute bottom-full mb-2 left-0 w-[240px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-2">
                  <div className="flex items-center gap-2 bg-[hsl(var(--muted))] rounded-lg px-2 py-1.5">
                    <Search className="w-3 h-3 text-muted-foreground" />
                    <input value={modelSearch} onChange={(e) => setModelSearch(e.target.value)} placeholder="Search" className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none w-full" autoFocus />
                  </div>
                </div>
                <div className="max-h-[260px] overflow-y-auto px-1 pb-1">
                  {filteredModels.map(m => (
                    <button key={m.id} onClick={() => { updateNodeData(id, { model: m.id }); setModelOpen(false); setModelSearch(''); }} className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${m.id === selectedModel ? 'bg-[hsl(var(--accent))] text-accent-foreground' : 'text-foreground hover:bg-[hsl(var(--muted))]'}`}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="w-8 h-8 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          <div ref={exportRef} className="relative">
            <button onClick={() => { setExportOpen(!exportOpen); setModelOpen(false); }} className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-3 py-1.5 text-xs text-foreground hover:bg-[hsl(var(--muted)/0.8)] transition-colors">
              Export as text
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {exportOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-[180px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 overflow-hidden p-1">
                {EXPORT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setExportOpen(false)} className="w-full text-left px-3 py-1.5 text-xs rounded-lg text-foreground hover:bg-[hsl(var(--muted))] transition-colors">{opt}</button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleGenerate} disabled={generating} className="w-9 h-9 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
            <Play className="w-4 h-4" />
          </button>
        </div>

        {generating && (
          <div className="absolute inset-3 rounded-xl bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
              Thinking…
            </div>
          </div>
        )}
      </div>

      {/* Smart connectors — Assistant accepts: text, images. Outputs: text */}
      <NodeConnectors inputs={NODE_INPUTS['assistant']} outputs={NODE_OUTPUTS['assistant']} />
    </div>
  );
}
