import { Badge, Button, Card, List, Skeleton, theme, Typography } from 'antd';
import {
  AlertOutlined,
  BulbOutlined,
  CommentOutlined,
  RightOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getNotifications } from '../../../data/api/notifications';
import type { Notification, NotificationType } from '../../../data/types';

const { useToken } = theme;

const TYPE_META: Record<NotificationType, { icon: React.ReactNode; label: string }> = {
  incident: { icon: <AlertOutlined />, label: 'Инцидент' },
  agent: { icon: <BulbOutlined />, label: 'Агент' },
  mention: { icon: <CommentOutlined />, label: 'Упоминание' },
  'service-result': { icon: <StarOutlined />, label: 'Сервис' },
};

function NotificationItem({ item }: { item: Notification }) {
  const { token } = useToken();
  const meta = TYPE_META[item.type];
  const timeLabel = new Date(item.time).toLocaleString('ru', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });

  return (
    <List.Item style={{ padding: '8px 0', borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
      <List.Item.Meta
        avatar={
          <Badge dot={!item.isRead} offset={[-2, 2]}>
            <Typography.Text type="secondary">{meta.icon}</Typography.Text>
          </Badge>
        }
        title={
          <Typography.Text
            style={{ fontSize: 13, fontWeight: item.isRead ? 400 : 600 }}
            ellipsis
          >
            {item.title}
          </Typography.Text>
        }
        description={
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            {meta.label} · {timeLabel}
          </Typography.Text>
        }
      />
    </List.Item>
  );
}

export default function RecentNotificationsWidget() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const recent = data?.slice(0, 4);

  return (
    <Card
      title="Последние уведомления"
      extra={
        <Button
          type="link"
          size="small"
          icon={<RightOutlined />}
          iconPosition="end"
          onClick={() => void navigate('/notifications')}
          style={{ padding: 0 }}
        >
          Все уведомления
        </Button>
      }
      styles={{ body: { padding: '0 16px' } }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} style={{ padding: '12px 0' }} />
      ) : (
        <List
          dataSource={recent ?? []}
          renderItem={(item) => <NotificationItem item={item} />}
          locale={{ emptyText: 'Нет уведомлений' }}
        />
      )}
    </Card>
  );
}
