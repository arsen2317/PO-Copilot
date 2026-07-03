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
  type Node,
  type Edge,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { theme, Typography, Badge, Button, Breadcrumb, Tooltip, Spin } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, PlusOutlined } from '@ant-design/icons';

import { getCjmById } from '../../data/api/cjm';
import { useCjmStore } from '../../store/cjmStore';
import StageNode from './nodes/StageNode';
import TouchpointNode from './nodes/TouchpointNode';
import EmotionNode from './nodes/EmotionNode';
import PainNode from './nodes/PainNode';
import OpportunityNode from './nodes/OpportunityNode';
import CjmEditDrawer, { AddStageDrawer } from './CjmEditDrawer';
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

const ROW_LABELS = [
  { label: 'Этап',           top: 16 },
  { label: 'Touchpoint',     top: 186 },
  { label: 'Мысли / эмоции', top: 356 },
  { label: 'Боли',           top: 526 },
  { label: 'Возможности',    top: 696 },
];

const COL = 280;
const ROW_Y: Record<string, number> = {
  touchpoint:  170,
  emotion:     340,
  pain:        510,
  opportunity: 680,
};

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
    if (!id) return;
    // Ensure store has base nodes first
    if (!nodesState[id] && map) setMapNodes(id, map.nodes);
    updateNodeData(id, nodeId, data);
    // Update React Flow visual state immediately
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    );
  };

  const handleAddStage = (label: string) => {
    if (!id || !map) return;
    const cjmNodes = nodesState[id] ?? map.nodes;
    const cjmEdges = edgesState[id] ?? map.edges;

    // Find rightmost stage x position
    const stageNodes = cjmNodes.filter((n) => n.type === 'stage');
    const maxX = stageNodes.reduce((acc, n) => Math.max(acc, n.position.x), 0);
    const newX = maxX + COL;

    const newStageId = `${id}-stage-${Date.now()}`;
    const newNode: CjmFlowNode = {
      id: newStageId,
      type: 'stage',
      position: { x: newX, y: 0 },
      data: { label },
    };

    // Also add empty child nodes for the new stage
    const childNodes: CjmFlowNode[] = Object.entries(ROW_Y).map(([type, y]) => ({
      id: `${newStageId}-${type}`,
      type: type as CjmFlowNode['type'],
      position: { x: newX, y },
      data: { label: '—' },
    }));

    // Edge from last stage to new stage
    const lastStage = stageNodes[stageNodes.length - 1];
    const newEdge: CjmFlowEdge | null = lastStage
      ? { id: `${id}-e-${lastStage.id}-${newStageId}`, source: lastStage.id, target: newStageId }
      : null;

    const allNewNodes = [newNode, ...childNodes];
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
          <Tooltip title="ИИ-агент для актуализации CJM — скоро">
            <Button icon={<RobotOutlined />} disabled>
              Актуализировать с ИИ
            </Button>
          </Tooltip>
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

          <div
            style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: 0, pointerEvents: 'none', zIndex: 5,
            }}
          >
            {ROW_LABELS.map(({ label, top }) => (
              <div
                key={label}
                style={{
                  position: 'absolute', top, left: 8,
                  fontSize: 9, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  color: token.colorTextTertiary, whiteSpace: 'nowrap',
                  transform: 'translateY(-50%)',
                }}
              >
                {label}
              </div>
            ))}
          </div>
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
