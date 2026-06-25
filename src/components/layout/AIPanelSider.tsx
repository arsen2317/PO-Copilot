import { useState } from 'react';
import { motion } from 'motion/react';
import { Button, Flex, Input, theme, Tooltip, Typography } from 'antd';
import {
  AppstoreOutlined,
  AudioOutlined,
  CloseOutlined,
  FormOutlined,
  HistoryOutlined,
  LayoutOutlined,
  PlusOutlined,
  RobotOutlined,
  StarFilled,
} from '@ant-design/icons';

const { useToken } = theme;

export type AIPanelMode = 'sidebar' | 'floating' | 'closed';

interface AIPanelSiderProps {
  mode: 'sidebar' | 'floating';
  onChangeMode: (mode: AIPanelMode) => void;
}

const SUGGESTIONS = [
  'Найти аномалии и исследовать причину',
  'Построить дашборд из этих метрик',
  'Сравнить этот период с предыдущим',
];

function JumpingDots({ color }: { color: string }) {
  return (
    <Flex align="center" gap={6} style={{ height: 32 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: color,
          }}
          animate={{ y: [0, -14, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </Flex>
  );
}

function PanelContent({
  onChangeMode,
  mode,
}: {
  onChangeMode: (m: AIPanelMode) => void;
  mode: 'sidebar' | 'floating';
}) {
  const { token } = useToken();
  const [inputValue, setInputValue] = useState('');

  const iconBtn = (icon: React.ReactNode, tooltip: string, onClick: () => void) => (
    <Tooltip title={tooltip} key={tooltip}>
      <Button
        type="text"
        icon={icon}
        size="small"
        onClick={onClick}
        style={{ color: token.colorTextSecondary, width: 28, height: 28 }}
      />
    </Tooltip>
  );

  return (
    <Flex vertical style={{ height: '100%', overflow: 'hidden' }}>
      {/* ── Top bar ── */}
      <Flex
        justify="space-between"
        align="center"
        style={{
          padding: '10px 12px',
          flexShrink: 0,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {/* Left: new chat */}
        {iconBtn(<FormOutlined />, 'Новый чат', () => {})}

        {/* Right: history, toggle mode, close */}
        <Flex align="center" gap={2}>
          {iconBtn(<HistoryOutlined />, 'История чатов', () => {})}
          {iconBtn(
            <LayoutOutlined />,
            mode === 'sidebar' ? 'Открыть как окно' : 'Прикрепить справа',
            () => onChangeMode(mode === 'sidebar' ? 'floating' : 'sidebar'),
          )}
          {iconBtn(<CloseOutlined />, 'Закрыть', () => onChangeMode('closed'))}
        </Flex>
      </Flex>

      {/* ── Center: dots + title + suggestions ── */}
      <Flex
        vertical
        align="center"
        justify="center"
        gap={16}
        style={{ flex: 1, padding: '24px 20px', overflow: 'auto' }}
      >
        <JumpingDots color={token.colorPrimary} />

        <Typography.Title
          level={4}
          style={{
            margin: 0,
            textAlign: 'center',
            color: token.colorText,
            fontWeight: 600,
            fontSize: 18,
            lineHeight: 1.4,
          }}
        >
          Что вы хотите узнать?
        </Typography.Title>

        <Flex vertical gap={8} style={{ width: '100%' }}>
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              type="default"
              onClick={() => setInputValue(s)}
              style={{
                width: '100%',
                textAlign: 'center',
                height: 'auto',
                whiteSpace: 'normal',
                padding: '8px 14px',
                fontSize: 13,
                background: token.colorFillQuaternary,
                borderColor: token.colorBorderSecondary,
                color: token.colorText,
                lineHeight: 1.45,
              }}
            >
              {s}
            </Button>
          ))}
        </Flex>
      </Flex>

      {/* ── Bottom section ── */}
      <Flex
        vertical
        gap={8}
        style={{
          padding: '10px 14px 12px',
          flexShrink: 0,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {/* Automate row */}
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={6}>
            <StarFilled style={{ color: token.colorPrimary, fontSize: 12 }} />
            <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
              Автоматизировать повторяющиеся задачи
            </Typography.Text>
          </Flex>
          <Typography.Link style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            Попробовать
          </Typography.Link>
        </Flex>

        {/* Input card */}
        <div
          style={{
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
            padding: '10px 12px 8px',
          }}
        >
          {/* Space context label */}
          <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
            <AppstoreOutlined style={{ color: token.colorPrimary, fontSize: 13 }} />
            <Typography.Text style={{ fontSize: 12, fontWeight: 500 }}>
              Пространство продукта
            </Typography.Text>
          </Flex>

          {/* Textarea */}
          <Input.TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Анализ, построить или / для команд"
            autoSize={{ minRows: 2, maxRows: 5 }}
            variant="borderless"
            style={{
              padding: 0,
              fontSize: 13,
              resize: 'none',
            }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                setInputValue('');
              }
            }}
          />

          {/* Input footer */}
          <Flex justify="space-between" align="center" style={{ marginTop: 6 }}>
            <Button
              type="text"
              icon={<PlusOutlined />}
              size="small"
              style={{ color: token.colorTextSecondary, padding: '0 4px' }}
            />
            <Button
              type="text"
              icon={<AudioOutlined />}
              size="small"
              style={{ color: token.colorTextSecondary, padding: '0 4px' }}
            />
          </Flex>
        </div>

        {/* Disclaimer */}
        <Typography.Text
          style={{ fontSize: 11, color: token.colorTextQuaternary, textAlign: 'center' }}
        >
          ИИ может ошибаться. Проверяйте важные данные.
        </Typography.Text>
      </Flex>
    </Flex>
  );
}

export default function AIPanelSider({ mode, onChangeMode }: AIPanelSiderProps) {
  const { token } = useToken();

  const commonStyle: React.CSSProperties = {
    background: token.colorBgElevated,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  if (mode === 'floating') {
    return (
      <div
        style={{
          ...commonStyle,
          position: 'fixed',
          top: 12,
          right: 12,
          bottom: 12,
          width: 360,
          borderRadius: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          zIndex: 1000,
        }}
      >
        <PanelContent mode={mode} onChangeMode={onChangeMode} />
      </div>
    );
  }

  return (
    <div
      style={{
        ...commonStyle,
        width: 320,
        flexShrink: 0,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
        height: '100%',
      }}
    >
      <PanelContent mode={mode} onChangeMode={onChangeMode} />
    </div>
  );
}

export function AIPanelFAB({ onClick }: { onClick: () => void }) {
  const { token } = useToken();
  return (
    <Tooltip title="Открыть ИИ-помощник" placement="left">
      <button
        onClick={onClick}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: token.colorPrimary,
          border: 'none',
          cursor: 'pointer',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <RobotOutlined style={{ fontSize: 22, color: '#fff' }} />
      </button>
    </Tooltip>
  );
}
