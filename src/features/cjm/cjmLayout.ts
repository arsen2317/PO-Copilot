import type { CjmFlowNode, CjmFlowEdge, CjmNodeData, CjmNodeType } from '../../data/types';

// ────────────────────────────────────────────────────────────────────────────────
// Shared CJM canvas layout — single source of truth for column/row geometry.
// Used by CjmCanvasPage (rendering + "add stage") and tools.ts (AI-driven creation).
// ────────────────────────────────────────────────────────────────────────────────

export const COL = 280;

export const ROW_Y: Record<CjmNodeType, number> = {
  stage:       0,
  touchpoint:  200,
  emotion:     420,
  pain:        640,
  opportunity: 860,
};

// Vertical offset from a row's node y to its row-label y (label sits above the node top).
const LABEL_OFFSET = 16;

export const ROW_LABELS: { label: string; y: number }[] = [
  { label: 'Этап',           y: ROW_Y.stage       + LABEL_OFFSET },
  { label: 'Touchpoint',     y: ROW_Y.touchpoint  + LABEL_OFFSET },
  { label: 'Мысли / эмоции', y: ROW_Y.emotion     + LABEL_OFFSET },
  { label: 'Боли',           y: ROW_Y.pain        + LABEL_OFFSET },
  { label: 'Возможности',    y: ROW_Y.opportunity + LABEL_OFFSET },
];

// Max rendered node height: rows are 200px apart at the tightest gap (stage → touchpoint),
// keep every node under this so long AI-generated text never overlaps the next row.
export const NODE_MAX_HEIGHT = 176;

// ── Simplified per-stage template consumed by the CJM AI agent ─────────────────
// The agent only supplies content per row; ids/positions/edges are computed here.

export interface CjmStageInput {
  label: string;
  metric?: string;
  linkedMetricId?: string;
  touchpoint?: { label: string; channel?: string };
  emotion?: { label: string; sentiment?: 'positive' | 'neutral' | 'negative' };
  pain?: { label: string; linkedArtifactId?: string };
  opportunity?: { label: string; linkedArtifactId?: string };
}

function buildRowData(type: CjmNodeType, stage: CjmStageInput): CjmNodeData {
  switch (type) {
    case 'stage': {
      const data: CjmNodeData = { label: stage.label || '—' };
      if (stage.metric) data.metric = stage.metric;
      if (stage.linkedMetricId) data.linkedMetricId = stage.linkedMetricId;
      return data;
    }
    case 'touchpoint': {
      const data: CjmNodeData = { label: stage.touchpoint?.label || '—' };
      if (stage.touchpoint?.channel) data.channel = stage.touchpoint.channel;
      return data;
    }
    case 'emotion': {
      const data: CjmNodeData = { label: stage.emotion?.label || '—' };
      if (stage.emotion?.sentiment) data.sentiment = stage.emotion.sentiment;
      return data;
    }
    case 'pain': {
      const data: CjmNodeData = { label: stage.pain?.label || '—' };
      if (stage.pain?.linkedArtifactId) data.linkedArtifactId = stage.pain.linkedArtifactId;
      return data;
    }
    case 'opportunity': {
      const data: CjmNodeData = { label: stage.opportunity?.label || '—' };
      if (stage.opportunity?.linkedArtifactId) data.linkedArtifactId = stage.opportunity.linkedArtifactId;
      return data;
    }
  }
}

/** Builds the 5 nodes (stage + 4 child rows) for a single stage at the given column index. */
export function buildStageNodes(mapId: string, index: number, stage: CjmStageInput): CjmFlowNode[] {
  const x = index * COL;
  const types: CjmNodeType[] = ['stage', 'touchpoint', 'emotion', 'pain', 'opportunity'];
  return types.map((type) => ({
    id: `${mapId}-${type}-${index + 1}`,
    type,
    position: { x, y: ROW_Y[type] },
    data: buildRowData(type, stage),
  }));
}

/** Builds a sequential edge chain across stage nodes. */
export function buildStageEdges(mapId: string, stageNodeIds: string[]): CjmFlowEdge[] {
  const edges: CjmFlowEdge[] = [];
  for (let i = 0; i < stageNodeIds.length - 1; i++) {
    edges.push({
      id: `${mapId}-edge-${i + 1}`,
      source: stageNodeIds[i]!,
      target: stageNodeIds[i + 1]!,
    });
  }
  return edges;
}

/** Builds the full nodes/edges graph for a CJM from a simplified per-stage template. */
export function buildCjmFromTemplate(
  mapId: string,
  stages: CjmStageInput[],
): { nodes: CjmFlowNode[]; edges: CjmFlowEdge[] } {
  const nodes = stages.flatMap((stage, i) => buildStageNodes(mapId, i, stage));
  const stageNodeIds = nodes.filter((n) => n.type === 'stage').map((n) => n.id);
  const edges = buildStageEdges(mapId, stageNodeIds);
  return { nodes, edges };
}
