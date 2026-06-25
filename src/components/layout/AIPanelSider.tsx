import { useState } from 'react';
import { motion } from 'motion/react';
import {
  AudioOutlined,
  BarChartOutlined,
  CloseOutlined,
  FormOutlined,
  HistoryOutlined,
  LayoutOutlined,
  PlusOutlined,
  RobotOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Tooltip } from 'antd';

export type AIPanelMode = 'sidebar' | 'floating' | 'closed';

interface AIPanelSiderProps {
  mode: 'sidebar' | 'floating';
  onChangeMode: (mode: AIPanelMode) => void;
}

const SUGGESTIONS = [
  'Найти аномалии и исследовать причину',
  'Предложить улучшения',
  'Составить короткий отчет для QBR',
];

const BORDER_COLOR = '#2D2E30';
const BG = '#121214';
const TEXT_PRIMARY = '#D7D8DA';
const TEXT_SECONDARY = '#9B9C9E';
const TEXT_PLACEHOLDER = '#757575';
const ACCENT = '#4A82F7';

function JumpingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: ACCENT,
          }}
          animate={{ y: [0, -14, 0] }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            repeatDelay: 3,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function IconBtn({
  icon,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip title={tooltip}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          cursor: 'pointer',
          color: TEXT_SECONDARY,
          fontSize: 15,
          background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        {icon}
      </div>
    </Tooltip>
  );
}

function PanelContent({
  onChangeMode,
  mode,
}: {
  onChangeMode: (m: AIPanelMode) => void;
  mode: 'sidebar' | 'floating';
}) {
  const [inputValue, setInputValue] = useState('');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Top bar (no bottom border) ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          flexShrink: 0,
        }}
      >
        <IconBtn icon={<FormOutlined />} tooltip="Новый чат" onClick={() => {}} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconBtn icon={<HistoryOutlined />} tooltip="История чатов" onClick={() => {}} />
          <IconBtn
            icon={<LayoutOutlined />}
            tooltip={mode === 'sidebar' ? 'Открыть как окно' : 'Прикрепить справа'}
            onClick={() => onChangeMode(mode === 'sidebar' ? 'floating' : 'sidebar')}
          />
          <IconBtn icon={<CloseOutlined />} tooltip="Закрыть" onClick={() => onChangeMode('closed')} />
        </div>
      </div>

      {/* ── Center: glow + dots + title + suggestions ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 20px',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {/* Blue glow */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
            width: 156,
            height: 156,
            background: '#09225C',
            borderRadius: 9999,
            filter: 'blur(62px)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            width: '100%',
          }}
        >
          <JumpingDots />

          <span
            style={{
              color: TEXT_PRIMARY,
              fontSize: 18,
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Что вы хотите узнать?
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
            {SUGGESTIONS.map((s) => (
              <div
                key={s}
                onClick={() => setInputValue(s)}
                style={{
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 8,
                  outline: `1px solid ${BORDER_COLOR}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: TEXT_SECONDARY,
                  fontSize: 13,
                  textAlign: 'center',
                  background: 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                }}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom section (no top border) ── */}
      <div
        style={{
          padding: '0 14px 12px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Unified input card: automate row + divider + input */}
        <div
          style={{
            background: BG,
            borderRadius: 18,
            outline: `1px solid ${BORDER_COLOR}`,
            overflow: 'hidden',
          }}
        >
          {/* Automate row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <StarFilled style={{ color: ACCENT, fontSize: 12 }} />
              <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
                Автоматизировать повторяющиеся задачи
              </span>
            </div>
            <span style={{ fontSize: 12, color: ACCENT, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Попробовать
            </span>
          </div>

          {/* Inner divider */}
          <div style={{ height: 1, background: BORDER_COLOR }} />

          {/* Input area */}
          <div style={{ padding: '14px 16px 14px' }}>
            {/* Context chip */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 32,
                padding: '0 8px',
                background: '#1C1D1F',
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <BarChartOutlined style={{ color: ACCENT, fontSize: 13 }} />
              <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 500, whiteSpace: 'nowrap' }}>
                Продуктовая аналитика
              </span>
            </div>

            {/* Textarea */}
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Напишите сообщение или введите / для выбора команд"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setInputValue('');
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 13,
                color: TEXT_PRIMARY,
                fontFamily: 'inherit',
                lineHeight: 1.5,
                width: '100%',
                padding: 0,
              }}
            />

            {/* Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 8,
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: TEXT_SECONDARY,
                  fontSize: 14,
                }}
              >
                <PlusOutlined />
              </div>
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: TEXT_SECONDARY,
                  fontSize: 14,
                }}
              >
                <AudioOutlined />
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <span style={{ fontSize: 11, color: TEXT_PLACEHOLDER, textAlign: 'center' }}>
          ИИ может ошибаться. Проверяйте важные данные.
        </span>
      </div>
    </div>
  );
}

export default function AIPanelSider({ mode, onChangeMode }: AIPanelSiderProps) {
  const commonStyle: React.CSSProperties = {
    background: BG,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: 12,
    border: `1px solid ${BORDER_COLOR}`,
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
        height: '100%',
      }}
    >
      <PanelContent mode={mode} onChangeMode={onChangeMode} />
    </div>
  );
}

export function AIPanelFAB({ onClick }: { onClick: () => void }) {
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
          background: ACCENT,
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
