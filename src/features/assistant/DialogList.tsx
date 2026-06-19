import { Badge, Button, Flex, List, Skeleton, Tabs, theme, Typography } from 'antd';
import {
  MessageOutlined,
  PlusOutlined,
  TeamOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDialogs } from '../../data/api/assistant';
import type { Dialog, DialogType } from '../../data/types';

const { useToken } = theme;

const TYPE_ICON: Record<DialogType, React.ReactNode> = {
  personal: <MessageOutlined />,
  group: <TeamOutlined />,
  task: <LinkOutlined />,
};

interface Props {
  activeId: string | undefined;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function DialogItem({ dialog, active }: { dialog: Dialog; active: boolean }) {
  const { token } = useToken();
  const navigate = useNavigate();

  return (
    <List.Item
      onClick={() => void navigate(`/assistant/${dialog.id}`)}
      style={{
        padding: '10px 16px',
        cursor: 'pointer',
        background: active ? token.colorPrimaryBg : 'transparent',
        borderLeft: active ? `3px solid ${token.colorPrimary}` : '3px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      <List.Item.Meta
        avatar={
          <Badge count={dialog.unread} size="small">
            <span style={{ fontSize: 16, color: active ? token.colorText : token.colorTextSecondary }}>
              {TYPE_ICON[dialog.type]}
            </span>
          </Badge>
        }
        title={
          <Flex justify="space-between" align="center">
            <Typography.Text
              ellipsis
              style={{ fontSize: 13, fontWeight: dialog.unread ? 600 : 400, maxWidth: 140 }}
            >
              {dialog.title}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
              {timeLabel(dialog.time)}
            </Typography.Text>
          </Flex>
        }
        description={
          <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
            {dialog.lastMessage}
          </Typography.Text>
        }
      />
    </List.Item>
  );
}

export default function DialogList({ activeId }: Props) {
  const { token } = useToken();
  const { data, isLoading } = useQuery({ queryKey: ['dialogs'], queryFn: getDialogs });

  const personal = data?.filter((d) => d.type === 'personal') ?? [];
  const groups = data?.filter((d) => d.type === 'group') ?? [];
  const tasks = data?.filter((d) => d.type === 'task') ?? [];

  const renderList = (items: Dialog[]) =>
    isLoading ? (
      <Skeleton active paragraph={{ rows: 3 }} style={{ padding: '12px 16px' }} />
    ) : (
      <List
        dataSource={items}
        renderItem={(d) => <DialogItem dialog={d} active={d.id === activeId} />}
        locale={{ emptyText: 'Нет диалогов' }}
      />
    );

  return (
    <Flex
      vertical
      style={{
        width: 280,
        flexShrink: 0,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Flex
        justify="space-between"
        align="center"
        style={{ padding: '12px 16px', borderBottom: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Typography.Text strong>Диалоги</Typography.Text>
        <Button type="primary" size="small" icon={<PlusOutlined />}>
          Новый
        </Button>
      </Flex>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Tabs
          size="small"
          style={{ paddingLeft: 8 }}
          items={[
            { key: 'personal', label: 'Личные', children: renderList(personal) },
            { key: 'group', label: 'Группы', children: renderList(groups) },
            { key: 'task', label: 'Задачи', children: renderList(tasks) },
          ]}
        />
      </div>
    </Flex>
  );
}
