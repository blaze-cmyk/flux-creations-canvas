import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Video, Play, Minus, Plus } from 'lucide-react';
import { useState } from 'react';

export function VideoGeneratorNode({ id, data }: { id: string; data: SpaceNodeData }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [prompt, setPrompt] = useState(data.prompt || '');

  return (
    <div className={`space-node w-[340px] rounded-xl bg-node border border-node-border shadow-[0_4px_24px_rgba(0,0,0,0.6)] ${data.status === 'running' ? 'node-running' : ''}`}>
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
        <Video className="w-3 h-3" />
        {data.label}
      </div>

      <div className="px-3 pb-3">
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            updateNodeData(id, { prompt: e.target.value });
          }}
          placeholder="Describe the video you want to generate..."
          className="w-full h-48 bg-background rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none border-0 focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex items-center gap-1 bg-background rounded px-2 py-1">
            <Minus className="w-3 h-3 text-muted-foreground cursor-pointer" />
            <span className="text-xs text-foreground">x1</span>
            <Plus className="w-3 h-3 text-muted-foreground cursor-pointer" />
          </div>

          <select className="bg-background text-xs text-muted-foreground rounded px-2 py-1 border-0">
            <option>Auto</option>
            <option>kling-v2</option>
            <option>veo-2</option>
            <option>minimax</option>
          </select>

          <select
            value={data.aspectRatio || '16:9'}
            onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value })}
            className="bg-background text-xs text-muted-foreground rounded px-2 py-1 border-0"
          >
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
          </select>

          <select className="bg-background text-xs text-muted-foreground rounded px-2 py-1 border-0">
            <option>Auto</option>
            <option>5s</option>
            <option>10s</option>
          </select>
        </div>

        <div className="flex items-center justify-between mt-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <div className="w-8 h-4 bg-muted rounded-full relative">
              <div className="w-3 h-3 bg-muted-foreground/50 rounded-full absolute left-0.5 top-0.5" />
            </div>
            Sound Effects
          </label>

          <button
            onClick={() => updateNodeData(id, { status: 'running' })}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
          >
            <Play className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="img-in" />
      <Handle type="source" position={Position.Right} id="video-out" />
    </div>
  );
}
