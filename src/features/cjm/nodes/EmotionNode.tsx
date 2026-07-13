import { type Node, type NodeProps } from '@xyflow/react';
import { theme, Typography } from 'antd';
import { NODE_MAX_HEIGHT } from '../cjmLayout';

const { Text } = Typography;

export type EmotionNodeType = Node<
  { label: string; sentiment?: 'positive' | 'neutral' | 'negative' },
  'emotion'
>;

export default function EmotionNode({ data }: NodeProps<EmotionNodeType>) {
  const { token } = theme.useToken();

  const accentColor =
    data.sentiment === 'positive'
      ? token.colorSuccess
      : data.sentiment === 'negative'
        ? token.colorWarning
        : token.colorTextTertiary;

  return (
    <div
      style={{
        width: 220,
        maxHeight: NODE_MAX_HEIGHT,
        overflow: 'hidden',
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: token.borderRadiusLG,
        padding: '10px 14px',
      }}
    >
      <Text
        style={{
          fontSize: 10,
          color: accentColor,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          display: 'block',
          marginBottom: 6,
        }}
      >
        Мысли / эмоции
      </Text>
      <Text style={{
        display: '-webkit-box', fontSize: 12, color: token.colorText, lineHeight: 1.4,
        WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {data.label}
      </Text>
    </div>
  );
}
