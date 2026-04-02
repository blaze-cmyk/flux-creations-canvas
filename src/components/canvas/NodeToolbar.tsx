import { useCallback, useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '@/store/canvasStore';
import { Link2, ChevronUp, Maximize2, PenLine, Image, Trash2, Download, GitBranch, MoreHorizontal, Copy, Play, Plus, Video, Sparkles, ScanLine, Camera } from 'lucide-react';
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

const moreMenuItems = [
  { label: 'Open preview', icon: Maximize2, shortcut: 'A' },
  { label: 'Edit', icon: PenLine },
  { label: 'Discover similar', icon: Image },
  { label: 'Copy Image', icon: Copy },
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

  const handleConnect = useCallback((type: string) => {
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return;
    const pos = { x: currentNode.position.x + 600, y: currentNode.position.y };
    addNode(type as any, pos);
    const counter = useCanvasStore.getState().nodeCounter;
    const newNodeId = `${type}-${counter[type]}`;
    const sourceHandle = nodeType === 'text' ? 'text-out' : 'img-out';
    const targetHandle = nodeType === 'text' ? 'text-in' : type === 'video-generator' ? 'ref-in' : 'img-in';
    onConnect({ source: nodeId, target: newNodeId, sourceHandle, targetHandle });
    setConnectOpen(false);
  }, [nodeId, nodeType, nodes, addNode, onConnect]);

  const handleDuplicate = useCallback(() => {
    duplicateNode(nodeId);
    setMoreOpen(false);
  }, [nodeId, duplicateNode]);

  const handleDelete = useCallback(() => {
    deleteNode(nodeId);
  }, [nodeId, deleteNode]);

  const handleDownload = useCallback(() => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const d = node.data as any;
    const url = d.imageUrl || d.videoUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = d.label || 'download';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, [nodeId, nodes]);

  return (
    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-0 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-1.5 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
      >
        {/* Connect dropdown */}
        <div ref={connectRef} className="relative">
          <button
            onClick={() => { setConnectOpen(!connectOpen); setMoreOpen(false); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors"
          >
            <Link2 className="w-4 h-4" />
            <ChevronUp className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {connectOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full mb-2 left-0 w-[220px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50"
              >
                <div className="p-1">
                  {connectOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => handleConnect(opt.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/5 transition-colors"
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

        {/* Open preview */}
        <button className="px-2 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors" title="Open preview">
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Edit */}
        <button className="px-2 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors" title="Edit">
          <PenLine className="w-4 h-4" />
        </button>

        {/* Discover similar */}
        <button className="px-2 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors" title="Discover similar">
          <Image className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-[#333] mx-0.5" />

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="px-2 py-1.5 rounded-full text-[#999] hover:text-red-400 hover:bg-white/5 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Download */}
        <button
          onClick={handleDownload}
          className="px-2 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Create reference */}
        <button className="px-2 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors" title="Create reference">
          <GitBranch className="w-4 h-4" />
        </button>

        {/* More menu */}
        <div ref={moreRef} className="relative">
          <button
            onClick={() => { setMoreOpen(!moreOpen); setConnectOpen(false); }}
            className="px-2 py-1.5 rounded-full text-[#999] hover:text-white hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full mb-2 right-0 w-[220px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] overflow-hidden z-50"
              >
                <div className="p-1">
                  {moreMenuItems.map((item) => (
                    <button
                      key={item.label}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="w-4 h-4 text-[#999]" />
                        {item.label}
                      </span>
                      {item.shortcut && <span className="text-xs text-[#666]">{item.shortcut}</span>}
                    </button>
                  ))}

                  <div className="mx-2 my-1 h-px bg-[#2a2a2a]" />

                  <button
                    onClick={handleDuplicate}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Copy className="w-4 h-4 text-[#999]" />
                      Duplicate
                    </span>
                    <span className="text-xs text-[#666]">⌘D</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Trash2 className="w-4 h-4 text-[#999]" />
                      Delete
                    </span>
                    <span className="text-xs text-[#666]">⌫</span>
                  </button>

                  <div className="mx-2 my-1 h-px bg-[#2a2a2a]" />

                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#999]" />
                    Download
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white rounded-lg hover:bg-white/5 transition-colors">
                    <Plus className="w-4 h-4 text-[#999]" />
                    Move to folder
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
