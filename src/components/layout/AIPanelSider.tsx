import { useState } from 'react';
import { Button, Flex, Input, Layout, theme, Typography } from 'antd';
import {
  AudioOutlined,
  CloseOutlined,
  PlusOutlined,
  SendOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';

const { useToken } = theme;

const SUGGESTIONS = [
  'Найти аномалии и исследовать причину',
  'Построить дашборд из этих метрик',
  'Сравнить этот период с предыдущим',
];

interface AIPanelSiderProps {
  open: boolean;
  onClose: () => void;
}

export default function AIPanelSider({ open, onClose }: AIPanelSiderProps) {
  const { token } = useToken();
  const [inputValue, setInputValue] = useState('');

  if (!open) return null;

  return (
    <Layout.Sider
      width={320}
      style={{
        background: token.colorBgElevated,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Flex vertical style={{ height: '100%' }}>
        {/* Top bar */}
        <Flex
          justify="flex-end"
          align="center"
          style={{
            padding: '12px 12px 0',
            flexShrink: 0,
          }}
        >
          <Button
            type="text"
            icon={<CloseOutlined />}
            size="small"
            onClick={onClose}
            style={{ color: token.colorTextSecondary }}
          />
        </Flex>

        {/* Hero section */}
        <Flex
          vertical
          align="center"
          justify="center"
          style={{
            padding: '32px 24px 24px',
            flexShrink: 0,
          }}
        >
          {/* Decorative dots */}
          <div style={{ position: 'relative', width: 64, height: 48, marginBottom: 20 }}>
            {[
              { cx: 8, cy: 16, r: 4, op: 0.4 },
              { cx: 20, cy: 8, r: 3, op: 0.6 },
              { cx: 32, cy: 20, r: 5, op: 1 },
              { cx: 44, cy: 10, r: 3, op: 0.5 },
              { cx: 56, cy: 20, r: 3.5, op: 0.7 },
              { cx: 14, cy: 32, r: 2.5, op: 0.3 },
              { cx: 48, cy: 36, r: 2, op: 0.4 },
            ].map((d, i) => (
              <svg
                key={i}
                style={{ position: 'absolute', top: 0, left: 0, width: 64, height: 48 }}
                viewBox="0 0 64 48"
              >
                <circle
                  cx={d.cx}
                  cy={d.cy}
                  r={d.r}
                  fill={token.colorPrimary}
                  opacity={d.op}
                />
              </svg>
            ))}
          </div>

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
        </Flex>

        {/* Suggestions */}
        <Flex
          vertical
          gap={8}
          style={{ padding: '0 16px', flexShrink: 0 }}
        >
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              type="default"
              onClick={() => setInputValue(s)}
              style={{
                textAlign: 'left',
                height: 'auto',
                whiteSpace: 'normal',
                padding: '8px 12px',
                fontSize: 13,
                background: token.colorBgContainer,
                borderColor: token.colorBorderSecondary,
                color: token.colorText,
                lineHeight: 1.4,
              }}
            >
              {s}
            </Button>
          ))}
        </Flex>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom area */}
        <Flex
          vertical
          gap={8}
          style={{
            padding: '12px 16px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            flexShrink: 0,
          }}
        >
          {/* Automate hint */}
          <Flex
            align="center"
            gap={8}
            style={{
              padding: '8px 12px',
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <ThunderboltOutlined style={{ color: token.colorPrimary, fontSize: 14 }} />
            <Typography.Text style={{ fontSize: 12, flex: 1, color: token.colorTextSecondary }}>
              Автоматизировать повторяющиеся задачи
            </Typography.Text>
            <Typography.Link style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
              Попробовать
            </Typography.Link>
          </Flex>

          {/* Space label */}
          <Flex align="center" gap={6}>
            <div
              style={{
                width: 16,
                height: 16,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary}`,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ThunderboltOutlined style={{ fontSize: 10, color: token.colorPrimary }} />
            </div>
            <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
              Пространство продукта
            </Typography.Text>
          </Flex>

          {/* Input */}
          <Flex gap={8} align="flex-end">
            <Button
              type="text"
              icon={<PlusOutlined />}
              size="small"
              style={{ color: token.colorTextSecondary, flexShrink: 0 }}
            />
            <Input.TextArea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Анализ, построить или / для команд"
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{
                flex: 1,
                fontSize: 13,
                background: 'transparent',
                border: 'none',
                padding: '4px 0',
                resize: 'none',
                boxShadow: 'none',
              }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  setInputValue('');
                }
              }}
            />
            <Flex gap={4} style={{ flexShrink: 0 }}>
              <Button
                type="text"
                icon={<AudioOutlined />}
                size="small"
                style={{ color: token.colorTextSecondary }}
              />
              <Button
                type="text"
                icon={<SendOutlined />}
                size="small"
                disabled={!inputValue.trim()}
                style={{ color: inputValue.trim() ? token.colorPrimary : token.colorTextDisabled }}
                onClick={() => setInputValue('')}
              />
            </Flex>
          </Flex>

          <Typography.Text
            style={{ fontSize: 11, color: token.colorTextQuaternary, textAlign: 'center' }}
          >
            ИИ может ошибаться. Проверяйте важные данные.
          </Typography.Text>
        </Flex>
      </Flex>
    </Layout.Sider>
  );
}
