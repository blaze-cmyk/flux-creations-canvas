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
            {/* Visual icon */}
            <div
              className="absolute left-0 -translate-x-1/2 z-10"
              style={{ top: `${topPct}%`, transform: `translate(-50%, -50%)` }}
            >
              <div className="group relative w-10 h-10 rounded-full bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))] flex items-center justify-center cursor-pointer hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.15)] transition-all duration-200">
                {ICON_MAP[inp.icon]}
                <span className="absolute right-full mr-2 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {inp.label}
                </span>
              </div>
            </div>
            {/* Actual handle */}
            <Handle
              type="target"
              position={Position.Left}
              id={inp.id}
              style={{ top: `${topPct}%` }}
              className="!w-3 !h-3 !bg-transparent !border-0"
            />
          </div>
        );
      })}

      {/* Right side output connectors */}
      {outputs.map((out, i) => {
        const topPct = outputSpacing * (i + 1);
        return (
          <div key={out.id}>
            {/* Visual icon */}
            <div
              className="absolute right-0 translate-x-1/2 z-10"
              style={{ top: `${topPct}%`, transform: `translate(50%, -50%)` }}
            >
              <div className="group relative w-10 h-10 rounded-full bg-[hsl(var(--muted))] border-2 border-[hsl(var(--border))] flex items-center justify-center cursor-pointer hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.15)] transition-all duration-200">
                {ICON_MAP[out.icon]}
                <span className="absolute left-full ml-2 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  {out.label}
                </span>
              </div>
            </div>
            {/* Actual handle */}
            <Handle
              type="source"
              position={Position.Right}
              id={out.id}
              style={{ top: `${topPct}%` }}
              className="!w-3 !h-3 !bg-transparent !border-0"
            />
          </div>
        );
      })}
    </>
  );
}
