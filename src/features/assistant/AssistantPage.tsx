import { Flex, theme } from 'antd';
import { useParams } from 'react-router-dom';
import DialogList from './DialogList';
import MessageFeed from './MessageFeed';
import ContextPanel from './ContextPanel';

const { useToken } = theme;

const HEADER_H = 64;
const CONTENT_PADDING = 24;
const PAGE_HEIGHT = `calc(100vh - ${HEADER_H}px - ${CONTENT_PADDING * 2}px)`;

export default function AssistantPage() {
  const { token } = useToken();
  const { dialogId } = useParams<{ dialogId?: string }>();

  return (
    <Flex
      style={{
        height: PAGE_HEIGHT,
        margin: -CONTENT_PADDING,
        background: token.colorBgContainer,
        borderRadius: token.borderRadius,
        overflow: 'hidden',
        border: `1px solid ${token.colorBorderSecondary}`,
        position: 'relative',
      }}
    >
      {/* Background glow — starts after history sidebar (~220px), opacity 40% */}
      <div style={{
        position: 'absolute', left: 220, right: 0, bottom: '-8%',
        height: '55%',
        background: 'radial-gradient(ellipse at 50% 100%, #1a3a8a 0%, #0a1f5c 40%, transparent 70%)',
        filter: 'blur(72px)', pointerEvents: 'none', zIndex: 0, opacity: 0.5,
      }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', minWidth: 0, minHeight: 0 }}>
        <DialogList activeId={dialogId} />
        <MessageFeed dialogId={dialogId} />
        <ContextPanel dialogId={dialogId} />
      </div>
    </Flex>
  );
}
