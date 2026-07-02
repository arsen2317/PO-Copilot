import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { streamChat } from '../../lib/claude';
import { TOOL_DEFINITIONS, executeTool } from '../../lib/tools';
import type { ChatMessage, ToolUseBlock } from '../../lib/claude';
import { getBaseSystemPrompt, AGENT_PROMPTS } from '../../lib/agentPrompts';
import { getMetricDefinitions } from '../../data/api/metric-definitions';
import { getFunnelAnalytics } from '../../data/api/funnel-analytics';
import { getTasks } from '../../data/api/tasks';
import { useUIStore } from '../../store/uiStore';
import type { ChatMessage as StoredChatMessage, ChatSession, AttachedFile } from '../../store/uiStore';
import {
  ApiOutlined,
  AudioOutlined,
  BarChartOutlined,
  BulbOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  CodeOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FormOutlined,
  HistoryOutlined,
  LayoutOutlined,
  PaperClipOutlined,
  PlusOutlined,
  RiseOutlined,
  RobotOutlined,
  SafetyOutlined,
  SendOutlined,
  StarFilled,
  StopOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Dropdown, Tooltip } from 'antd';

// ── Sparkle / AI icon (three 4-pointed stars) ───────────────────────────────
function SparkleIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
      {/* large star top-right */}
      <path d="M14 1.5 L14.65 4.35 L17.5 5 L14.65 5.65 L14 8.5 L13.35 5.65 L10.5 5 L13.35 4.35 Z"/>
      {/* medium star bottom-left */}
      <path d="M6.5 10 L7 12 L9 12.5 L7 13 L6.5 15 L6 13 L4 12.5 L6 12 Z"/>
      {/* small star top-left */}
      <path d="M5 3 L5.3 4.2 L6.5 4.5 L5.3 4.8 L5 6 L4.7 4.8 L3.5 4.5 L4.7 4.2 Z"/>
    </svg>
  );
}

// ── SpeechRecognition types (not in standard TS DOM lib) ────────────────────
interface ISpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface ISpeechRecognitionCtor { new(): ISpeechRecognition; }
declare global {
  interface Window {
    SpeechRecognition?: ISpeechRecognitionCtor;
    webkitSpeechRecognition?: ISpeechRecognitionCtor;
  }
}

export type AIPanelMode = 'sidebar' | 'floating' | 'closed';

interface AIPanelSiderProps {
  mode: 'sidebar' | 'floating';
  onChangeMode: (mode: AIPanelMode) => void;
  expanded?: boolean;
  hideWindowControls?: boolean;
}

type LocalMessage = StoredChatMessage;


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

// ── Aurora blob config per agent ─────────────────────────────────────────────
interface AuroraCfg {
  b1: string;
  b2: string;
  b3: string;
  // hoverBorder: subtle tint, still semi-transparent (not a solid colour)
  hoverBorder: string;
  iconBg: string;
  iconColor: string;
}
const AURORA_CFG: Record<string, AuroraCfg> = {
  'agent-briefing':   { b1: '#1a6fff', b2: '#0040cc', b3: '#00aaff', hoverBorder: 'rgba(106,173,255,0.28)', iconBg: 'rgba(26,111,255,0.13)',  iconColor: '#6aadff' },
  'agent-metrics':    { b1: '#0ea5e9', b2: '#0058b0', b3: '#38d4ff', hoverBorder: 'rgba(56,189,248,0.28)',  iconBg: 'rgba(14,165,233,0.13)',  iconColor: '#38bdf8' },
  'agent-qbr':        { b1: '#10b981', b2: '#047857', b3: '#34d399', hoverBorder: 'rgba(52,211,153,0.28)',  iconBg: 'rgba(16,185,129,0.13)',  iconColor: '#34d399' },
  'agent-tasks':      { b1: '#a855f7', b2: '#7c3aed', b3: '#e040fb', hoverBorder: 'rgba(192,132,252,0.28)', iconBg: 'rgba(168,85,247,0.13)', iconColor: '#c084fc' },
  'agent-risks':      { b1: '#ef4444', b2: '#b91c1c', b3: '#f97316', hoverBorder: 'rgba(252,165,165,0.28)', iconBg: 'rgba(239,68,68,0.13)',   iconColor: '#fca5a5' },
  'agent-hypotheses': { b1: '#eab308', b2: '#d97706', b3: '#fde047', hoverBorder: 'rgba(253,224,71,0.28)',  iconBg: 'rgba(234,179,8,0.13)',   iconColor: '#fde047' },
  'agent-custdev':    { b1: '#06b6d4', b2: '#0891b2', b3: '#818cf8', hoverBorder: 'rgba(34,211,238,0.28)',  iconBg: 'rgba(6,182,212,0.13)',   iconColor: '#22d3ee' },
  'agent-trends':     { b1: '#8b5cf6', b2: '#6d28d9', b3: '#ec4899', hoverBorder: 'rgba(167,139,250,0.28)', iconBg: 'rgba(139,92,246,0.13)', iconColor: '#a78bfa' },
};

// Blob-based wavy aurora CSS — blobs translate (never scale beyond card bounds)
const AURORA_BLOB_CSS = `
@keyframes aurora-blob-a {
  0%,100% { transform: translate(0px, 0px); }
  30%     { transform: translate(14px, -18px); }
  60%     { transform: translate(-10px, -24px); }
}
@keyframes aurora-blob-b {
  0%,100% { transform: translate(0px, 0px); }
  35%     { transform: translate(-16px, -12px); }
  70%     { transform: translate(12px, -20px); }
}
@keyframes aurora-blob-c {
  0%,100% { transform: translate(0px, 0px); }
  40%     { transform: translate(18px, -8px); }
  75%     { transform: translate(-8px, -18px); }
}
`;

let _auroraBlobStyleInjected = false;
function ensureAuroraStyles() {
  if (_auroraBlobStyleInjected) return;
  const el = document.createElement('style');
  el.id = 'aurora-blob-keyframes';
  el.textContent = AURORA_BLOB_CSS;
  document.head.appendChild(el);
  _auroraBlobStyleInjected = true;
}

type AgentDef = {
  key: string;
  label: string;
  desc: string;
  color: string;
  Icon: React.ComponentType<{ style?: React.CSSProperties }>;
  trigger?: string;
};

