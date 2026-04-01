import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';

export type SpaceNodeData = {
  label: string;
  type: 'creation' | 'image-generator' | 'video-generator' | 'text' | 'assistant' | 'upscaler';
  status: 'idle' | 'running' | 'complete' | 'error';
  prompt?: string;
  model?: string;
  imageUrl?: string;
  videoUrl?: string;
  text?: string;
  aspectRatio?: string;
};

type CanvasState = {
  nodes: Node<SpaceNodeData>[];
  edges: Edge[];
  nodeCounter: Record<string, number>;
  paletteOpen: boolean;
  projectName: string;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: SpaceNodeData['type'], position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<SpaceNodeData>) => void;
  setPaletteOpen: (open: boolean) => void;
  setProjectName: (name: string) => void;
};

const defaultNodes: Node<SpaceNodeData>[] = [
  {
    id: 'creation-1',
    type: 'creation',
    position: { x: 100, y: 150 },
    data: {
      label: 'Creation #1',
      type: 'creation',
      status: 'complete',
      imageUrl: '',
      text: 'Life only starts once you\nstart moving in silence\n\nIf you seek constant\napplause, you are no more\nthan a performer',
    },
  },
  {
    id: 'image-gen-1',
    type: 'image-generator',
    position: { x: 550, y: 100 },
    data: {
      label: 'Image Generator #1',
      type: 'image-generator',
      status: 'idle',
      model: 'flux-dev',
      aspectRatio: '1:1',
    },
  },
  {
    id: 'video-gen-1',
    type: 'video-generator',
    position: { x: 550, y: 450 },
    data: {
      label: 'Video Generator #1',
      type: 'video-generator',
      status: 'idle',
      model: 'kling-v2',
      aspectRatio: '16:9',
    },
  },
];

const defaultEdges: Edge[] = [
  { id: 'e1-2', source: 'creation-1', target: 'image-gen-1', sourceHandle: 'img-out', targetHandle: 'img-in' },
  { id: 'e1-3', source: 'creation-1', target: 'video-gen-1', sourceHandle: 'img-out-2', targetHandle: 'img-in' },
];

const nodeLabels: Record<string, string> = {
  creation: 'Creation',
  'image-generator': 'Image Generator',
  'video-generator': 'Video Generator',
  text: 'Text',
  assistant: 'Assistant',
  upscaler: 'Image Upscaler',
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: defaultNodes,
  edges: defaultEdges,
  nodeCounter: { creation: 1, 'image-generator': 1, 'video-generator': 1, text: 0, assistant: 0, upscaler: 0 },
  paletteOpen: false,
  projectName: 'Dynamic Video Creation Studio',

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),

  addNode: (type, position) => {
    const counter = get().nodeCounter;
    const newCount = (counter[type] || 0) + 1;
    const label = `${nodeLabels[type]} #${newCount}`;
    const id = `${type}-${newCount}`;
    const pos = position || { x: 300 + Math.random() * 200, y: 200 + Math.random() * 200 };

    const newNode: Node<SpaceNodeData> = {
      id,
      type: type === 'creation' ? 'creation' : type === 'image-generator' ? 'image-generator' : type === 'video-generator' ? 'video-generator' : type === 'text' ? 'text-node' : type,
      position: pos,
      data: { label, type, status: 'idle', model: type === 'image-generator' ? 'flux-dev' : type === 'video-generator' ? 'kling-v2' : undefined, aspectRatio: '1:1' },
    };

    set({
      nodes: [...get().nodes, newNode],
      nodeCounter: { ...counter, [type]: newCount },
      paletteOpen: false,
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
  },

  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setProjectName: (name) => set({ projectName: name }),
}));
