import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

export default function AssistantDialogPage() {
  const { dialogId } = useParams<{ dialogId: string }>();
  return <Typography.Title level={2}>Диалог: {dialogId}</Typography.Title>;
}
