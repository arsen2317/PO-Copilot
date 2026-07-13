import { type Node, type NodeProps } from '@xyflow/react';
import { theme, Typography, Tag } from 'antd';
import { BulbOutlined, LinkOutlined } from '../../../components/icons';
import { knowledgeFixtures } from '../../../data/fixtures/knowledge';
import { NODE_MAX_HEIGHT } from '../cjmLayout';

const { Text } = Typography;

export type OpportunityNodeType = Node<{ label: string; linkedArtifactId?: string }, 'opportunity'>;

export default function OpportunityNode({ data }: NodeProps<OpportunityNodeType>) {
  const { token } = theme.useToken();
  const artifact = data.linkedArtifactId
    ? knowledgeFixtures.find((a) => a.id === data.linkedArtifactId)
    : null;

  return (
    <div
      style={{
        width: 220,
        maxHeight: NODE_MAX_HEIGHT,
        overflow: 'hidden',
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeft: `3px solid ${token.colorSuccess}`,
        borderRadius: token.borderRadiusLG,
        padding: '10px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <BulbOutlined style={{ fontSize: 11, color: token.colorSuccess }} />
        <Text style={{ fontSize: 10, color: token.colorSuccess, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Возможность
        </Text>
      </div>
      <Text style={{
        display: '-webkit-box', fontSize: 12, color: token.colorText, lineHeight: 1.4,
        WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {data.label}
      </Text>
      {artifact && (
        <Tag
          icon={<LinkOutlined />}
          style={{ marginTop: 8, fontSize: 10, background: 'transparent', borderColor: token.colorSuccess, color: token.colorSuccess, cursor: 'pointer', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {artifact.title}
        </Tag>
      )}
    </div>
  );
}
