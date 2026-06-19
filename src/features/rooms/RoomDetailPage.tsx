import { Typography } from 'antd';
import { useParams } from 'react-router-dom';

export default function RoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  return <Typography.Title level={2}>Комната: {roomId}</Typography.Title>;
}
