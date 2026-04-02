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
import { supabase } from '@/integrations/supabase/client';

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
  projectId: string | null;
  saving: boolean;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (type: SpaceNodeData['type'], position?: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Partial<SpaceNodeData>) => void;
  setPaletteOpen: (open: boolean) => void;
  setProjectName: (name: string) => void;
  loadProject: (projectId: string) => Promise<void>;
  saveProject: () => Promise<void>;
};

const nodeLabels: Record<string, string> = {
  creation: 'Creation',
  'image-generator': 'Image Generator',
  'video-generator': 'Video Generator',
  text: 'Text',
  assistant: 'Assistant',
  upscaler: 'Image Upscaler',
};

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const debouncedSave = (save: () => Promise<void>) => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => save(), 1500);
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  nodeCounter: {},
  paletteOpen: false,
  projectName: 'Untitled Space',
  projectId: null,
  saving: false,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<SpaceNodeData>[] });
    if (get().projectId) debouncedSave(get().saveProject);
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    if (get().projectId) debouncedSave(get().saveProject);
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
    if (get().projectId) debouncedSave(get().saveProject);
  },

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

    if (get().projectId) debouncedSave(get().saveProject);
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
    if (get().projectId) debouncedSave(get().saveProject);
  },

  setPaletteOpen: (open) => set({ paletteOpen: open }),

  setProjectName: (name) => {
    set({ projectName: name });
    const pid = get().projectId;
    if (pid) {
      supabase.from('spaces_projects').update({ name }).eq('id', pid);
    }
  },

  loadProject: async (projectId: string) => {
    // Load project info
    const { data: project } = await supabase
      .from('spaces_projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle();

    if (!project) return;

    // Load nodes
    const { data: nodesData } = await supabase
      .from('spaces_nodes')
      .select('*')
      .eq('project_id', projectId);

    // Load edges
    const { data: edgesData } = await supabase
      .from('spaces_edges')
      .select('*')
      .eq('project_id', projectId);

    const nodes: Node<SpaceNodeData>[] = (nodesData || []).map((n: any) => ({
      id: n.node_id,
      type: n.node_type,
      position: { x: n.position_x, y: n.position_y },
      data: n.node_data as SpaceNodeData,
    }));

    const edges: Edge[] = (edgesData || []).map((e: any) => ({
      id: e.edge_id,
      source: e.source_node,
      target: e.target_node,
      sourceHandle: e.source_handle,
      targetHandle: e.target_handle,
    }));

    // Build counter from existing nodes
    const counter: Record<string, number> = {};
    nodes.forEach((n) => {
      const d = n.data as SpaceNodeData;
      const match = n.id.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        counter[d.type] = Math.max(counter[d.type] || 0, num);
      }
    });

    set({
      projectId,
      projectName: (project as any).name || 'Untitled Space',
      nodes,
      edges,
      nodeCounter: counter,
    });
  },

  saveProject: async () => {
    const { projectId, nodes, edges } = get();
    if (!projectId) return;

    set({ saving: true });

    // Update project timestamp
    await supabase.from('spaces_projects').update({ updated_at: new Date().toISOString() }).eq('id', projectId);

    // Delete old nodes/edges and re-insert
    await supabase.from('spaces_nodes').delete().eq('project_id', projectId);
    await supabase.from('spaces_edges').delete().eq('project_id', projectId);

    if (nodes.length > 0) {
      await supabase.from('spaces_nodes').insert(
        nodes.map((n) => ({
          project_id: projectId,
          node_id: n.id,
          node_type: n.type || 'creation',
          position_x: n.position.x,
          position_y: n.position.y,
          node_data: n.data as any,
        }))
      );
    }

    if (edges.length > 0) {
      await supabase.from('spaces_edges').insert(
        edges.map((e) => ({
          project_id: projectId,
          edge_id: e.id,
          source_node: e.source,
          target_node: e.target,
          source_handle: e.sourceHandle || null,
          target_handle: e.targetHandle || null,
        }))
      );
    }

    set({ saving: false });
  },
}));
