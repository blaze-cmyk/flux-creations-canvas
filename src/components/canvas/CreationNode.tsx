import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { Grid3X3, Volume2 } from 'lucide-react';
import { useState } from 'react';
import { NodeToolbar } from './NodeToolbar';

export function CreationNode({ id, data }: { id: string; data: SpaceNodeData }) {
  const [selected, setSelected] = useState(false);

  return (
    <div className="space-node w-[220px] rounded-xl bg-node border border-node-border shadow-[0_4px_24px_rgba(0,0,0,0.6)] relative" onClick={() => setSelected(true)} onBlur={() => setSelected(false)} tabIndex={0}>
      {selected && <NodeToolbar nodeId={id} nodeType="creation" />}
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
        <Grid3X3 className="w-3 h-3" />
        {data.label}
      </div>

      {/* Phone mockup area */}
      <div className="relative mx-2 mb-2 rounded-lg bg-background overflow-hidden" style={{ aspectRatio: '9/16' }}>
        {data.imageUrl ? (
          <img src={data.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-muted/20 to-muted/5 flex items-center justify-center">
            <div className="text-[10px] text-muted-foreground/60 text-center px-4 whitespace-pre-line leading-relaxed">
              {data.text || 'No content'}
            </div>
          </div>
        )}
        <Volume2 className="absolute top-2 right-2 w-3 h-3 text-muted-foreground/50" />
        <div className="absolute bottom-2 left-2 text-[9px] text-muted-foreground/50">576 × 1024</div>
        <div className="absolute bottom-2 right-2 text-[9px] text-muted-foreground/50">00:00</div>
      </div>

      <Handle type="source" position={Position.Right} id="img-out" style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="img-out-2" style={{ top: '55%' }} />
      <Handle type="source" position={Position.Right} id="audio-out" style={{ top: '75%' }} />
    </div>
  );
}