const AGENTS_DATA: AgentDef[] = [
  { key: 'agent-briefing',   label: 'Брифинг',           desc: 'Вводит в курс дела: что изменилось за последние дни в метриках и задачах', color: '#0D1F2D', Icon: CalendarOutlined,   trigger: 'Дай мне брифинг за последние 3 дня' },
  { key: 'agent-metrics',    label: 'Анализ метрик',     desc: 'Исследует аномалии и тренды, выявляет причины отклонений в данных',     color: '#0B2550', Icon: BarChartOutlined,   trigger: 'Проанализируй все текущие метрики' },
  { key: 'agent-qbr',       label: 'Ассистент QBR',     desc: 'Готовит ключевые инсайты и рекомендации для квартального обзора',        color: '#0B3325', Icon: FileTextOutlined,   trigger: 'Начни подготовку QBR отчёта' },
  { key: 'agent-tasks',     label: 'Постановщик задач', desc: 'Пишет и улучшает задачи в формате Jira, расставляет приоритеты',        color: '#25103A', Icon: CheckSquareOutlined },
  { key: 'agent-risks',     label: 'Поиск рисков',      desc: 'Выявляет комплаенс-риски и риски имплементации фичей',                  color: '#3A0F0F', Icon: SafetyOutlined },
  { key: 'agent-hypotheses',label: 'Гипотезы роста',    desc: 'Предлагает проверяемые гипотезы на основе метрик с ICE-скорингом',      color: '#2A2A0A', Icon: BulbOutlined,       trigger: 'Сгенерируй гипотезы роста на основе текущих метрик' },
  { key: 'agent-custdev',   label: 'CustDev',            desc: 'Подбирает методы исследования и помогает составить бриф',               color: '#0A2530', Icon: TeamOutlined },
  { key: 'agent-trends',    label: 'Трендвотчер',       desc: 'Мониторит фичи конкурентов и тренды банковского рынка со ссылками',     color: '#1A0A35', Icon: RiseOutlined,       trigger: 'Проведи мониторинг последних фич конкурентов в сегменте дебетовых карт' },
];

// ── Single aurora agent card ─────────────────────────────────────────────────
function AuroraCard({ agent, onSelect }: { agent: AgentDef; onSelect: (key: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const cfg: AuroraCfg = AURORA_CFG[agent.key] ?? {
    b1: '#4A82F7', b2: '#1a3a8a', b3: '#7aa8f9',
    hoverBorder: 'rgba(122,168,249,0.28)',
    iconBg: 'rgba(74,130,247,0.13)', iconColor: '#7aa8f9',
  };

  useEffect(() => { ensureAuroraStyles(); }, []);

  // Slower at rest, faster on hover — same keyframes, different duration
  const dur = hovered ? '3s' : '8s';

  return (
    <div
      onClick={() => onSelect(agent.key)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        flex: '0 0 calc((100% - 20px) / 3)',
        minWidth: 0,
        padding: '14px 14px 16px',
        background: '#07080f',
        // rest: very transparent white so aurora gradient bleeds through the border
        // hover: slightly brighter white with a subtle colour tint
        border: `1px solid ${hovered ? cfg.hoverBorder : 'rgba(255,255,255,0.07)'}`,
        boxShadow: hovered ? 'inset 0 0 28px rgba(0,0,0,0.4)' : 'none',
        borderRadius: 14,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'hidden',
        transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
      }}
    >
      {/* ── Blob A — large, bottom-center ── */}
      <div style={{
        position: 'absolute', pointerEvents: 'none',
        width: 130, height: 90,
        borderRadius: '50%',
        background: cfg.b1,
        filter: 'blur(32px)',
        opacity: hovered ? 0.75 : 0.40,
        bottom: -30, left: '50%', marginLeft: -65,
        animation: `aurora-blob-a ${dur} ease-in-out infinite`,
        transition: 'opacity 0.35s ease',
        willChange: 'transform',
      }} />

      {/* ── Blob B — medium, bottom-right ── */}
      <div style={{
        position: 'absolute', pointerEvents: 'none',
        width: 100, height: 75,
        borderRadius: '50%',
        background: cfg.b2,
        filter: 'blur(28px)',
        opacity: hovered ? 0.65 : 0.30,
        bottom: -20, right: -20,
        animation: `aurora-blob-b ${dur} ease-in-out infinite`,
        animationDelay: '-1.5s',
        transition: 'opacity 0.35s ease',
        willChange: 'transform',
      }} />

      {/* ── Blob C — small accent, bottom-left ── */}
      <div style={{
        position: 'absolute', pointerEvents: 'none',
        width: 70, height: 60,
        borderRadius: '50%',
        background: cfg.b3,
        filter: 'blur(22px)',
        opacity: hovered ? 0.55 : 0.20,
        bottom: -10, left: -15,
        animation: `aurora-blob-c ${dur} ease-in-out infinite`,
        animationDelay: '-3s',
        transition: 'opacity 0.35s ease',
        willChange: 'transform',
      }} />

      {/* Icon circle */}
      <div style={{
        position: 'relative', zIndex: 1,
        width: 40, height: 40, borderRadius: '50%',
        background: cfg.iconBg,
        border: `1px solid ${cfg.hoverBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <agent.Icon style={{ fontSize: 18, color: cfg.iconColor }} />
      </div>

      {/* Text */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.3 }}>{agent.label}</span>
        <span style={{
          fontSize: 12,
          color: hovered ? 'rgba(255,255,255,0.72)' : TEXT_SECONDARY,
          lineHeight: 1.5,
          transition: 'color 0.35s ease',
        }}>{agent.desc}</span>
      </div>
    </div>
  );
}

// ── Agent cards carousel — 3 visible, icon-based ────────────────────────────
function AgentCards({ onSelect }: { onSelect: (key: string) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    // card width = (containerWidth - 2×gap) / 3; scroll step = cardWidth + gap = (containerWidth + gap) / 3
    const step = (el.clientWidth + 10) / 3;
    el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingRight: 2 }}>
        <span style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 }}>Агенты</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['left', 'right'] as const).map((dir) => {
            const active = dir === 'left' ? canLeft : canRight;
            return (
              <div
                key={dir}
                onClick={() => scroll(dir)}
                style={{
                  width: 24, height: 24, borderRadius: 6, cursor: active ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: active ? TEXT_SECONDARY : '#3A3B3D',
                  fontSize: 14, transition: 'color 0.15s', background: 'rgba(255,255,255,0.04)',
                }}
              >
                {dir === 'left' ? '←' : '→'}
              </div>
            );
          })}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateArrows}
        style={{ display: 'flex', gap: 10, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 6, paddingTop: 2 }}
      >
        {AGENTS_DATA.map((agent) => (
          <AuroraCard key={agent.key} agent={agent} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

// ── Jumping dots (loading indicator) ────────────────────────────────────────
function JumpingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENT }}
          animate={{ y: [0, -14, 0] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 3, delay: i * 0.15, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Generic icon button ──────────────────────────────────────────────────────
function IconBtn({ icon, tooltip, onClick, active }: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Tooltip title={tooltip}>
      <div
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 28, height: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 6, cursor: 'pointer',
          color: active ? ACCENT : TEXT_SECONDARY,
          fontSize: 15,
          background: active ? 'rgba(74,130,247,0.15)' : hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        {icon}
      </div>
    </Tooltip>
  );
}

// ── User message bubble ──────────────────────────────────────────────────────
function UserBubble({ msg }: { msg: LocalMessage }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginBottom: 12 }}>
      {msg.images && msg.images.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {msg.images.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              style={{ height: 80, maxWidth: 120, borderRadius: 8, objectFit: 'cover', border: `1px solid ${BORDER_COLOR}` }}
            />
          ))}
        </div>
      )}
      {msg.content && (
        <div style={{
          maxWidth: '85%',
          background: '#1E3A5F',
          border: `1px solid #2A4A75`,
          borderRadius: '12px 12px 3px 12px',
          padding: '8px 12px',
          fontSize: 13,
          color: TEXT_PRIMARY,
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
      )}
    </div>
  );
}

// ── Assistant message bubble ─────────────────────────────────────────────────
// ── Interactive metric selector for QBR ─────────────────────────────────────
type MetricSelectorItem = {
  id: string; name: string; currentValue: number; planValue: number;
  lastPeriodValue: number; unit: string; fulfillmentPct: number; lowerIsBetter?: boolean;
};

function MetricSelector({ json, onConfirm }: { json: string; onConfirm: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  let items: MetricSelectorItem[] = [];
  try { items = JSON.parse(json) as MetricSelectorItem[]; } catch { return null; }

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const pctColor = (pct: number) => pct >= 95 ? '#16A34A' : pct >= 80 ? '#D97706' : '#DC2626';

  return (
    <div style={{ margin: '8px 0', border: `1px solid ${BORDER_COLOR}`, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: '#1C1D1F', borderBottom: `1px solid ${BORDER_COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 }}>Выберите метрики для отчёта</span>
        <span style={{ fontSize: 11, color: TEXT_PLACEHOLDER }}>выбрано: {selected.size}</span>
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {items.map((m) => {
          const active = selected.has(m.id);
          const delta = m.lastPeriodValue ? ((m.currentValue - m.lastPeriodValue) / Math.abs(m.lastPeriodValue) * 100) : 0;
          return (
            <div
              key={m.id}
              onClick={() => toggle(m.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', cursor: 'pointer',
                background: active ? 'rgba(74,130,247,0.08)' : 'transparent',
                borderBottom: `1px solid ${BORDER_COLOR}`,
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${active ? ACCENT : '#3A3B3D'}`,
                background: active ? ACCENT : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s',
              }}>
                {active && <span style={{ color: '#fff', fontSize: 10, lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ flex: 1, fontSize: 13, color: active ? TEXT_PRIMARY : TEXT_SECONDARY }}>{m.name}</span>
              <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 500 }}>{m.currentValue}{m.unit}</span>
              <span style={{ fontSize: 11, color: pctColor(m.fulfillmentPct), minWidth: 40, textAlign: 'right' }}>{m.fulfillmentPct}%</span>
              <span style={{ fontSize: 11, color: delta >= 0 ? '#16A34A' : '#DC2626', minWidth: 44, textAlign: 'right' }}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '10px 14px', background: '#1C1D1F', display: 'flex', justifyContent: 'flex-end' }}>
        <div
          onClick={() => selected.size > 0 && onConfirm([...selected])}
          style={{
            padding: '6px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
            background: selected.size > 0 ? ACCENT : '#2A2B2D', color: selected.size > 0 ? '#fff' : TEXT_PLACEHOLDER,
            transition: 'background 0.15s',
          }}
        >
          Создать отчёт{selected.size > 0 ? ` (${selected.size})` : ''}
        </div>
      </div>
    </div>
  );
}

