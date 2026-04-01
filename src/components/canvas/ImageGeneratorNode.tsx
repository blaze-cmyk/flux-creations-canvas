import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Image, Play } from 'lucide-react';
import { useState } from 'react';

export function ImageGeneratorNode({ id, data }: { id: string; data: SpaceNodeData }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [prompt, setPrompt] = useState(data.prompt || '');

  return (
    <div className={`space-node w-[340px] rounded-xl bg-node border border-node-border shadow-[0_4px_24px_rgba(0,0,0,0.6)] ${data.status === 'running' ? 'node-running' : ''}`}>
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
        <Image className="w-3 h-3" />
        {data.label}
      </div>

      <div className="px-3 pb-3">
        {data.imageUrl ? (
          <div className="rounded-lg overflow-hidden mb-2">
            <img src={data.imageUrl} alt="" className="w-full h-48 object-cover" />
          </div>
        ) : (
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              updateNodeData(id, { prompt: e.target.value });
            }}
            placeholder="Describe the image you want to generate..."
            className="w-full h-48 bg-background rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none border-0 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        )}

        <div className="flex items-center justify-between mt-2">
          <select
            value={data.model || 'flux-dev'}
            onChange={(e) => updateNodeData(id, { model: e.target.value })}
            className="bg-background text-xs text-muted-foreground rounded px-2 py-1 border-0 focus:outline-none"
          >
            <option value="flux-dev">Flux Dev</option>
            <option value="flux-pro">Flux Pro</option>
            <option value="dall-e-3">DALL-E 3</option>
            <option value="sdxl">Stable Diffusion XL</option>
          </select>

          <button
            onClick={() => updateNodeData(id, { status: 'running' })}
            className="flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            <Play className="w-3 h-3" />
            Generate
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="img-in" />
      <Handle type="source" position={Position.Right} id="img-out" />
    </div>
  );
}
