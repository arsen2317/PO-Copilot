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
      }}
    >
      <DialogList activeId={dialogId} />
      <MessageFeed dialogId={dialogId} />
      <ContextPanel dialogId={dialogId} />
    </Flex>
  );
}
