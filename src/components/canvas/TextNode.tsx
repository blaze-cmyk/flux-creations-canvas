import { Handle, Position } from '@xyflow/react';
import type { SpaceNodeData } from '@/store/canvasStore';
import { useCanvasStore } from '@/store/canvasStore';
import { Type, Bold, Italic, List, ListOrdered, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { NodeToolbar } from './NodeToolbar';
import { NodeConnectors } from './NodeConnectors';
import { NODE_INPUTS, NODE_OUTPUTS } from '@/lib/connectionRules';

const COLORS = [
  { id: 'none', slash: true },
  { id: 'white', color: '#d4d4d4' },
  { id: 'red', color: '#dc2626' },
  { id: 'orange', color: '#d97706' },
  { id: 'amber', color: '#ca8a04' },
  { id: 'green', color: '#16a34a' },
  { id: 'cyan', color: '#0891b2' },
  { id: 'blue', color: '#2563eb' },
  { id: 'purple', color: '#9333ea' },
];

const PARAGRAPH_OPTIONS = ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Quote'];

export function TextNode({ id, data, selected }: { id: string; data: SpaceNodeData; selected?: boolean }) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [text, setText] = useState(data.text || '');
  const [selectedColor, setSelectedColor] = useState('none');
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

  const activeColor = selectedColor !== 'none' ? COLORS.find(c => c.id === selectedColor)?.color : '#d4d4d4';

  return (
    <div className="space-node relative">
      {selected && <NodeToolbar nodeId={id} nodeType="text" />}

      {/* Color palette */}
      <div className="flex justify-center mb-2">
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-full px-2.5 py-2 border border-[#2a2a2a]">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedColor(c.id)}
              className={`w-8 h-8 rounded-full transition-all flex-shrink-0 ${selectedColor === c.id ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-[#1a1a1a]' : 'hover:scale-110'}`}
              style={c.slash ? undefined : { backgroundColor: c.color }}
            >
              {c.slash && (
                <span className="w-8 h-8 rounded-full border-2 border-[#555] flex items-center justify-center relative overflow-hidden">
                  <span className="absolute w-[2px] h-9 bg-red-500 rotate-45" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="flex justify-center mb-3">
        <div className="flex items-center gap-0 bg-[#1a1a1a] rounded-full px-2 py-1.5 border border-[#2a2a2a]">
          <div className="flex items-center">
            <span className="w-6 h-6 rounded-full flex items-center justify-center">
              <span className="w-4 h-4 rounded-full" style={{ backgroundColor: activeColor }} />
            </span>
            <button className="w-5 h-6 flex items-center justify-center text-[#888] hover:text-white">
              <ChevronUp className="w-3 h-3" />
            </button>
          </div>
          <span className="w-px h-5 bg-[#333] mx-1.5" />
          <div ref={paraRef} className="relative">
            <button onClick={() => setParaOpen(!paraOpen)} className="flex items-center gap-1 px-2 py-1 text-sm text-white hover:bg-white/5 rounded-md">
              {paraType}
              <ChevronDown className="w-3 h-3 text-[#888]" />
            </button>
            {paraOpen && (
              <div className="absolute top-full mt-1 left-0 w-[140px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl z-50 p-1">
                {PARAGRAPH_OPTIONS.map((opt) => (
                  <button key={opt} onClick={() => { setParaType(opt); setParaOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${opt === paraType ? 'bg-[hsl(var(--accent))] text-white' : 'text-white hover:bg-white/10'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="w-px h-5 bg-[#333] mx-1.5" />
          <button onClick={() => setBold(!bold)} className={`w-7 h-7 flex items-center justify-center rounded-md text-lg font-bold ${bold ? 'text-white bg-white/10' : 'text-[#999] hover:text-white'}`}>B</button>
          <button onClick={() => setItalic(!italic)} className={`w-7 h-7 flex items-center justify-center rounded-md text-lg italic ${italic ? 'text-white bg-white/10' : 'text-[#999] hover:text-white'}`}>I</button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-[#999] hover:text-white"><List className="w-4 h-4" /></button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-[#999] hover:text-white"><ListOrdered className="w-4 h-4" /></button>
          <button className="w-7 h-7 flex items-center justify-center rounded-md text-[#999] hover:text-white"><Minus className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center gap-1.5 px-1 py-1.5 text-sm text-[#999]">
        <span className="w-5 h-5 rounded border border-[#555] flex items-center justify-center text-[10px] font-bold text-[#999]">T</span>
        {data.label}
      </div>

      {/* Text area */}
      <div className="w-[520px] rounded-xl bg-[#141414] border border-[#262626] overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); updateNodeData(id, { text: e.target.value }); }}
          placeholder='Try "Happy dog with sunglasses and floating ring"'
          className="w-full h-[160px] bg-transparent p-4 text-sm text-white placeholder:text-[#555] resize-none border-0 focus:outline-none"
          style={{ fontWeight: bold ? 'bold' : 'normal', fontStyle: italic ? 'italic' : 'normal' }}
        />
      </div>

      {/* Smart connectors — Text has no inputs, only text output */}
      <NodeConnectors inputs={NODE_INPUTS['text']} outputs={NODE_OUTPUTS['text']} />
    </div>
  );
}
