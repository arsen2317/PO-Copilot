import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>();
  return <Typography.Title level={2}>Задача: {taskId}</Typography.Title>;
}
