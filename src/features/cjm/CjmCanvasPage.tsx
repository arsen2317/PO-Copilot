import { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { theme, Typography, Badge, Button, Breadcrumb, Tooltip, Spin } from 'antd';
import { ArrowLeftOutlined, RobotOutlined } from '@ant-design/icons';

import { getCjmById } from '../../data/api/cjm';
import { useCjmStore } from '../../store/cjmStore';
import StageNode from './nodes/StageNode';
import TouchpointNode from './nodes/TouchpointNode';
import EmotionNode from './nodes/EmotionNode';
import PainNode from './nodes/PainNode';
import OpportunityNode from './nodes/OpportunityNode';
import type { CjmStatus } from '../../data/types';

const { Title, Text } = Typography;

// Defined outside component to avoid re-renders
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

// Row labels shown on the left legend
const ROW_LABELS = [
  { label: 'Этап',           top: 16 },
  { label: 'Touchpoint',     top: 186 },
  { label: 'Мысли / эмоции', top: 356 },
  { label: 'Боли',           top: 526 },
  { label: 'Возможности',    top: 696 },
];

export default function CjmCanvasPage() {
  const { token } = theme.useToken();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const generatedMaps = useCjmStore((s) => s.generatedMaps);

  const { data: fixtureMap, isLoading } = useQuery({
    queryKey: ['cjm', id],
    queryFn: () => getCjmById(id!),
    enabled: !!id,
  });

  const map = generatedMaps.find((m) => m.id === id) ?? fixtureMap;

  const onFitView = useCallback(() => {}, []);
  void onFitView;

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

  const nodes: Node[] = map.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
    draggable: false,
  }));

  const edgeArr: Edge[] = map.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: token.colorBorderSecondary, strokeWidth: 1.5 },
    animated: false,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { title: 'Аналитика' },
          { title: <span style={{ cursor: 'pointer' }} onClick={() => void navigate('/cjm')}>CJM</span> },
          { title: map.title },
        ]}
        style={{ fontSize: 12 }}
      />

      {/* Header */}
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
        <Tooltip title="ИИ-агент для актуализации CJM — скоро">
          <Button icon={<RobotOutlined />} disabled>
            Актуализировать с ИИ
          </Button>
        </Tooltip>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          height: 'calc(100vh - 220px)',
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'hidden',
          // React Flow CSS variable overrides for dark theme
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
          edges={edgeArr}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />

          {/* Row legend */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 0,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            {ROW_LABELS.map(({ label, top }) => (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  top,
                  left: 8,
                  fontSize: 9,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: token.colorTextTertiary,
                  whiteSpace: 'nowrap',
                  transform: 'translateY(-50%)',
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </ReactFlow>
      </div>
    </div>
  );
}
