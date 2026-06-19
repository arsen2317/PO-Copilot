import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

export default function ArtifactDetailPage() {
  const { artifactId } = useParams<{ artifactId: string }>();
  return <Typography.Title level={2}>Артефакт: {artifactId}</Typography.Title>;
}
