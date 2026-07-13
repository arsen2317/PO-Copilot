import { Avatar, Button, Divider, Flex, Skeleton, Tag, theme, Typography } from 'antd';
import {
  LinkOutlined,
  PaperClipOutlined,
  ProductOutlined,
  UserOutlined,
} from '../../components/icons';
import { useQuery } from '@tanstack/react-query';
import { getDialogById } from '../../data/api/assistant';

const { useToken } = theme;

interface Props {
  dialogId: string | undefined;
}

export default function ContextPanel({ dialogId }: Props) {
  const { token } = useToken();

  const { data: dialog, isLoading } = useQuery({
    queryKey: ['dialog', dialogId],
    queryFn: () => (dialogId ? getDialogById(dialogId) : Promise.resolve(undefined)),
    enabled: !!dialogId,
  });

  if (!dialogId) return null;

  return (
    <Flex
      vertical
      gap={0}
      style={{
        width: 260,
        flexShrink: 0,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
        overflowY: 'auto',
      }}
    >
      <Typography.Text
        strong
        style={{
          display: 'block',
          padding: '14px 16px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          fontSize: 13,
        }}
      >
        Контекст диалога
      </Typography.Text>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} style={{ padding: 16 }} />
      ) : (
        <Flex vertical style={{ padding: 16 }} gap={16}>
          {/* Продукт */}
          <div>
            <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
              <ProductOutlined style={{ color: token.colorTextSecondary, fontSize: 13 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Продукт
              </Typography.Text>
            </Flex>
            <Typography.Text style={{ fontSize: 13 }}>
              {dialog?.context.productName}
            </Typography.Text>
            {dialog?.context.sprintName && (
              <Tag style={{ marginTop: 4, display: 'block', width: 'fit-content' }}>
                {dialog.context.sprintName}
              </Tag>
            )}
          </div>

          {/* Связанная задача */}
          {dialog?.context.taskId && (
            <>
              <Divider style={{ margin: 0 }} />
              <div>
                <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                  <LinkOutlined style={{ color: token.colorTextSecondary, fontSize: 13 }} />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Связанная задача
                  </Typography.Text>
                </Flex>
                <Tag color="blue" style={{ cursor: 'pointer' }}>
                  {dialog.context.taskId}
                </Tag>
                <Typography.Text style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  {dialog.context.taskTitle}
                </Typography.Text>
              </div>
            </>
          )}

          <Divider style={{ margin: 0 }} />

          {/* Участники */}
          <div>
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
              <UserOutlined style={{ color: token.colorTextSecondary, fontSize: 13 }} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Участники
              </Typography.Text>
            </Flex>
            <Flex vertical gap={8}>
              {dialog?.participants.map((p) => (
                <Flex key={p.id} align="center" gap={8}>
                  <Avatar size={24} icon={<UserOutlined />} style={{ flexShrink: 0 }} />
                  <div>
                    <Typography.Text style={{ fontSize: 12, display: 'block' }}>
                      {p.name}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {p.role}
                    </Typography.Text>
                  </div>
                </Flex>
              ))}
            </Flex>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Прикрепить артефакт */}
          <Button icon={<PaperClipOutlined />} block>
            Прикрепить артефакт
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
