import {
  ReactFlow,
  Background,
  BackgroundVariant,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasStore } from '@/store/canvasStore';
import { CreationNode } from './CreationNode';
import { ImageGeneratorNode } from './ImageGeneratorNode';
import { VideoGeneratorNode } from './VideoGeneratorNode';
import { TextNode } from './TextNode';
import { AssistantNode } from './AssistantNode';
import { LeftToolbar } from './LeftToolbar';
import { TopBar } from './TopBar';
import { NodePalette } from './NodePalette';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FolderOpen, Image, Video, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const nodeTypes: NodeTypes = {
  creation: CreationNode,
  'image-generator': ImageGeneratorNode,
  'video-generator': VideoGeneratorNode,
  'text-node': TextNode,
  assistant: AssistantNode,
};

const welcomeNodes = [
  { label: 'Stock', icon: Search, type: 'creation' as const, color: 'text-muted-foreground' },
  { label: 'Media', icon: FolderOpen, type: 'creation' as const, color: 'text-muted-foreground' },
  { label: 'Image Generator', icon: Image, type: 'image-generator' as const, color: 'text-indigo-400' },
  { label: 'Video Generator', icon: Video, type: 'video-generator' as const, color: 'text-purple-400' },
  { label: 'Assistant', icon: Sparkles, type: 'assistant' as const, color: 'text-emerald-400' },
];

export function SpacesCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, paletteOpen, setPaletteOpen, loadProject, saving, addNode } = useCanvasStore();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId).then(() => setLoaded(true));
    }
  }, [projectId, loadProject]);

  // N key shortcut to open palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setPaletteOpen(!paletteOpen);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setPaletteOpen, paletteOpen]);

  const onPaneDoubleClick = useCallback(() => {
    setPaletteOpen(true);
  }, [setPaletteOpen]);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPaletteOpen(true);
  }, [setPaletteOpen]);

  const isEmpty = loaded && nodes.length === 0;

  return (
    <div className="w-screen h-screen bg-canvas overflow-hidden">
      <TopBar />
      <LeftToolbar />

      <div className="absolute inset-0 ml-10 mt-10" onContextMenu={onPaneContextMenu}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onPaneClick={() => {}}
          onDoubleClick={onPaneDoubleClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: 'default',
            animated: false,
            style: { stroke: 'hsl(240 5% 35%)', strokeWidth: 2 },
          }}
          connectionLineStyle={{ stroke: 'hsl(240 5% 50%)', strokeWidth: 2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="hsl(0 0% 22%)" />
        </ReactFlow>

        {/* Empty state welcome screen */}
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
            {/* Dotted arc decoration */}
            <svg className="absolute w-[600px] h-[500px]" viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M 100 420 C 60 300, 80 180, 160 100 C 240 20, 360 20, 440 100 C 520 180, 540 300, 500 420"
                stroke="hsl(0 0% 25%)"
                strokeWidth="2"
                strokeDasharray="4 8"
                fill="none"
                opacity="0.5"
              />
            </svg>

            <motion.div
              className="relative z-10 flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <h2 className="text-2xl font-semibold text-foreground mb-2">Your space is ready</h2>
              <p className="text-sm text-muted-foreground mb-8">Choose your first node and start creating</p>

              <div className="flex gap-3 pointer-events-auto">
                {welcomeNodes.map((node, i) => (
                  <motion.button
                    key={node.label}
                    onClick={() => addNode(node.type, { x: 300, y: 200 })}
                    className="flex flex-col items-center gap-3 w-[130px] h-[110px] bg-card/80 backdrop-blur border border-border rounded-xl hover:border-muted-foreground/40 transition-colors justify-center"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center ${node.color}`}>
                      <node.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-muted-foreground">{node.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </div>

      <NodePalette />

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-3 left-14 text-xs text-muted-foreground z-40 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Saving...
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-10 right-0 h-8 bg-toolbar/80 backdrop-blur border-t border-border z-40 flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded text-[11px] text-foreground">
            <span className="opacity-50">📄</span> Page 1
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
          <span>💬 Give feedback</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}
