import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useViewport,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { theme, Typography, Badge, Button, Breadcrumb, Spin } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, PlusOutlined } from '@ant-design/icons';

import { getCjmById } from '../../data/api/cjm';
import { useCjmStore } from '../../store/cjmStore';
import { useUIStore } from '../../store/uiStore';
import StageNode from './nodes/StageNode';
import TouchpointNode from './nodes/TouchpointNode';
import EmotionNode from './nodes/EmotionNode';
import PainNode from './nodes/PainNode';
import OpportunityNode from './nodes/OpportunityNode';
import CjmEditDrawer, { AddStageDrawer } from './CjmEditDrawer';
import { ROW_LABELS, buildStageNodes } from './cjmLayout';
import type { CjmStatus, CjmFlowNode, CjmFlowEdge, CjmNodeData } from '../../data/types';

const { Title, Text } = Typography;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: Record<string, React.ComponentType<any>> = {
  stage:       StageNode,
  touchpoint:  TouchpointNode,
  emotion:     EmotionNode,
  pain:        PainNode,
  opportunity: OpportunityNode,
};

const STATUS_LABELS: Record<CjmStatus, string> = {
  active:   'Активный',
  draft:    'Черновик',
  archived: 'Архив',
};

const STATUS_COLORS: Record<CjmStatus, 'success' | 'processing' | 'default'> = {
  active:   'success',
  draft:    'processing',
  archived: 'default',
};

// ── Row labels overlay — tracks the flow's pan/zoom so labels stay pinned to their row ──
function RowLabelsOverlay({ color }: { color: string }) {
  const viewport = useViewport();
  return (
    <div
      style={{
        position: 'absolute', inset: 0,
        pointerEvents: 'none', zIndex: 5, overflow: 'hidden',
      }}
    >
      {ROW_LABELS.map(({ label, x, y }) => (
        <div
          key={label}
          style={{
            position: 'absolute',
            left: viewport.x + x * viewport.zoom,
            top: viewport.y + y * viewport.zoom,
            fontSize: 9, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.5px',
            color, whiteSpace: 'nowrap',
            transform: 'translateY(-50%)',
          }}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

function toFlowNodes(cjmNodes: CjmFlowNode[]): Node[] {
  return cjmNodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
    draggable: false,
  }));
}

function toFlowEdges(cjmEdges: CjmFlowEdge[], strokeColor: string): Edge[] {
  return cjmEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: strokeColor, strokeWidth: 1.5 },
  }));
}

