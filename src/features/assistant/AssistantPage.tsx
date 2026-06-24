import { useParams } from 'react-router-dom';
import DialogList from './DialogList';
import MessageFeed from './MessageFeed';
import ContextPanel from './ContextPanel';

const HEADER_H = 64;
const CONTENT_PADDING = 24;
const PAGE_HEIGHT = `calc(100vh - ${HEADER_H}px - ${CONTENT_PADDING * 2}px)`;

export default function AssistantPage() {
  const { dialogId } = useParams<{ dialogId?: string }>();

  return (
    <div
      className="flex overflow-hidden rounded-lg border border-border bg-card"
      style={{ height: PAGE_HEIGHT, margin: -CONTENT_PADDING }}
    >
      <DialogList activeId={dialogId} />
      <MessageFeed dialogId={dialogId} />
      <ContextPanel dialogId={dialogId} />
    </div>
  );
}