function AssistantBubble({ msg, chipMap, onMetricClick, onSend }: {
  msg: LocalMessage;
  chipMap: Map<string, string>; // combined: metrics + funnel steps + tasks
  onMetricClick: (id: string) => void;
  onSend: (text: string) => void;
}) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <div style={{
        fontSize: 13, color: TEXT_PRIMARY, lineHeight: 1.65,
        wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0,
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p style={{ margin: '0 0 8px', lineHeight: 1.65 }}>{children}</p>
            ),
            ul: ({ children }) => (
              <ul style={{ margin: '4px 0 8px', paddingLeft: 20, listStyleType: 'disc' }}>{children}</ul>
            ),
            ol: ({ children }) => (
              <ol style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{children}</ol>
            ),
            li: ({ children }) => (
              <li style={{ marginBottom: 3, color: TEXT_PRIMARY }}>{children}</li>
            ),
            strong: ({ children }) => (
              <strong style={{ color: '#fff', fontWeight: 600 }}>{children}</strong>
            ),
            h1: ({ children }) => (
              <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', margin: '12px 0 6px' }}>{children}</div>
            ),
            h2: ({ children }) => (
              <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', margin: '10px 0 5px' }}>{children}</div>
            ),
            h3: ({ children }) => (
              <div style={{ fontWeight: 600, fontSize: 13, color: '#fff', margin: '8px 0 4px' }}>{children}</div>
            ),
            h4: ({ children }) => (
              <div style={{ fontWeight: 600, fontSize: 13, color: TEXT_PRIMARY, margin: '6px 0 3px' }}>{children}</div>
            ),
            code: ({ children, className }) => {
              const isBlock = className?.startsWith('language-');
              if (isBlock) {
                // QBR metric selector — interactive checklist
                if (className === 'language-metric-selector') {
                  return (
                    <MetricSelector
                      json={String(children).trim()}
                      onConfirm={(ids) => onSend(`QBR: выбраны метрики: ${ids.join(', ')}`)}
                    />
                  );
                }
                // Clickable task draft link
                if (className === 'language-task-link') {
                  let parsed: { id: string; title: string } | null = null;
                  try { parsed = JSON.parse(String(children).trim()) as { id: string; title: string }; } catch { /* ignore */ }
                  if (!parsed) return null;
                  const { id: draftId, title: draftTitle } = parsed;
                  return (
                    <div
                      onClick={() => onMetricClick(`__task__${draftId}`)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', margin: '8px 0',
                        background: 'rgba(74,130,247,0.1)', border: `1px solid rgba(74,130,247,0.35)`,
                        borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(74,130,247,0.18)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(74,130,247,0.1)'; }}
                    >
                      <CheckSquareOutlined style={{ color: ACCENT, fontSize: 15 }} />
                      <span style={{ fontSize: 13, color: TEXT_PRIMARY, fontWeight: 500 }}>{draftTitle}</span>
                      <span style={{ fontSize: 12, color: ACCENT, marginLeft: 4 }}>Открыть черновик →</span>
                    </div>
                  );
                }
                // QBR HTML report — render in iframe
                if (className === 'language-html-report') {
                  const html = String(children);
                  const openInTab = () => {
                    const w = window.open('', '_blank');
                    w?.document.write(html);
                    w?.document.close();
                  };
                  const downloadPdf = async () => {
                    const W = 1280, H = 720;
                    const container = document.createElement('div');
                    container.style.cssText = `position:fixed;left:-9999px;top:0;width:${W}px;background:#fff;`;
                    container.innerHTML = html;
                    document.body.appendChild(container);
                    try {
                      const slides = Array.from(container.querySelectorAll<HTMLElement>('.slide'));
                      const targets = slides.length > 0 ? slides : [container];
                      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], hotfixes: ['px_scaling'] });
                      for (let i = 0; i < targets.length; i++) {
                        const el = targets[i] as HTMLElement;
                        el.style.width = `${W}px`;
                        el.style.height = `${H}px`;
                        const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff', width: W, height: H });
                        const imgData = canvas.toDataURL('image/png');
                        if (i > 0) pdf.addPage([W, H], 'landscape');
                        pdf.addImage(imgData, 'PNG', 0, 0, W, H);
                      }
                      pdf.save('QBR-Report.pdf');
                    } finally {
                      document.body.removeChild(container);
                    }
                  };
                  return (
                    <div style={{ margin: '10px 0', borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER_COLOR}` }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: '#1C1D1F', borderBottom: `1px solid ${BORDER_COLOR}`,
                      }}>
                        <span style={{ fontSize: 12, color: TEXT_SECONDARY, fontWeight: 500 }}>QBR Отчёт</span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span
                            onClick={downloadPdf}
                            style={{ fontSize: 12, color: ACCENT, cursor: 'pointer', userSelect: 'none' }}
                          >
                            Скачать PDF
                          </span>
                          <span style={{ fontSize: 12, color: BORDER_COLOR }}>|</span>
                          <span
                            onClick={openInTab}
                            style={{ fontSize: 12, color: ACCENT, cursor: 'pointer', userSelect: 'none' }}
                          >
                            Открыть на странице
                          </span>
                        </div>
                      </div>
                      <iframe
                        srcDoc={html}
                        sandbox="allow-same-origin"
                        style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block', background: '#fff' }}
                        title="QBR Report"
                      />
                    </div>
                  );
                }
                return (
                  <pre style={{
                    background: '#1C1D1F', border: `1px solid ${BORDER_COLOR}`,
                    borderRadius: 6, padding: '10px 12px', overflowX: 'auto',
                    fontSize: 12, lineHeight: 1.5, margin: '6px 0',
                  }}>
                    <code style={{ color: '#A8C7FA', fontFamily: 'monospace' }}>{children}</code>
                  </pre>
                );
              }
              const id = String(children).trim();
              const chipName = chipMap.get(id);
              if (chipName) {
                const isFunnel = id.startsWith('funnel:');
                const isTask = /^TASK-\d+$/.test(id);
                const chipAccent = isFunnel ? '#7C6AF6' : isTask ? '#49aa19' : ACCENT;
                const bgBase = isFunnel ? 'rgba(124,106,246,0.12)' : isTask ? 'rgba(73,170,25,0.10)' : '#242526';
                const bgHover = isFunnel ? 'rgba(124,106,246,0.22)' : isTask ? 'rgba(73,170,25,0.20)' : '#2D2E30';
                const borderBase = isFunnel ? 'rgba(124,106,246,0.4)' : isTask ? 'rgba(73,170,25,0.4)' : '#3A3B3D';
                const textColor = isFunnel ? '#B5AAFF' : isTask ? '#6BCB3A' : TEXT_PRIMARY;
                const tooltipText = isFunnel ? 'Открыть в воронке' : isTask ? 'Открыть задачу' : 'Открыть на дашборде';
                const prefix = isFunnel ? '↳ ' : isTask ? '⊡ ' : '';
                const label = isTask ? `${id}` : chipName;
                return (
                  <span
                    onClick={() => onMetricClick(id)}
                    title={tooltipText}
                    style={{
                      display: 'inline-block',
                      background: bgBase,
                      border: `1px solid ${borderBase}`,
                      borderRadius: 5,
                      padding: '0px 6px',
                      fontSize: 12,
                      color: textColor,
                      fontFamily: isTask ? 'monospace' : 'inherit',
                      cursor: 'pointer',
                      lineHeight: '20px',
                      verticalAlign: 'middle',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = bgHover;
                      (e.currentTarget as HTMLSpanElement).style.borderColor = chipAccent;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = bgBase;
                      (e.currentTarget as HTMLSpanElement).style.borderColor = borderBase;
                    }}
                  >
                    {prefix}{label}
                  </span>
                );
              }
              return (
                <code style={{
                  background: '#2A2B2D', borderRadius: 4, padding: '1px 5px',
                  fontSize: 12, color: '#A8C7FA', fontFamily: 'monospace',
                }}>{children}</code>
              );
            },
            pre: ({ children }) => <>{children}</>,
            table: ({ children }) => (
              <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{
                  borderCollapse: 'collapse', width: '100%',
                  fontSize: 12, color: TEXT_PRIMARY,
                }}>
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ background: '#1C1D1F', borderBottom: `1px solid ${BORDER_COLOR}` }}>
                {children}
              </thead>
            ),
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => (
              <tr style={{ borderBottom: `1px solid #232325` }}>{children}</tr>
            ),
            th: ({ children }) => (
              <th style={{
                padding: '7px 10px', textAlign: 'left', fontWeight: 600,
                color: TEXT_SECONDARY, whiteSpace: 'nowrap',
              }}>{children}</th>
            ),
            td: ({ children }) => (
              <td style={{ padding: '6px 10px', verticalAlign: 'top' }}>{children}</td>
            ),
            hr: () => (
              <hr style={{ border: 'none', borderTop: `1px solid ${BORDER_COLOR}`, margin: '10px 0' }} />
            ),
            blockquote: ({ children }) => (
              <blockquote style={{
                borderLeft: `3px solid ${ACCENT}`, margin: '6px 0',
                paddingLeft: 12, color: TEXT_SECONDARY,
              }}>{children}</blockquote>
            ),
          }}
        >
          {msg.content || (msg.streaming ? '▍' : '')}
        </ReactMarkdown>
      </div>
    </div>
  );
}


