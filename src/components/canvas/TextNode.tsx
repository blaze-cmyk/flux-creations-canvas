import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Type } from 'lucide-react';
import { useState } from 'react';
import { NodeToolbar } from './NodeToolbar';

export function TextNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [text, setText] = useState(data.text || '');

  return (
    <div className="space-node w-[280px] rounded-xl bg-node border border-node-border shadow-[0_4px_24px_rgba(0,0,0,0.6)] relative">
      {selected && <NodeToolbar nodeId={id} nodeType="text" />}
      <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground">
        <Type className="w-3 h-3" />
        {data.label}
      </div>
      <div className="px-3 pb-3">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            updateNodeData(id, { text: e.target.value });
          }}
          placeholder="Enter your text..."
          className="w-full h-24 bg-background rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none border-0 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>
      <Handle type="source" position={Position.Right} id="text-out" />
    </div>
  );
}
