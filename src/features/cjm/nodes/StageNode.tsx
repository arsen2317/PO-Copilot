import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { theme, Typography, Tag } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { metricGroupsFixture } from '../../../data/fixtures/metrics';

const { Text } = Typography;

const ALL_METRICS = metricGroupsFixture.flatMap((g) => g.metrics);

export type StageNodeType = Node<{
  label: string; metric?: string;
  linkedMetricId?: string; linkedArtifactId?: string;
}, 'stage'>;

export default function StageNode({ data }: NodeProps<StageNodeType>) {
  const { token } = theme.useToken();
  const linkedMetric = data.linkedMetricId
    ? ALL_METRICS.find((m) => m.id === data.linkedMetricId)
    : null;

  return (
    <div
      style={{
        width: 220,
        background: token.colorBgElevated,
        border: `1.5px solid ${token.colorPrimary}`,
        borderRadius: token.borderRadiusLG,
        padding: '10px 14px',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: token.colorPrimary, border: 'none', width: 8, height: 8 }}
      />
      <Text style={{
        display: 'block', fontSize: 10, color: token.colorPrimary,
        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4,
      }}>
        Этап
      </Text>
      <Text strong style={{ display: 'block', fontSize: 13, color: token.colorText, lineHeight: 1.35 }}>
        {data.label}
      </Text>
      {data.metric && (
        <Text style={{ display: 'block', fontSize: 11, color: token.colorTextSecondary, marginTop: 6 }}>
          {data.metric}
        </Text>
      )}
      {linkedMetric && (
        <Tag
          icon={<ExperimentOutlined />}
          style={{ marginTop: 8, fontSize: 10, background: 'transparent', borderColor: token.colorPrimary, color: token.colorPrimary }}
        >
          {linkedMetric.name}: {linkedMetric.currentQuarter.toLocaleString('ru')} {linkedMetric.unit}
        </Tag>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: token.colorPrimary, border: 'none', width: 8, height: 8 }}
      />
    </div>
  );
}
