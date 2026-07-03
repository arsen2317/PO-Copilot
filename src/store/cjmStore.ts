import { create } from 'zustand';
import type { CjmMap, CjmFlowNode, CjmFlowEdge } from '../data/types';

interface CjmState {
  // AI-generated maps (full maps, session-only)
  generatedMaps: CjmMap[];
  addGeneratedMap: (map: CjmMap) => void;
  updateMap: (id: string, updates: Partial<CjmMap>) => void;
  removeMap: (id: string) => void;

  // Per-map node/edge overrides (for edits to fixture maps and generated maps)
  nodesState: Record<string, CjmFlowNode[]>;
  edgesState: Record<string, CjmFlowEdge[]>;
  setMapNodes: (mapId: string, nodes: CjmFlowNode[]) => void;
  setMapEdges: (mapId: string, edges: CjmFlowEdge[]) => void;
  updateNodeData: (mapId: string, nodeId: string, data: Partial<CjmFlowNode['data']>) => void;
  addStage: (mapId: string, node: CjmFlowNode, edge: CjmFlowEdge | null) => void;
}

export const useCjmStore = create<CjmState>((set) => ({
  generatedMaps: [],
  addGeneratedMap: (map) =>
    set((state) => ({ generatedMaps: [map, ...state.generatedMaps] })),
  updateMap: (id, updates) =>
    set((state) => ({
      generatedMaps: state.generatedMaps.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    })),
  removeMap: (id) =>
    set((state) => ({
      generatedMaps: state.generatedMaps.filter((m) => m.id !== id),
    })),

  nodesState: {},
  edgesState: {},

  setMapNodes: (mapId, nodes) =>
    set((state) => ({ nodesState: { ...state.nodesState, [mapId]: nodes } })),

  setMapEdges: (mapId, edges) =>
    set((state) => ({ edgesState: { ...state.edgesState, [mapId]: edges } })),

  updateNodeData: (mapId, nodeId, data) =>
    set((state) => {
      const nodes = state.nodesState[mapId];
      if (!nodes) return {};
      return {
        nodesState: {
          ...state.nodesState,
          [mapId]: nodes.map((n) =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
          ),
        },
      };
    }),

  addStage: (mapId, node, edge) =>
    set((state) => {
      const nodes = state.nodesState[mapId] ?? [];
      const edges = state.edgesState[mapId] ?? [];
      return {
        nodesState: { ...state.nodesState, [mapId]: [...nodes, node] },
        edgesState: {
          ...state.edgesState,
          [mapId]: edge ? [...edges, edge] : edges,
        },
      };
    }),
}));
