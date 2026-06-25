import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { streamChat } from '../../lib/claude';
import { TOOL_DEFINITIONS, executeTool } from '../../lib/tools';
import type { ChatMessage, ToolUseBlock } from '../../lib/claude';
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

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  streaming?: boolean;
}

const SYSTEM_PROMPT = `Ты ИИ-ассистент встроенный в «Барометр» — платформу продуктовой аналитики для команды дебетовых карт. Помогаешь продуктовым менеджерам анализировать метрики, находить аномалии, приоритизировать задачи и принимать решения на основе данных.

Используй инструменты для получения актуальных данных перед ответом. Отвечай кратко и по делу. Всегда отвечай на русском языке. Форматируй ответы с помощью markdown: заголовки, списки, выделение жирным.`;

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
function AssistantBubble({ msg }: { msg: LocalMessage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: ACCENT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
      }}>
        <RobotOutlined style={{ fontSize: 12, color: '#fff' }} />
      </div>
      <div style={{
        background: '#1C1D1F', border: `1px solid ${BORDER_COLOR}`,
        borderRadius: '3px 12px 12px 12px',
        padding: '10px 14px',
        fontSize: 13, color: TEXT_PRIMARY, lineHeight: 1.6,
        maxWidth: '90%', wordBreak: 'break-word',
      }}>
        <ReactMarkdown
          components={{
            p: ({ children }) => <p style={{ margin: '0 0 6px' }}>{children}</p>,
            ul: ({ children }) => <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{children}</ul>,
            ol: ({ children }) => <ol style={{ margin: '4px 0', paddingLeft: 18 }}>{children}</ol>,
            li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
            strong: ({ children }) => <strong style={{ color: '#fff' }}>{children}</strong>,
            h3: ({ children }) => <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4, marginTop: 8 }}>{children}</div>,
            h4: ({ children }) => <div style={{ fontWeight: 600, color: TEXT_PRIMARY, marginBottom: 2, marginTop: 6 }}>{children}</div>,
            code: ({ children }) => <code style={{ background: '#2D2E30', borderRadius: 4, padding: '1px 5px', fontSize: 12, color: '#A8C7FA' }}>{children}</code>,
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
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', background: ACCENT,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <RobotOutlined style={{ fontSize: 12, color: '#fff' }} />
      </div>
      <div style={{
        background: '#1C1D1F', border: `1px solid ${BORDER_COLOR}`,
        borderRadius: '3px 12px 12px 12px',
        padding: '10px 14px',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            style={{ width: 6, height: 6, borderRadius: '50%', background: TEXT_SECONDARY }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main panel content ───────────────────────────────────────────────────────
function PanelContent({ onChangeMode, mode, onDragBarMouseDown }: {
  onChangeMode: (m: AIPanelMode) => void;
  mode: 'sidebar' | 'floating';
  onDragBarMouseDown?: (e: React.MouseEvent) => void;
}) {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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
  const hasMessages = messages.length > 0 || isThinking;

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
        <div data-no-drag><IconBtn icon={<FormOutlined />} tooltip="Новый чат" onClick={() => { setMessages([]); setAttachedImages([]); setInputValue(''); }} /></div>
        <div data-no-drag style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconBtn icon={<HistoryOutlined />} tooltip="История чатов" onClick={() => {}} />
          <IconBtn
            icon={<LayoutOutlined />}
            tooltip={mode === 'sidebar' ? 'Открыть как окно' : 'Прикрепить справа'}
            onClick={() => onChangeMode(mode === 'sidebar' ? 'floating' : 'sidebar')}
          />
          <IconBtn icon={<CloseOutlined />} tooltip="Закрыть" onClick={() => onChangeMode('closed')} />
        </div>
      </div>

      {/* ── Center: empty state or message list ── */}
      <div style={{
        flex: 1, overflow: 'auto', position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {!hasMessages ? (
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
          <div style={{ flex: 1, padding: '16px 14px 8px', overflowY: 'auto' }}>
            {messages.map((msg) =>
              msg.role === 'user'
                ? <UserBubble key={msg.id} msg={msg} />
                : <AssistantBubble key={msg.id} msg={msg} />,
            )}
            {isThinking && <AssistantTyping />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Bottom section ── */}
      <div style={{ padding: '0 14px 12px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Input card */}
        <div style={{ background: BG, borderRadius: 18, outline: `1px solid ${BORDER_COLOR}`, overflow: 'hidden' }}>

          {/* Automate row — only in empty state */}
          {!hasMessages && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
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
          <div style={{ padding: '12px 16px 10px' }}>

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
