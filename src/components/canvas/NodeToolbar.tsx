import { useCallback, useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Play, ChevronDown, Link2, Trash2, MoreHorizontal, Plus, Copy, Image, Video, Sparkles, ScanLine, Camera } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type Props = {
  nodeId: string;
  nodeType: string;
};

const connectOptions = [
  { label: 'Image Generator', type: 'image-generator' as const, icon: Image, color: 'text-indigo-400' },
  { label: 'Video Generator', type: 'video-generator' as const, icon: Video, color: 'text-purple-400' },
  { label: 'Image Upscaler', type: 'upscaler' as const, icon: ScanLine, color: 'text-blue-400' },
  { label: 'Assistant', type: 'assistant' as const, icon: Sparkles, color: 'text-emerald-400' },
  { label: 'Change Camera', type: 'video-generator' as const, icon: Camera, color: 'text-orange-400' },
];

export function NodeToolbar({ nodeId, nodeType }: Props) {
  const { deleteNode, duplicateNode, addNode, updateNodeData, onConnect, nodes } = useCanvasStore();
  const [connectOpen, setConnectOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const connectRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (connectRef.current && !connectRef.current.contains(e.target as Node)) setConnectOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleRun = useCallback(() => {
    updateNodeData(nodeId, { status: 'running' });
  }, [nodeId, updateNodeData]);

  const handleConnect = useCallback((type: string) => {
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    const pos = { x: currentNode.position.x + 600, y: currentNode.position.y };
    addNode(type as any, pos);
    setConnectOpen(false);
  }, [nodeId, nodes, addNode]);

  const handleDuplicate = useCallback(() => {
    duplicateNode(nodeId);
    setMoreOpen(false);
  }, [nodeId, duplicateNode]);

  const handleDelete = useCallback(() => {
    deleteNode(nodeId);
  }, [nodeId, deleteNode]);

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-0.5 bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.4)] rounded-xl px-1.5 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      >
        {/* Play / Run button with dropdown */}
        <button
          onClick={handleRun}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
        >
          <Play className="w-4 h-4" />
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Connect dropdown */}
        <div ref={connectRef} className="relative">
          <button
            onClick={() => { setConnectOpen(!connectOpen); setMoreOpen(false); }}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
          >
            <Link2 className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {connectOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full mt-2 left-0 w-[220px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50"
              >
                <div className="p-1">
                  {connectOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleConnect(opt.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                    >
                      <opt.icon className={`w-4 h-4 ${opt.color}`} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-[hsl(var(--border)/0.3)] mx-0.5" />

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="px-2 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* More menu */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => { setMoreOpen(!moreOpen); setConnectOpen(false); }}
            className="px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full mt-2 right-0 w-[200px] bg-[hsl(var(--card))] border border-[hsl(var(--border)/0.3)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50"
              >
                <div className="p-1">
                  <button
                    onClick={handleRun}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Run
                  </button>
                  <button
                    onClick={() => { setMoreOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add creation
                  </button>

                  <div className="mx-2 my-1 h-px bg-[hsl(var(--border)/0.2)]" />

                  <button
                    onClick={handleDuplicate}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </span>
                    <span className="text-xs text-muted-foreground">⌘D</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-[hsl(var(--muted)/0.5)] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </span>
                    <span className="text-xs text-muted-foreground">⌫</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
