/**
 * Транспорт до ИИ-ассистента.
 *
 * Браузер не знает, какой провайдер модели стоит за `/api/chat`: он оперирует
 * нейтральными типами приложения, а конвертацию в формат провайдера делает
 * сервер (`scripts/lib/ai-protocol.ts`).
 *
 * Формат событий стрима (SSE), которые присылает сервер:
 *   data: {"type":"text","text":"…"}                          — кусок текста ответа
 *   data: {"type":"done","finishReason":"…","toolCalls":[…]}  — конец хода
 *   data: {"type":"error","error":"…"}                        — ошибка обращения к модели
 *   data: [DONE]                                              — конец потока
 *
 * Вызовы инструментов собирает сервер и присылает готовыми — разбирать их
 * здесь по кусочкам не нужно.
 */
import { getToken } from '../features/auth/auth';

// ── Части сообщения ──────────────────────────────────────────────────────────

export interface TextBlock {
  type: 'text';
  text: string;
}

/** Просьба модели вызвать инструмент. */
export interface ToolCallBlock {
  type: 'tool_call';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Результат выполнения инструмента, отправляемый обратно модели. */
export interface ToolResultPart {
  type: 'tool_result';
  tool_call_id: string;
  content: string;
}

/** Картинка пользователя. `data` — base64 без префикса `data:`. */
export interface ImagePart {
  type: 'image';
  mediaType: string;
  data: string;
}

/** Документ пользователя (PDF, Word, Excel). */
export interface FilePart {
  type: 'file';
  name: string;
  mediaType: string;
  data: string;
}

/** Блоки, из которых состоит ответ модели. */
export type ContentBlock = TextBlock | ToolCallBlock;

export type MessagePart = TextBlock | ToolCallBlock | ToolResultPart | ImagePart | FilePart;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | MessagePart[];
}

export interface ChatOptions {
  messages: ChatMessage[];
  system?: string;
  tools?: object[];
  onTextDelta?: (text: string) => void;
  signal?: AbortSignal;
}

export interface ChatResult {
  /** Текст и вызовы инструментов — годится как content сообщения ассистента. */
  blocks: ContentBlock[];
  /** Вызовы инструментов этого хода. Пустой массив = ход финальный. */
  toolCalls: ToolCallBlock[];
  /** Причина завершения от сервера модели: stop | tool_calls | length | … */
  finishReason: string;
}

export async function streamChat(options: ChatOptions): Promise<ChatResult> {
  const { messages, system, tools, onTextDelta, signal } = options;

  const token = getToken();
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ messages, system, tools }),
    ...(signal != null && { signal }),
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => response.statusText);
    throw new Error(`API error ${response.status}: ${text}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  let text = '';
  let toolCalls: ToolCallBlock[] = [];
  let finishReason = 'stop';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(data) as Record<string, unknown>;
      } catch {
        continue;
      }

      const type = event.type as string;

      if (type === 'text') {
        const delta = event.text as string | undefined;
        if (delta) {
          text += delta;
          onTextDelta?.(delta);
        }
      }

      if (type === 'done') {
        finishReason = (event.finishReason as string | undefined) ?? 'stop';
        const calls =
          (event.toolCalls as Array<{ id: string; name: string; input?: Record<string, unknown> }> | undefined) ?? [];
        toolCalls = calls.map((c) => ({ type: 'tool_call', id: c.id, name: c.name, input: c.input ?? {} }));
      }

      if (type === 'error') {
        throw new Error((event.error as string | undefined) ?? 'Ошибка обращения к модели');
      }
    }
  }

  const blocks: ContentBlock[] = [...(text ? [{ type: 'text' as const, text }] : []), ...toolCalls];
  return { blocks, toolCalls, finishReason };
}
