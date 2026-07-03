import { type Node, type NodeProps } from '@xyflow/react';
import { theme, Typography, Tag } from 'antd';
import { ApiOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type TouchpointNodeType = Node<{ label: string; channel?: string }, 'touchpoint'>;

export default function TouchpointNode({ data }: NodeProps<TouchpointNodeType>) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        width: 220,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '10px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <ApiOutlined style={{ fontSize: 11, color: token.colorTextTertiary }} />
        <Text
          style={{
            fontSize: 10,
            color: token.colorTextTertiary,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          Touchpoint
        </Text>
      </div>
      <Text style={{ display: 'block', fontSize: 12, color: token.colorText, lineHeight: 1.4 }}>
        {data.label}
      </Text>
      {data.channel && (
        <Tag
          style={{
            marginTop: 8,
            fontSize: 10,
            borderRadius: 4,
            background: token.colorFillSecondary,
            border: 'none',
            color: token.colorTextSecondary,
          }}
        >
          {data.channel}
        </Tag>
      )}
    </div>
  );
}
