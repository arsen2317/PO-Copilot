import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

export default function AIServiceDetailPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  return <Typography.Title level={2}>ИИ-сервис: {serviceId}</Typography.Title>;
}
