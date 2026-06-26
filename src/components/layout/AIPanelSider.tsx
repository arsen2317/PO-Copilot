import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useQuery } from '@tanstack/react-query';
import { streamChat } from '../../lib/claude';
import { TOOL_DEFINITIONS, executeTool } from '../../lib/tools';
import type { ChatMessage, ToolUseBlock } from '../../lib/claude';
import { getMetricDefinitions } from '../../data/api/metric-definitions';
import { useUIStore } from '../../store/uiStore';
import type { ChatMessage as StoredChatMessage, ChatSession } from '../../store/uiStore';
import {
  ApiOutlined,
  AudioOutlined,
  BarChartOutlined,
  CloseOutlined,
  CodeOutlined,
  FileImageOutlined,
  FormOutlined,
  HistoryOutlined,
  LayoutOutlined,
  PaperClipOutlined,
  PlusOutlined,
  RobotOutlined,
  SendOutlined,
  StarFilled,
  StopOutlined,
} from '@ant-design/icons';
import { Dropdown, Tooltip } from 'antd';

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
}

type LocalMessage = StoredChatMessage;

const SYSTEM_PROMPT = `Ты ИИ-ассистент встроенный в «Барометр» — платформу продуктовой аналитики для команды дебетовых карт. Помогаешь продуктовым менеджерам анализировать метрики, находить аномалии, приоритизировать задачи и принимать решения на основе данных.

Правила форматирования:
- Используй инструменты для получения данных перед ответом.
- Отвечай кратко и по делу. Всегда на русском языке.
- Markdown: заголовки (###), жирный (**текст**), списки, таблицы для сравнений.
- Никаких эмодзи, никаких декоративных символов (❌ ✅ 🔴 и т.д.).
- Никаких горизонтальных разделителей (---) между абзацами без необходимости.
- Числа и метрики — конкретно, с единицами измерения.

Интерактивные ссылки на метрики:
Когда ссылаешься на конкретную метрику из данных, оборачивай её id в backticks.
Например: \`active_cards\`, \`nps_general\`, \`churn_rate\`.
Это создаёт кликабельный чип — пользователь нажимает и попадает на эту метрику в дашборде.
Используй id именно так, как он пришёл из инструмента get_metrics (поле id).`;

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
function AssistantBubble({ msg, metricMap, onMetricClick }: {
  msg: LocalMessage;
  metricMap: Map<string, string>;
  onMetricClick: (id: string) => void;
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
              const metricName = metricMap.get(id);
              if (metricName) {
                return (
                  <span
                    onClick={() => onMetricClick(id)}
                    title="Открыть на дашборде"
                    style={{
                      display: 'inline-block',
                      background: '#242526',
                      border: `1px solid #3A3B3D`,
                      borderRadius: 5,
                      padding: '0px 6px',
                      fontSize: 12,
                      color: TEXT_PRIMARY,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      lineHeight: '20px',
                      verticalAlign: 'middle',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = '#2D2E30';
                      (e.currentTarget as HTMLSpanElement).style.borderColor = ACCENT;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLSpanElement).style.background = '#242526';
                      (e.currentTarget as HTMLSpanElement).style.borderColor = '#3A3B3D';
                    }}
                  >
                    {metricName}
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

// ── Assistant typing dots ────────────────────────────────────────────────────
function AssistantTyping() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16, height: 20 }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          style={{ width: 6, height: 6, borderRadius: '50%', background: TEXT_SECONDARY }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 8px' }}>
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

// ── Main panel content ───────────────────────────────────────────────────────
function PanelContent({ onChangeMode, mode, onDragBarMouseDown }: {
  onChangeMode: (m: AIPanelMode) => void;
  mode: 'sidebar' | 'floating';
  onDragBarMouseDown?: (e: React.MouseEvent) => void;
}) {
  const navigate = useNavigate();
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
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [automateHovered, setAutomateHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { data: metricDefinitions } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: getMetricDefinitions,
  });
  const metricMap = new Map(
    (metricDefinitions ?? []).map((m) => [m.id, m.name]),
  );

  const handleMetricClick = (id: string) => {
    setFocusedMetric(id);
    navigate('/');
  };

  const hasMessages = messages.length > 0 || isThinking;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (hasMessages) setAutomateHovered(false);
  }, [hasMessages]);

  // ── Send message ────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text && attachedImages.length === 0) return;
    if (isThinking) return;

    const newMsg: LocalMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      ...(attachedImages.length > 0 && { images: [...attachedImages] }),
    };

    // Auto-title the session from the first user message
    if (messages.length === 0 && text) {
      setSessionTitle(activeSessionId, text.length > 42 ? text.slice(0, 42) + '…' : text);
    }

    // Snapshot current messages before state update (closure capture)
    const prevMessages = messages;
    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setAttachedImages([]);
    setIsThinking(true);

    const abort = new AbortController();
    abortControllerRef.current = abort;

    // Convert a local message to Anthropic API content
    const toApiContent = (m: LocalMessage): string | object[] => {
      if (m.role === 'user' && m.images && m.images.length > 0) {
        const parts: object[] = m.images.flatMap((img) => {
          const match = img.match(/^data:([^;]+);base64,(.+)$/);
          return match
            ? [{ type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } }]
            : [];
        });
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
          system: SYSTEM_PROMPT,
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
      key: 'connectors',
      label: 'Коннекторы',
      icon: <ApiOutlined />,
    },
    {
      key: 'commands',
      label: 'Команды',
      icon: <CodeOutlined />,
    },
  ];

  const onDropdownClick = ({ key }: { key: string }) => {
    if (key === 'image') fileInputRef.current?.click();
    // 'file', 'connectors', 'commands' — stubs for future phases
  };

  const canSend = inputValue.trim().length > 0 || attachedImages.length > 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Top bar (draggable handle in floating mode) ── */}
      <div
        onMouseDown={onDragBarMouseDown}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', flexShrink: 0,
          cursor: mode === 'floating' ? 'grab' : 'default',
          userSelect: 'none',
        }}
      >
        <div data-no-drag><IconBtn icon={<FormOutlined />} tooltip="Новый чат" onClick={() => { createSession(); setAttachedImages([]); setInputValue(''); setView('chat'); }} /></div>
        <div data-no-drag style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconBtn icon={<HistoryOutlined />} tooltip="История чатов" active={view === 'history'} onClick={() => setView((v) => v === 'history' ? 'chat' : 'history')} />
          <IconBtn
            icon={<LayoutOutlined />}
            tooltip={mode === 'sidebar' ? 'Открыть как окно' : 'Прикрепить справа'}
            onClick={() => onChangeMode(mode === 'sidebar' ? 'floating' : 'sidebar')}
          />
          <IconBtn icon={<CloseOutlined />} tooltip="Закрыть" onClick={() => onChangeMode('closed')} />
        </div>
      </div>

      {/* ── Center: history / empty state / message list ── */}
      <div style={{
        flex: 1, overflow: 'auto', position: 'relative',
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
            {/* Blue glow */}
            <div style={{
              position: 'absolute', left: '50%', top: '38%',
              transform: 'translate(-50%, -50%)',
              width: 156, height: 156, background: '#09225C',
              borderRadius: 9999, filter: 'blur(62px)', pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
              <JumpingDots />
              <span style={{ color: TEXT_PRIMARY, fontSize: 18, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
                Что вы хотите узнать?
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                {SUGGESTIONS.map((s) => (
                  <div
                    key={s}
                    onClick={() => setInputValue(s)}
                    style={{
                      height: 32, padding: '0 8px', borderRadius: 8,
                      outline: `1px solid ${BORDER_COLOR}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: TEXT_SECONDARY, fontSize: 13, textAlign: 'center',
                      background: 'transparent', transition: 'background 0.15s',
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
          <div style={{ flex: 1, padding: '16px 14px 8px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0 }}>
            {messages.map((msg) =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AssistantBubble key={msg.id} msg={msg} metricMap={metricMap} onMetricClick={handleMetricClick} />,
            )}
            {isThinking && <AssistantTyping />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>


      {/* ── Bottom section ── */}
      <div style={{ padding: '0 14px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

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

            {/* Context chip */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 28, padding: '0 8px',
              background: '#1C1D1F', borderRadius: 8, marginBottom: 8,
            }}>
              <BarChartOutlined style={{ color: ACCENT, fontSize: 13 }} />
              <span style={{ fontSize: 12, color: TEXT_PRIMARY, fontWeight: 500, whiteSpace: 'nowrap' }}>
                Продуктовая аналитика
              </span>
            </div>

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

            {/* Textarea */}
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isListening ? '🎙 Слушаю...' : 'Напишите сообщение или введите / для команд'}
              rows={2}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
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
                      onClick={handleSend}
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

// ── Shell wrappers (sidebar / floating) ─────────────────────────────────────
export default function AIPanelSider({ mode, onChangeMode }: AIPanelSiderProps) {
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
    <div style={{ ...commonStyle, width: 320, flexShrink: 0, height: '100%' }}>
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
          position: 'fixed', bottom: 24, right: 24, width: 48, height: 48,
          borderRadius: '50%', background: ACCENT, border: 'none',
          cursor: 'pointer', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <RobotOutlined style={{ fontSize: 22, color: '#fff' }} />
      </button>
    </Tooltip>
  );
}