// ── History panel ────────────────────────────────────────────────────────────
function HistoryPanel({ sessions, activeSessionId, onSelect }: {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelect: (id: string) => void;
}) {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 8px' }}>
      <div style={{ fontSize: 11, color: TEXT_SECONDARY, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 4px 8px' }}>
        История чатов
      </div>
      {sessions.map((s) => {
        const active = s.id === activeSessionId;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              padding: '7px 8px', borderRadius: 7, marginBottom: 2, cursor: 'pointer',
              background: active ? 'rgba(74,130,247,0.12)' : 'transparent',
              border: `1px solid ${active ? 'rgba(74,130,247,0.25)' : 'transparent'}`,
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <span style={{
              fontSize: 13, color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
            }}>
              {s.title}
            </span>
            <span style={{ fontSize: 11, color: TEXT_PLACEHOLDER, flexShrink: 0 }}>
              {fmt(s.createdAt)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Assistant page left sidebar ──────────────────────────────────────────────
function AssistantLeftSidebar({ sessions, activeSessionId, onNewChat, onSelectSession }: {
  sessions: ChatSession[];
  activeSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
}) {
  const now = Date.now();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const todays = sessions.filter(s => s.createdAt >= todayStart.getTime());
  const yesterdays = sessions.filter(s => s.createdAt >= yesterdayStart.getTime() && s.createdAt < todayStart.getTime());
  const older = sessions.filter(s => s.createdAt < yesterdayStart.getTime());

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: 11, color: TEXT_PLACEHOLDER, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '10px 12px 4px' }}>
      {label}
    </div>
  );

  const SessionItem = ({ s }: { s: ChatSession }) => {
    const active = s.id === activeSessionId;
    return (
      <div
        onClick={() => onSelectSession(s.id)}
        style={{
          padding: '6px 12px', borderRadius: 7, cursor: 'pointer', marginBottom: 1,
          background: active ? 'rgba(74,130,247,0.12)' : 'transparent',
          border: `1px solid ${active ? 'rgba(74,130,247,0.25)' : 'transparent'}`,
          display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: active ? ACCENT : '#3A3B3D', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: active ? TEXT_PRIMARY : TEXT_SECONDARY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {s.title}
        </span>
      </div>
    );
  };

  void now;

  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${BORDER_COLOR}`, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top actions */}
      <div style={{ padding: '14px 12px 8px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <div
          onClick={onNewChat}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
            color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500,
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
        >
          <FormOutlined style={{ fontSize: 15, color: TEXT_SECONDARY }} />
          Новый чат
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8, cursor: 'not-allowed',
            color: TEXT_SECONDARY, fontSize: 13,
          }}
        >
          <RobotOutlined style={{ fontSize: 15 }} />
          <span>Мои агенты</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: TEXT_PLACEHOLDER, background: 'rgba(255,255,255,0.06)', borderRadius: 4, padding: '1px 5px' }}>скоро</span>
        </div>
      </div>

      <div style={{ height: 1, background: BORDER_COLOR, flexShrink: 0 }} />

      {/* History list */}
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 6px 12px' }}>
        {todays.length > 0 && (
          <>
            <SectionLabel label="Сегодня" />
            {todays.map(s => <SessionItem key={s.id} s={s} />)}
          </>
        )}
        {yesterdays.length > 0 && (
          <>
            <SectionLabel label="Вчера" />
            {yesterdays.map(s => <SessionItem key={s.id} s={s} />)}
          </>
        )}
        {older.length > 0 && (
          <>
            <SectionLabel label="Ранее" />
            {older.map(s => <SessionItem key={s.id} s={s} />)}
          </>
        )}
        {sessions.length === 0 && (
          <div style={{ padding: '16px 12px', fontSize: 13, color: TEXT_PLACEHOLDER }}>История пуста</div>
        )}
      </div>
    </div>
  );
}

// ── Main panel content ───────────────────────────────────────────────────────
function PanelContent({ onChangeMode, mode, onDragBarMouseDown, hideWindowControls }: {
  onChangeMode: (m: AIPanelMode) => void;
  mode: 'sidebar' | 'floating';
  onDragBarMouseDown?: (e: React.MouseEvent) => void;
  hideWindowControls?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAssistantPage = location.pathname === '/assistant' || location.pathname.startsWith('/assistant/');
  const setFocusedMetric = useUIStore((s) => s.setFocusedMetric);
  const sessions = useUIStore((s) => s.sessions);
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const createSession = useUIStore((s) => s.createSession);
  const switchSession = useUIStore((s) => s.switchSession);
  const setMessages = useUIStore((s) => s.setChatMessages);
  const setSessionTitle = useUIStore((s) => s.setSessionTitle);
  const messages = sessions.find((s) => s.id === activeSessionId)?.messages ?? [];

  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [inputValue, setInputValue] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [automateHovered, setAutomateHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<{ agent: string; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileDocInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: metricDefinitions } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: getMetricDefinitions,
  });
  const { data: funnelSteps } = useQuery({
    queryKey: ['funnel-analytics'],
    queryFn: getFunnelAnalytics,
  });
  const { data: allTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const metricMap = new Map(
    (metricDefinitions ?? []).map((m) => [m.id, m.name]),
  );
  const funnelStepMap = new Map(
    (funnelSteps ?? []).map((s) => [`funnel:${s.id}`, s.name]),
  );
  const taskChipMap = new Map(
    (allTasks ?? []).map((t) => [t.id, t.title]),
  );
  // Combined map: metrics + funnel steps + tasks
  const chipMap = new Map([...metricMap, ...funnelStepMap, ...taskChipMap]);

  const setFocusedFunnelStep = useUIStore((s) => s.setFocusedFunnelStep);

  const handleMetricClick = (id: string) => {
    if (id.startsWith('__task__')) {
      const draftId = id.slice('__task__'.length);
      void navigate(`/tasks?tab=drafts&draft=${draftId}`);
      return;
    }
    if (id.startsWith('funnel:')) {
      setFocusedFunnelStep(id);
      void navigate('/funnel');
      return;
    }
    if (/^TASK-\d+$/.test(id)) {
      void navigate(`/tasks/${id}`);
      return;
    }
    setFocusedMetric(id);
    void navigate('/dashboard');
  };

  const isGenerating = isThinking || messages.some(m => m.streaming);
  const hasMessages = messages.length > 0 || isThinking;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (hasMessages) setAutomateHovered(false);
  }, [hasMessages]);

  // ── Agent card click — select agent and auto-trigger if needed ─────────
  const handleAgentSelect = (key: string) => {
    const agent = AGENTS_DATA.find(a => a.key === key);
    if (!agent) return;
    setSelectedAgent(key);
    if (agent.trigger) {
      setPendingTrigger({ agent: key, text: agent.trigger });
    }
  };

  // Fire pending trigger after selectedAgent is committed to state
  useEffect(() => {
    if (!pendingTrigger) return;
    // Use a local snapshot of the trigger to avoid stale closure
    const { text } = pendingTrigger;
    setPendingTrigger(null);
    void handleSendWith(text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTrigger]);

  // ── Send message ────────────────────────────────────────────────────────
  const handleSendWith = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text && attachedImages.length === 0 && attachedFiles.length === 0) return;
    if (isThinking) return;

    const newMsg: LocalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      ...(attachedImages.length > 0 && { images: [...attachedImages] }),
      ...(attachedFiles.length > 0 && { files: [...attachedFiles] }),
    };

    // Auto-title the session from the first user message
    if (messages.length === 0 && text) {
      setSessionTitle(activeSessionId, text.length > 42 ? text.slice(0, 42) + '…' : text);
    }

    // Snapshot current messages before state update (closure capture)
    const prevMessages = messages;
    setMessages((prev) => [...prev, newMsg]);
    if (!overrideText) setInputValue('');
    setAttachedImages([]);
    setAttachedFiles([]);
    setIsThinking(true);

    const abort = new AbortController();
    abortControllerRef.current = abort;

    // Convert a local message to Anthropic API content
    const toApiContent = (m: LocalMessage): string | object[] => {
      const hasImages = m.role === 'user' && m.images && m.images.length > 0;
      const hasFiles = m.role === 'user' && m.files && m.files.length > 0;
      if (hasImages || hasFiles) {
        const parts: object[] = [];
        // Attached documents (PDF, text, Office, etc.)
        if (m.files) {
          for (const f of m.files) {
            const isOffice =
              f.type === 'application/msword' ||
              f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
              f.type === 'application/vnd.ms-excel' ||
              f.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

            if (f.type === 'application/pdf' || isOffice) {
              parts.push({ type: 'document', source: { type: 'base64', media_type: f.type, data: f.data }, title: f.name });
            } else if (f.type.startsWith('text/') || f.type === 'application/json') {
              try {
                const decoded = atob(f.data);
                parts.push({ type: 'text', text: `[Файл: ${f.name}]\n${decoded}` });
              } catch {
                parts.push({ type: 'text', text: `[Файл: ${f.name} — не удалось прочитать]` });
              }
            }
          }
        }
        // Images
        if (m.images) {
          for (const img of m.images) {
            const match = img.match(/^data:([^;]+);base64,(.+)$/);
            if (match) parts.push({ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } });
          }
        }
        if (m.content) parts.push({ type: 'text', text: m.content });
        return parts;
      }
      return m.content;
    };

    // Build initial API messages from all local messages + the new one
    let apiMessages: { role: 'user' | 'assistant'; content: string | object[] }[] =
      [...prevMessages, newMsg].map((m) => ({ role: m.role, content: toApiContent(m) }));

    try {
      while (true) {
        const assistantId = `ast-${Date.now()}-${Math.random()}`;

        setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', streaming: true }]);
        setIsThinking(false);

        const result = await streamChat({
          messages: apiMessages as ChatMessage[],
          system: selectedAgent && AGENT_PROMPTS[selectedAgent]
            ? `${getBaseSystemPrompt()}\n\n${AGENT_PROMPTS[selectedAgent]}`
            : getBaseSystemPrompt(),
          tools: TOOL_DEFINITIONS as unknown as object[],
          signal: abort.signal,
          onTextDelta: (delta) => {
            setMessages((prev) => prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + delta } : m,
            ));
          },
        });

        const fullText = result.blocks
          .filter((b) => b.type === 'text')
          .map((b) => (b as { type: 'text'; text: string }).text)
          .join('');

        setMessages((prev) => prev.map((m) =>
          m.id === assistantId ? { ...m, content: fullText, streaming: false } : m,
        ));

        if (result.stopReason !== 'tool_use') break;

        const toolUseBlocks = result.blocks.filter((b): b is ToolUseBlock => b.type === 'tool_use');

        apiMessages = [...apiMessages, { role: 'assistant', content: result.blocks }];

        setIsThinking(true);
        const toolResults = await Promise.all(
          toolUseBlocks.map(async (tb) => ({
            type: 'tool_result' as const,
            tool_use_id: tb.id,
            content: JSON.stringify(await executeTool(tb.name, tb.input)),
          })),
        );

        apiMessages = [...apiMessages, { role: 'user', content: toolResults }];
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setMessages((prev) => prev.map((m) => m.streaming ? { ...m, streaming: false } : m));
      } else {
        setMessages((prev) => {
          const without = prev.filter((m) => !m.streaming);
          return [...without, { id: `err-${Date.now()}`, role: 'assistant', content: 'Ошибка при обращении к ИИ. Попробуйте ещё раз.' }];
        });
      }
    } finally {
      setIsThinking(false);
      abortControllerRef.current = null;
    }
  };

  // ── Image attachment ────────────────────────────────────────────────────
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === 'string') {
          setAttachedImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // ── Document/file attachment ─────────────────────────────────────────────
  const handleDocFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result;
        if (typeof dataUrl !== 'string') return;
        // Strip the data URL prefix to get raw base64
        const base64 = dataUrl.split(',')[1] ?? '';
        setAttachedFiles((prev) => [...prev, { name: file.name, type: file.type, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // ── Voice input ─────────────────────────────────────────────────────────
  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'ru-RU';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  };

  // ── Dropdown items ───────────────────────────────────────────────────────
  const AGENT_ITEMS = [
    { key: 'agent-briefing', label: 'Брифинг' },
    { key: 'agent-metrics', label: 'Анализ метрик' },
    { key: 'agent-qbr', label: 'Ассистент QBR' },
    { key: 'agent-tasks', label: 'Постановщик задач' },
    { key: 'agent-risks', label: 'Поиск рисков' },
    { key: 'agent-hypotheses', label: 'Генератор гипотез' },
    { key: 'agent-custdev', label: 'CustDev' },
    { key: 'agent-trends', label: 'Трендвотчер' },
  ];

  const dropdownItems = [
    {
      key: 'image',
      label: 'Добавить изображение',
      icon: <FileImageOutlined />,
    },
    {
      key: 'file',
      label: 'Добавить файл',
      icon: <PaperClipOutlined />,
    },
    { type: 'divider' as const },
    {
      key: 'agents',
      label: 'Агенты',
      icon: <SparkleIcon size={14} color={TEXT_SECONDARY} />,
      children: AGENT_ITEMS,
    },
    {
      key: 'connectors',
      label: 'Коннекторы',
      icon: <ApiOutlined />,
      children: [{ key: 'connectors-soon', label: 'Скоро', disabled: true }],
    },
    {
      key: 'commands',
      label: 'Команды',
      icon: <CodeOutlined />,
    },
  ];

  const onDropdownClick = ({ key }: { key: string }) => {
    if (key === 'image') fileInputRef.current?.click();
    if (key === 'file') fileDocInputRef.current?.click();
    if (AGENT_ITEMS.some((a) => a.key === key)) setSelectedAgent(key);
  };

  const canSend = inputValue.trim().length > 0 || attachedImages.length > 0;

  // ── Reusable input card ────────────────────────────────────────────────────
  const InputCard = (
    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Input card */}
      <div style={{
        background: automateHovered ? '#0B1F5F' : '#1C1D1F',
        borderRadius: 18,
        outline: automateHovered ? '1px #434446 solid' : `1px solid ${BORDER_COLOR}`,
        overflow: 'hidden',
        transition: 'background 0.18s, outline-color 0.18s',
      }}>

        {/* Automate row — only in empty state */}
        {!hasMessages && (
          <>
            <div
              onMouseEnter={() => setAutomateHovered(true)}
              onMouseLeave={() => setAutomateHovered(false)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px', cursor: 'default',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StarFilled style={{ color: ACCENT, fontSize: 12 }} />
                <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>Автоматизировать повторяющиеся задачи</span>
              </div>
              <span style={{ fontSize: 12, color: ACCENT, cursor: 'pointer', whiteSpace: 'nowrap' }}>Попробовать</span>
            </div>
            <div style={{ height: 1, background: BORDER_COLOR }} />
          </>
        )}

        {/* Input area */}
        <div style={{
          background: BG,
          borderRadius: 18,
          padding: '12px 16px 10px',
          outline: inputFocused ? '1px #487EFF solid' : 'none',
          outlineOffset: '-1px',
          transition: 'outline-color 0.15s',
        }}>

          {/* Agent chip — only when agent is selected */}
          {selectedAgent && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 28, padding: '0 8px',
              background: '#1C1D1F', borderRadius: 8, marginBottom: 8,
            }}>
              <SparkleIcon size={14} color={ACCENT} />
              <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {AGENTS_DATA.find(a => a.key === selectedAgent)?.label ?? selectedAgent}
              </span>
              <div
                onClick={() => setSelectedAgent(null)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.1)', cursor: 'pointer',
                  color: TEXT_SECONDARY, fontSize: 9,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.1)'; }}
              >
                ✕
              </div>
            </div>
          )}

          {/* Image previews */}
          {attachedImages.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {attachedImages.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img
                    src={src}
                    alt=""
                    style={{ height: 60, maxWidth: 90, borderRadius: 6, objectFit: 'cover', border: `1px solid ${BORDER_COLOR}`, display: 'block' }}
                  />
                  <div
                    onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{
                      position: 'absolute', top: -4, right: -4,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#3A3B3D', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 9, color: TEXT_SECONDARY,
                    }}
                  >
                    ✕
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* File chips */}
          {attachedFiles.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              {attachedFiles.map((f, i) => (
                <div key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  height: 26, padding: '0 8px',
                  background: '#1C1D1F', border: `1px solid ${BORDER_COLOR}`,
                  borderRadius: 6, fontSize: 12, color: TEXT_SECONDARY,
                }}>
                  <PaperClipOutlined style={{ fontSize: 11 }} />
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <div
                    onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ cursor: 'pointer', fontSize: 10, marginLeft: 2, color: TEXT_PLACEHOLDER }}
                  >✕</div>
                </div>
              ))}
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isListening ? 'Слушаю...' : 'Напишите сообщение или введите / для команд'}
            rows={2}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendWith();
              }
            }}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', fontSize: 13, color: isListening ? ACCENT : TEXT_PRIMARY,
              fontFamily: 'inherit', lineHeight: 1.5, width: '100%', padding: 0,
            }}
          />

          {/* Footer row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>

            {/* Left: + dropdown */}
            <Dropdown
              menu={{ items: dropdownItems, onClick: onDropdownClick }}
              trigger={['click']}
              placement="topLeft"
            >
              <div style={{
                width: 24, height: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: TEXT_SECONDARY, fontSize: 14,
                borderRadius: 5,
                transition: 'color 0.15s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.color = TEXT_PRIMARY; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.color = TEXT_SECONDARY; }}
              >
                <PlusOutlined />
              </div>
            </Dropdown>

            {/* Right: voice + send */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tooltip title={isListening ? 'Остановить запись' : 'Голосовой ввод'}>
                <div
                  onClick={toggleVoice}
                  style={{
                    width: 24, height: 24,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    color: isListening ? '#F04438' : TEXT_SECONDARY,
                    fontSize: 14,
                    transition: 'color 0.15s',
                  }}
                >
                  {isListening ? <StopOutlined /> : <AudioOutlined />}
                </div>
              </Tooltip>

              {canSend && (
                <Tooltip title="Отправить">
                  <div
                    onClick={() => handleSendWith()}
                    style={{
                      width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: ACCENT, fontSize: 14,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <SendOutlined />
                  </div>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <span style={{ fontSize: 11, color: TEXT_PLACEHOLDER, textAlign: 'center' }}>
        ИИ может ошибаться. Проверяйте важные данные.
      </span>
    </div>
  );

  // ── Top bar ─────────────────────────────────────────────────────────────────
  const TopBar = (
    <div
      onMouseDown={onDragBarMouseDown}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px', flexShrink: 0,
        cursor: mode === 'floating' ? 'grab' : 'default',
        userSelect: 'none',
      }}
    >
      <div data-no-drag><IconBtn icon={<FormOutlined />} tooltip="Новый чат" onClick={() => { createSession(); setAttachedImages([]); setInputValue(''); setSelectedAgent(null); setView('chat'); }} /></div>
      <div data-no-drag style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {!isAssistantPage && (
          <IconBtn icon={<HistoryOutlined />} tooltip="История чатов" active={view === 'history'} onClick={() => setView((v) => v === 'history' ? 'chat' : 'history')} />
        )}
        {!hideWindowControls && (
          <>
            <IconBtn
              icon={<LayoutOutlined />}
              tooltip={mode === 'sidebar' ? 'Открыть как окно' : 'Прикрепить справа'}
              onClick={() => onChangeMode(mode === 'sidebar' ? 'floating' : 'sidebar')}
            />
            <IconBtn icon={<CloseOutlined />} tooltip="Закрыть" onClick={() => onChangeMode('closed')} />
          </>
        )}
      </div>
    </div>
  );

  // ── Assistant page: 2-column layout ─────────────────────────────────────────
  if (isAssistantPage) {
    return (
      <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
        {/* Left sidebar: history — spans full height so borderRight goes edge to edge */}
        <AssistantLeftSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onNewChat={() => { createSession(); setAttachedImages([]); setInputValue(''); setSelectedAgent(null); }}
          onSelectSession={(id) => switchSession(id)}
        />

        {/* Right: TopBar + content — glow lives here so it never bleeds into sidebar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
          {!hasMessages && GlowBg}

          {/* TopBar above the glow */}
          <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
            {TopBar}
          </div>

          {/* Main content: centered column — above the glow */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignItems: 'center', position: 'relative', zIndex: 1 }}>

            {/* Center: messages / empty state */}
            <div style={{ flex: 1, overflow: 'hidden', width: '100%', maxWidth: 760, display: 'flex', flexDirection: 'column' }}>
              {!hasMessages ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  padding: '32px 24px',
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
                    <span style={{ color: TEXT_PRIMARY, fontSize: 22, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
                      Над чем будем<br />работать сегодня?
                    </span>
                    <AgentCards onSelect={handleAgentSelect} />
                  </div>
                </div>
              ) : (
                <div className="content-scroll" style={{ flex: 1, padding: '24px 24px 8px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
                  {messages.map((msg) =>
                    msg.role === 'user'
                      ? <UserBubble key={msg.id} msg={msg} />
                      : <AssistantBubble key={msg.id} msg={msg} chipMap={chipMap} onMetricClick={handleMetricClick} onSend={handleSendWith} />,
                  )}
                                    <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input — constrained, centered */}
            <div style={{ width: '100%', maxWidth: 760, padding: '0 24px 20px', flexShrink: 0 }}>
              {isGenerating && <div className="ai-generating-bar" style={{ marginBottom: 10 }} />}
              {InputCard}
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImageFile} />
        <input ref={fileDocInputRef} type="file" accept=".pdf,.txt,.md,.csv,.json,.doc,.docx,.xls,.xlsx" multiple style={{ display: 'none' }} onChange={handleDocFile} />
      </div>
    );
  }

  // ── Sidebar / floating layout ────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {!hasMessages && view !== 'history' && GlowBg}
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>{TopBar}</div>

      {/* ── Center: history / empty state / message list ── */}
      <div style={{
        flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
      }}>
        {view === 'history' ? (
          <HistoryPanel
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelect={(id) => { switchSession(id); setView('chat'); }}
          />
        ) : !hasMessages ? (
          /* Empty state */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '24px 20px', position: 'relative',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
              <JumpingDots />
              <span style={{ color: TEXT_PRIMARY, fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
                Что вы хотите узнать?
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <div
                    key={s}
                    onClick={() => setInputValue(s)}
                    style={{
                      height: 32, padding: '0 14px', borderRadius: 8,
                      outline: `1px solid ${BORDER_COLOR}`,
                      display: 'inline-flex', alignItems: 'center',
                      cursor: 'pointer', color: TEXT_SECONDARY, fontSize: 13,
                      background: 'transparent', transition: 'background 0.15s', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="content-scroll" style={{ flex: 1, padding: '16px 14px 8px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
            {messages.map((msg) =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AssistantBubble key={msg.id} msg={msg} chipMap={chipMap} onMetricClick={handleMetricClick} onSend={handleSendWith} />,
            )}
                        <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Bottom section ── */}
      <div style={{ padding: '0 14px 12px', flexShrink: 0, position: 'relative', zIndex: 1 }}>
        {isGenerating && <div className="ai-generating-bar" style={{ marginBottom: 8 }} />}
        {InputCard}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleImageFile}
      />
    </div>
  );
}

// ── Background glow element ──────────────────────────────────────────────────
const GlowBg = (
  <div style={{
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '50%',
    background: 'radial-gradient(ellipse at 50% 100%, #1a3a8a 0%, #0a1f5c 40%, transparent 70%)',
    filter: 'blur(56px)', pointerEvents: 'none', zIndex: 0,
    opacity: 0.25,
  }} />
);

// Used inside PanelContent where hasMessages is known

// ── Shell wrappers (sidebar / floating) ─────────────────────────────────────
export default function AIPanelSider({ mode, onChangeMode, expanded, hideWindowControls }: AIPanelSiderProps) {
  const [pos, setPos] = useState(() => ({
    x: window.innerWidth - 372,
    y: Math.round(window.innerHeight * 0.17),
  }));

  const commonStyle: React.CSSProperties = {
    background: BG, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', borderRadius: 12, border: `1px solid ${BORDER_COLOR}`,
  };

  const onDragBarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    e.preventDefault();
    const origin = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    const onMove = (ev: MouseEvent) => {
      setPos({ x: origin.px + ev.clientX - origin.mx, y: origin.py + ev.clientY - origin.my });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  if (mode === 'floating') {
    return (
      <div style={{
        ...commonStyle,
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 360,
        height: '66vh',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        zIndex: 1000,
      }}>
        <PanelContent mode={mode} onChangeMode={onChangeMode} onDragBarMouseDown={onDragBarMouseDown} />
      </div>
    );
  }

  return (
    <div style={{ ...commonStyle, ...(expanded ? { flex: 1 } : { width: 320, flexShrink: 0 }), height: '100%' }}>
      <PanelContent mode={mode} onChangeMode={onChangeMode} {...(hideWindowControls ? { hideWindowControls: true } : {})} />
    </div>
  );
}

export function AIPanelFAB({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip title="Открыть ИИ-помощник" placement="left">
      <button
        onClick={onClick}
        className="ai-fab-btn"
        style={{ position: 'fixed', bottom: 24, right: 24, width: 48, height: 48, borderRadius: '50%' }}
      >
        <span>
          <SparkleIcon size={20} color="#fff" />
        </span>
      </button>
    </Tooltip>
  );
}
