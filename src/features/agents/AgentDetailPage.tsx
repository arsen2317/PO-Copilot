import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  return <Typography.Title level={2}>Агент: {agentId}</Typography.Title>;
}
