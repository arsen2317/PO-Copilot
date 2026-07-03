import { type Node, type NodeProps } from '@xyflow/react';
import { theme, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type PainNodeType = Node<{ label: string }, 'pain'>;

export default function PainNode({ data }: NodeProps<PainNodeType>) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        width: 220,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeft: `3px solid ${token.colorError}`,
        borderRadius: token.borderRadiusLG,
        padding: '10px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <ExclamationCircleOutlined style={{ fontSize: 11, color: token.colorError }} />
        <Text
          style={{
            fontSize: 10,
            color: token.colorError,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          Боль
        </Text>
      </div>
      <Text style={{ fontSize: 12, color: token.colorText, lineHeight: 1.4 }}>
        {data.label}
      </Text>
    </div>
  );
}
