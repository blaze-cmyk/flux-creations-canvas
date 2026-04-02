import { Handle, Position } from '@xyflow/react';
import { Type, ImageIcon, Video, AudioLines, Clapperboard, Image } from 'lucide-react';

type ConnectorDef = {
  id: string;
  label: string;
  icon: 'image' | 'video' | 'text' | 'audio' | 'start-image' | 'end-image' | 'reference';
};

type Props = {
  inputs: ConnectorDef[];
  outputs: ConnectorDef[];
};

const ICON_MAP: Record<string, React.ReactNode> = {
  'text': <Type className="w-4 h-4" />,
  'image': <ImageIcon className="w-4 h-4" />,
  'video': <Clapperboard className="w-4 h-4" />,
  'audio': <AudioLines className="w-4 h-4" />,
  'start-image': <ImageIcon className="w-4 h-4" />,
  'end-image': <ImageIcon className="w-4 h-4" />,
  'reference': <ImageIcon className="w-4 h-4" />,
};

export function NodeConnectors({ inputs, outputs }: Props) {
  const inputSpacing = inputs.length > 0 ? 100 / (inputs.length + 1) : 0;
  const outputSpacing = outputs.length > 0 ? 100 / (outputs.length + 1) : 0;

  return (
    <>
      {/* Left side input connectors */}
      {inputs.map((inp, i) => {
        const topPct = inputSpacing * (i + 1);
        return (
          <div key={inp.id}>
            {/* Visual icon — pointer-events-none so Handle beneath can be dragged */}
            <div
              className="absolute left-0 z-10 pointer-events-none"
              style={{ top: `${topPct}%`, transform: `translate(-50%, -50%)` }}
            >
              <div className="group relative w-10 h-10 rounded-full bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))] flex items-center justify-center">
                {ICON_MAP[inp.icon]}
                <span className="absolute right-full mr-2 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {inp.label}
                </span>
              </div>
            </div>
            {/* Actual handle — large hit area */}
            <Handle
              type="target"
              position={Position.Left}
              id={inp.id}
              style={{ top: `${topPct}%` }}
              className="!w-10 !h-10 !bg-transparent !border-0 !-left-5 z-20"
            />
          </div>
        );
      })}

      {/* Right side output connectors */}
      {outputs.map((out, i) => {
        const topPct = outputSpacing * (i + 1);
        return (
          <div key={out.id}>
            {/* Visual icon — pointer-events-none so Handle beneath can be dragged */}
            <div
              className="absolute right-0 z-10 pointer-events-none"
              style={{ top: `${topPct}%`, transform: `translate(50%, -50%)` }}
            >
              <div className="group relative w-10 h-10 rounded-full bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))] flex items-center justify-center">
                {ICON_MAP[out.icon]}
                <span className="absolute left-full ml-2 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {out.label}
                </span>
              </div>
            </div>
            {/* Actual handle — large hit area */}
            <Handle
              type="source"
              position={Position.Right}
              id={out.id}
              style={{ top: `${topPct}%` }}
              className="!w-10 !h-10 !bg-transparent !border-0 !-right-5 z-20"
            />
          </div>
        );
      })}
    </>
  );
}