export default function CjmCanvasPage() {
  const { token } = theme.useToken();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    generatedMaps, nodesState, edgesState,
    setMapNodes, setMapEdges, updateNodeData, addStage,
  } = useCjmStore();
  const setPendingAgent = useUIStore((s) => s.setPendingAgent);
  const setPendingTrigger = useUIStore((s) => s.setPendingTrigger);

  const { data: fixtureMap, isLoading } = useQuery({
    queryKey: ['cjm', id],
    queryFn: () => getCjmById(id!),
    enabled: !!id,
  });

  const map = generatedMaps.find((m) => m.id === id) ?? fixtureMap;

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedNode, setSelectedNode] = useState<CjmFlowNode | null>(null);
  const [addStageOpen, setAddStageOpen] = useState(false);

  // Initialise React Flow state from store overrides or fixture
  useEffect(() => {
    if (!map || !id) return;
    const cjmNodes = nodesState[id] ?? map.nodes;
    const cjmEdges = edgesState[id] ?? map.edges;
    setNodes(toFlowNodes(cjmNodes));
    setEdges(toFlowEdges(cjmEdges, token.colorBorderSecondary));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map?.id]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (!map || !id) return;
    const cjmNodes = nodesState[id] ?? map.nodes;
    const cjmNode = cjmNodes.find((n) => n.id === node.id);
    if (cjmNode) setSelectedNode(cjmNode);
  };

  const handleSave = (nodeId: string, data: Partial<CjmNodeData>) => {
    if (!id || !map) return;
    // Ensure store has base nodes first
    if (!nodesState[id]) setMapNodes(id, map.nodes);
    updateNodeData(id, nodeId, data);
    // Update React Flow visual state immediately
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    );

    // If the user just linked (or changed) an artifact, ask the CJM agent to review it:
    // check the artifact is actually relevant/fresh, then either update the node text or
    // recommend unlinking — rather than blindly trusting the manual link.
    const prevArtifactId = selectedNode?.data.linkedArtifactId;
    const nextArtifactId = data.linkedArtifactId;
    if (nextArtifactId && nextArtifactId !== prevArtifactId) {
      const nodeLabel = data.label ?? selectedNode?.data.label ?? '';
      const nodeType = selectedNode?.type ?? '';
      setPendingAgent('agent-cjm');
      setPendingTrigger(
        `Проверь привязку артефакта (id: ${nextArtifactId}) к пункту "${nodeLabel}" ` +
        `(нода id: ${nodeId}, тип: ${nodeType}) в CJM "${map.title}" (id: ${id}). ` +
        `Это ручная привязка от пользователя — найди артефакт через get_knowledge_artifacts и оцени, ` +
        `действительно ли он релевантен и актуален для этого пункта CJM. Если нет — объясни почему в чате ` +
        `и предложи отвязать. Если да — обнови текст пункта через update_cjm (nodeUpdates), кратко (не более 2-3 предложений), ` +
        `сохранив linkedArtifactId.`,
      );
    }
  };

  const handleAddStage = (label: string) => {
    if (!id || !map) return;
    const cjmNodes = nodesState[id] ?? map.nodes;
    const cjmEdges = edgesState[id] ?? map.edges;

    const stageNodes = cjmNodes.filter((n) => n.type === 'stage');
    const newIndex = stageNodes.length;

    const allNewNodes = buildStageNodes(id, newIndex, { label });
    const newNode = allNewNodes.find((n) => n.type === 'stage')!;

    // Edge from last stage to new stage (unique id — avoids colliding with template-built edges)
    const lastStage = stageNodes[stageNodes.length - 1];
    const newEdge: CjmFlowEdge | null = lastStage
      ? { id: `${id}-e-${lastStage.id}-${newNode.id}`, source: lastStage.id, target: newNode.id }
      : null;

    const newCjmNodes = [...cjmNodes, ...allNewNodes];
    const newCjmEdges = newEdge ? [...cjmEdges, newEdge] : cjmEdges;

    setMapNodes(id, newCjmNodes);
    setMapEdges(id, newCjmEdges);

    // Update React Flow state
    setNodes((prev) => [...prev, ...toFlowNodes(allNewNodes)]);
    if (newEdge) {
      setEdges((prev) => [...prev, ...toFlowEdges([newEdge], token.colorBorderSecondary)]);
    }
    addStage(id, newNode, newEdge);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin />
      </div>
    );
  }

  if (!map) {
    return (
      <div style={{ padding: 24 }}>
        <Text type="secondary">CJM не найден.</Text>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <Breadcrumb
        items={[
          { title: 'Аналитика' },
          { title: <span style={{ cursor: 'pointer' }} onClick={() => void navigate('/cjm')}>CJM</span> },
          { title: map.title },
        ]}
        style={{ fontSize: 12 }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => void navigate('/cjm')}
            style={{ color: token.colorTextSecondary }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Title level={4} style={{ margin: 0, color: token.colorText }}>
                {map.title}
              </Title>
              <Badge status={STATUS_COLORS[map.status]} text={STATUS_LABELS[map.status]} />
            </div>
            <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
              Персона: {map.persona}
            </Text>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<PlusOutlined />} onClick={() => setAddStageOpen(true)}>
            Добавить этап
          </Button>
          <Button
            icon={<RobotOutlined />}
            onClick={() => {
              setPendingAgent('agent-cjm');
              setPendingTrigger(`Актуализируй CJM "${map.title}" (id: ${id ?? ''}) и предложи изменения. Исследуй артефакты базы знаний, воронку и метрики, подумай что можно улучшить, и выведи предложения.`);
            }}
          >
            Актуализировать с ИИ
          </Button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          height: 'calc(100vh - 220px)',
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'hidden',
          ['--xy-background-color-default' as string]: token.colorBgContainer,
          ['--xy-background-pattern-color-default' as string]: token.colorBorderSecondary,
          ['--xy-edge-stroke-default' as string]: token.colorBorderSecondary,
          ['--xy-handle-background-color-default' as string]: token.colorPrimary,
          ['--xy-controls-button-background-color' as string]: token.colorBgElevated,
          ['--xy-controls-button-color' as string]: token.colorTextSecondary,
          ['--xy-controls-button-border-color' as string]: token.colorBorderSecondary,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />

          <RowLabelsOverlay color={token.colorTextTertiary} />
        </ReactFlow>
      </div>

      <CjmEditDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onSave={handleSave}
      />

      <AddStageDrawer
        open={addStageOpen}
        onClose={() => setAddStageOpen(false)}
        onAdd={handleAddStage}
      />
    </div>
  );
}
