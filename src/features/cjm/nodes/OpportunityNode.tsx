import { type Node, type NodeProps } from '@xyflow/react';
import { theme, Typography } from 'antd';
import { BulbOutlined } from '@ant-design/icons';

const { Text } = Typography;

export type OpportunityNodeType = Node<{ label: string }, 'opportunity'>;

export default function OpportunityNode({ data }: NodeProps<OpportunityNodeType>) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        width: 220,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeft: `3px solid ${token.colorSuccess}`,
        borderRadius: token.borderRadiusLG,
        padding: '10px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <BulbOutlined style={{ fontSize: 11, color: token.colorSuccess }} />
        <Text
          style={{
            fontSize: 10,
            color: token.colorSuccess,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
          }}
        >
          Возможность
        </Text>
      </div>
      <Text style={{ fontSize: 12, color: token.colorText, lineHeight: 1.4 }}>
        {data.label}
      </Text>
    </div>
  );
}
