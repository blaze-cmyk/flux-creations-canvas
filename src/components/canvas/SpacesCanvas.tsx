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
import { LeftToolbar } from './LeftToolbar';
import { TopBar } from './TopBar';
import { NodePalette } from './NodePalette';
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const nodeTypes: NodeTypes = {
  creation: CreationNode,
  'image-generator': ImageGeneratorNode,
  'video-generator': VideoGeneratorNode,
  'text-node': TextNode,
};

export function SpacesCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, setPaletteOpen, loadProject, saving } = useCanvasStore();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const onPaneDoubleClick = useCallback(() => {
    setPaletteOpen(true);
  }, [setPaletteOpen]);

  return (
    <div className="w-screen h-screen bg-canvas overflow-hidden">
      <TopBar />
      <LeftToolbar />

      <div className="absolute inset-0 ml-10 mt-10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onPaneClick={() => setPaletteOpen(false)}
          onDoubleClick={onPaneDoubleClick}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
          }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="hsl(0 0% 15%)" />
        </ReactFlow>
      </div>

      <NodePalette />

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-3 left-14 text-xs text-muted-foreground z-40 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Saving...
        </div>
      )}

      <div className="fixed bottom-3 right-3 text-xs text-muted-foreground z-40">
        70%
      </div>
    </div>
  );
}
