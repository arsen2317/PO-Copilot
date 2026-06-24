import React, { useEffect, useRef } from 'react';
import { Avatar, Button, Flex, Input, Skeleton, theme, Tooltip, Typography } from 'antd';
import {
  AudioOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDialogById } from '../../data/api/assistant';
import type { Message } from '../../data/types';

const { useToken } = theme;

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part,
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg }: { msg: Message }) {
  const { token } = useToken();
  const isAssistant = msg.role === 'assistant';

  return (
    <Flex
      gap={10}
      justify={isAssistant ? 'flex-start' : 'flex-end'}
      style={{ marginBottom: 16 }}
    >
      {isAssistant && (
        <Avatar
          size={32}
          icon={<RobotOutlined />}
          style={{ backgroundColor: token.colorPrimary, flexShrink: 0, marginTop: 2 }}
        />
      )}

      <Flex vertical gap={4} style={{ maxWidth: '72%' }} align={isAssistant ? 'flex-start' : 'flex-end'}>
        <div
          style={{
            background: isAssistant ? token.colorPrimaryBg : token.colorBgContainer,
            border: `1px solid ${isAssistant ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            padding: '10px 14px',
          }}
        >
          {msg.content.split('\n').map((line, i) => (
            <Typography.Text key={i} style={{ display: 'block', fontSize: 13, lineHeight: 1.6 }}>
              {line ? parseBold(line) : <>&nbsp;</>}
            </Typography.Text>
          ))}
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          {formatTime(msg.time)}
        </Typography.Text>
      </Flex>

      {!isAssistant && (
        <Avatar
          size={32}
          icon={<UserOutlined />}
          style={{ backgroundColor: token.colorBgContainer, flexShrink: 0, marginTop: 2 }}
        />
      )}
    </Flex>
  );
}

interface Props {
  dialogId: string | undefined;
}

export default function MessageFeed({ dialogId }: Props) {
  const { token } = useToken();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: dialog, isLoading } = useQuery({
    queryKey: ['dialog', dialogId],
    queryFn: () => (dialogId ? getDialogById(dialogId) : Promise.resolve(undefined)),
    enabled: !!dialogId,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dialog?.messages]);

  if (!dialogId) {
    return (
      <Flex flex={1} align="center" justify="center" vertical gap={12}>
        <RobotOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />
        <Typography.Text type="secondary">Выберите диалог или начните новый</Typography.Text>
      </Flex>
    );
  }

  return (
    <Flex vertical flex={1} style={{ overflow: 'hidden' }}>
      {/* Заголовок */}
      <Flex
        align="center"
        style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        {isLoading ? (
          <Skeleton.Input active size="small" />
        ) : (
          <Typography.Text strong style={{ fontSize: 14 }}>
            {dialog?.title}
          </Typography.Text>
        )}
      </Flex>

      {/* Лента сообщений */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            {dialog?.messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Поле ввода */}
      <Flex
        gap={8}
        align="flex-end"
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          flexShrink: 0,
        }}
      >
        <Input.TextArea
          placeholder="Напишите сообщение... (/ — команды, @ — упоминания)"
          autoSize={{ minRows: 1, maxRows: 5 }}
          style={{ flex: 1, resize: 'none' }}
          variant="filled"
        />
        <Tooltip title="Голосовой ввод">
          <Button icon={<AudioOutlined />} />
        </Tooltip>
        <Tooltip title="Отправить">
          <Button type="primary" icon={<SendOutlined />} />
        </Tooltip>
      </Flex>
    </Flex>
  );
}
