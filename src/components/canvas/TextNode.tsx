import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Type, Bold, Italic, List, ListOrdered, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NodeToolbar } from './NodeToolbar';

const COLORS = [
  { id: 'none', color: 'transparent', border: true, slash: true },
  { id: 'white', color: '#e5e5e5' },
  { id: 'red', color: '#ef4444' },
  { id: 'orange', color: '#f97316' },
  { id: 'amber', color: '#eab308' },
  { id: 'green', color: '#22c55e' },
  { id: 'cyan', color: '#06b6d4' },
  { id: 'blue', color: '#3b82f6' },
  { id: 'purple', color: '#a855f7' },
];

const PARAGRAPH_OPTIONS = ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Quote'];

export function TextNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [text, setText] = useState(data.text || '');
  const [selectedColor, setSelectedColor] = useState('none');
  const [textColor, setTextColor] = useState('white');
  const [paraOpen, setParaOpen] = useState(false);
  const [paraType, setParaType] = useState('Paragraph');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const paraRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (paraRef.current && !paraRef.current.contains(e.target as Node)) setParaOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-node w-[520px] rounded-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] shadow-[0_8px_40px_rgba(0,0,0,0.5)] relative">
      {selected && <NodeToolbar nodeId={id} nodeType="text" />}

      {/* Color palette bar */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="flex items-center gap-1.5 bg-[hsl(var(--muted))] rounded-full px-2 py-1.5">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedColor(c.id);
                if (c.id !== 'none') setTextColor(c.color);
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${selectedColor === c.id ? 'ring-2 ring-foreground/50 ring-offset-1 ring-offset-[hsl(var(--muted))]' : 'hover:scale-110'}`}
              style={{ backgroundColor: c.slash ? 'transparent' : c.color }}
            >
              {c.slash && (
                <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/40 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-[2px] h-8 bg-red-500 rotate-45" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex justify-center pb-2">
        <div className="flex items-center gap-0.5 bg-[hsl(var(--muted))] rounded-full px-2 py-1">
          {/* Text color indicator + arrows */}
          <div className="flex items-center gap-0">
            <div className="w-6 h-6 rounded-md flex items-center justify-center">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: textColor === 'white' ? '#e5e5e5' : textColor }} />
            </div>
            <button className="w-4 h-5 flex items-center justify-center text-muted-foreground hover:text-foreground">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>

          <div className="w-px h-5 bg-[hsl(var(--border)/0.3)] mx-1" />

          {/* Paragraph type dropdown */}
          <div ref={paraRef} className="relative">
            <button
              onClick={() => setParaOpen(!paraOpen)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-foreground hover:bg-[hsl(var(--card)/0.5)] rounded-md transition-colors"
            >
              {paraType}
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {paraOpen && (
              <div className="absolute top-full mt-1 left-0 w-[140px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-2xl z-50 p-1">
                {PARAGRAPH_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setParaType(opt); setParaOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${opt === paraType ? 'bg-[hsl(var(--accent))] text-accent-foreground' : 'text-foreground hover:bg-[hsl(var(--muted))]'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-[hsl(var(--border)/0.3)] mx-1" />

          {/* Bold */}
          <button
            onClick={() => setBold(!bold)}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${bold ? 'bg-[hsl(var(--card))] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Bold className="w-4 h-4" />
          </button>

          {/* Italic */}
          <button
            onClick={() => setItalic(!italic)}
            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${italic ? 'bg-[hsl(var(--card))] text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Italic className="w-4 h-4" />
          </button>

          {/* Bullet list */}
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <List className="w-4 h-4" />
          </button>

          {/* Numbered list */}
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <ListOrdered className="w-4 h-4" />
          </button>

          {/* Divider */}
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors">
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-muted-foreground">
        <Type className="w-4 h-4" />
        {data.label}
      </div>

      {/* Text area */}
      <div className="px-3 pb-3">
        <div className="rounded-xl bg-[hsl(var(--background))] overflow-hidden">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              updateNodeData(id, { text: e.target.value });
            }}
            placeholder='Try "Happy dog with sunglasses and floating ring"'
            className="w-full h-[180px] bg-transparent p-4 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none border-0 focus:outline-none"
            style={{
              fontWeight: bold ? 'bold' : 'normal',
              fontStyle: italic ? 'italic' : 'normal',
              color: selectedColor !== 'none' ? textColor : undefined,
            }}
          />
        </div>
      </div>

      {/* Right side connector */}
      <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 z-10">
        <div className="group relative w-10 h-10 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center cursor-pointer hover:bg-[hsl(var(--muted)/0.8)] transition-colors">
          <Type className="w-4 h-4 text-muted-foreground" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-lg text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Text output</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="text-out" className="!w-3 !h-3 !bg-muted-foreground/50 !border-0" />
    </div>
  );
}
