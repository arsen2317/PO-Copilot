/**
 * Протокол «браузер ↔ API-сервер» и конвертация в OpenAI-совместимый формат.
 *
 * ЕДИНСТВЕННОЕ место в проекте, которое знает формат провайдера модели.
 * Браузер оперирует нейтральными типами приложения (`AiMessage` и части ниже),
 * сервер переводит их в тело запроса `/v1/chat/completions` и разбирает ответ.
 * Благодаря этому смена провайдера не затрагивает интерфейс.
 *
 * Целевая среда — vLLM (>= 0.19) с моделью Qwen. Особенности vLLM, которые здесь
 * учтены, помечены по тексту: они не всегда очевидны и ломают работу молча.
 */
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  ChatCompletionFunctionTool,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';

// ── Нейтральные типы приложения ──────────────────────────────────────────────

/** Обычный текст сообщения. */
export interface TextPart {
  type: 'text';
  text: string;
}

/** Просьба модели вызвать инструмент (в сообщении ассистента). */
export interface ToolCallPart {
  type: 'tool_call';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Результат выполнения инструмента (браузер присылает в сообщении пользователя). */
export interface ToolResultPart {
  type: 'tool_result';
  tool_call_id: string;
  /** Уже сериализованный JSON результата. */
  content: string;
}

/** Картинка, приложенная пользователем. `data` — base64 без префикса `data:`. */
export interface ImagePart {
  type: 'image';
  mediaType: string;
  data: string;
}

/**
 * Документ, приложенный пользователем (PDF, Word, Excel).
 *
 * TODO(перенос в контур банка): извлечение текста из документов НЕ подключено.
 * В OpenAI-совместимом API нет типа «документ» — веб-интерфейсы, которые «умеют
 * PDF», разбирают файл у себя и подмешивают текст в промпт. Сейчас модель получает
 * честную пометку (см. `describeAttachedFile`), содержимое не выдумывается.
 * Чтобы подключить: base64 файла уже приходит в поле `data` — распарсить его здесь
 * (библиотекой или вызовом сервиса разбора документов в контуре) и вернуть
 * текстовую часть с содержимым вместо пометки. Больше нигде править не нужно.
 */
export interface FilePart {
  type: 'file';
  name: string;
  mediaType: string;
  data?: string;
}

export type MessagePart = TextPart | ToolCallPart | ToolResultPart | ImagePart | FilePart;

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string | MessagePart[];
}

/** Определение инструмента в формате приложения (`src/lib/tools.ts`). */
export interface AiToolDefinition {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

/** Максимум токенов в ответе. Совпадает с прежним значением на Anthropic. */
export const MAX_TOKENS = 4096;

// ── Конвертация сообщений ────────────────────────────────────────────────────

export interface ConvertOptions {
  /** Мультимодальная ли модель. Если нет — картинки заменяются текстовой пометкой. */
  vision: boolean;
}

export interface ConvertResult {
  messages: ChatCompletionMessageParam[];
  /** Замечания о починенной истории — пишутся в лог сервера, юзеру не видны. */
  warnings: string[];
}

/** Человекочитаемый размер по длине base64. */
function base64Size(data: string | undefined): string {
  if (!data) return 'размер неизвестен';
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

/** Пометка о приложенном документе, содержимое которого недоступно модели. */
export function describeAttachedFile(part: FilePart): string {
  return (
    `[Пользователь приложил файл «${part.name}» (${part.mediaType}, ${base64Size(part.data)}). ` +
    'Извлечение содержимого документов в этой сборке не подключено — текст файла тебе недоступен. ' +
    'Не придумывай содержимое: скажи, что не можешь прочитать файл, и попроси прислать текст сообщением.]'
  );
}

/** Пометка о картинке, когда модель без зрения. */
function describeImageWithoutVision(part: ImagePart): string {
  return (
    `[Пользователь приложил изображение (${part.mediaType}, ${base64Size(part.data)}). ` +
    'Текущая модель не поддерживает распознавание изображений. ' +
    'Не придумывай содержимое: скажи, что не видишь картинку, и попроси описать её текстом.]'
  );
}

function toContentParts(parts: MessagePart[], opts: ConvertOptions): ChatCompletionContentPart[] {
  const out: ChatCompletionContentPart[] = [];
  for (const p of parts) {
    if (p.type === 'text') {
      if (p.text) out.push({ type: 'text', text: p.text });
    } else if (p.type === 'image') {
      if (opts.vision) {
        out.push({ type: 'image_url', image_url: { url: `data:${p.mediaType};base64,${p.data}` } });
      } else {
        out.push({ type: 'text', text: describeImageWithoutVision(p) });
      }
    } else if (p.type === 'file') {
      out.push({ type: 'text', text: describeAttachedFile(p) });
    }
  }
  return out;
}

function toToolCalls(parts: ToolCallPart[]): ChatCompletionMessageToolCall[] {
  return parts.map((p) => ({
    id: p.id,
    type: 'function' as const,
    function: { name: p.name, arguments: JSON.stringify(p.input ?? {}) },
  }));
}

/**
 * Нейтральные сообщения приложения → сообщения OpenAI.
 *
 * Ключевое расхождение форматов: результат инструмента у Anthropic приходил одним
 * сообщением пользователя с массивом результатов, а здесь каждый результат — ОТДЕЛЬНОЕ
 * сообщение с ролью `tool`, идущее сразу за сообщением ассистента с вызовами.
 * Несовпадение количества вызовов и результатов даёт 400 и обрывает чат, поэтому
 * пары чинятся принудительно (см. `repairToolPairing`).
 */
export function toOpenAiMessages(
  system: string | undefined,
  messages: AiMessage[],
  opts: ConvertOptions,
): ConvertResult {
  const out: ChatCompletionMessageParam[] = [];
  const warnings: string[] = [];

  if (system) out.push({ role: 'system', content: system });

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      out.push(msg.role === 'assistant' ? { role: 'assistant', content: msg.content } : { role: 'user', content: msg.content });
      continue;
    }

    const parts = msg.content;

    if (msg.role === 'assistant') {
      const text = parts.filter((p): p is TextPart => p.type === 'text').map((p) => p.text).join('');
      const calls = toToolCalls(parts.filter((p): p is ToolCallPart => p.type === 'tool_call'));
      out.push({
        role: 'assistant',
        // Спецификация допускает null, когда ассистент только вызывает инструменты.
        content: text ? text : null,
        ...(calls.length > 0 ? { tool_calls: calls } : {}),
      });
      continue;
    }

    // Сообщение пользователя: результаты инструментов выносятся в отдельные `tool`-сообщения.
    const results = parts.filter((p): p is ToolResultPart => p.type === 'tool_result');
    const rest = parts.filter((p) => p.type !== 'tool_result');

    for (const r of results) {
      out.push({ role: 'tool', tool_call_id: r.tool_call_id, content: r.content });
    }

    if (rest.length > 0) {
      const contentParts = toContentParts(rest, opts);
      if (contentParts.length === 0) continue;
      const allText = contentParts.every((p) => p.type === 'text');
      if (allText) {
        out.push({
          role: 'user',
          content: contentParts.map((p) => (p.type === 'text' ? p.text : '')).join('\n\n'),
        });
      } else {
        out.push({ role: 'user', content: contentParts });
      }
    }
  }

  return { messages: repairToolPairing(out, warnings), warnings };
}

/**
 * Гарантирует, что у каждого вызова инструмента есть ровно один результат сразу следом.
 * Недостающие результаты синтезируются, «осиротевшие» — выбрасываются. Иначе сервер
 * модели отвечает 400 и диалог обрывается на пустом месте.
 */
export function repairToolPairing(
  messages: ChatCompletionMessageParam[],
  warnings: string[],
): ChatCompletionMessageParam[] {
  const out: ChatCompletionMessageParam[] = [];
  let pending: string[] = [];

  const flushPending = () => {
    for (const id of pending) {
      warnings.push(`нет результата для вызова ${id} — подставлен заглушечный`);
      out.push({
        role: 'tool',
        tool_call_id: id,
        content: JSON.stringify({ error: 'Результат инструмента отсутствует' }),
      });
    }
    pending = [];
  };

  for (const msg of messages) {
    if (msg.role === 'tool') {
      const idx = pending.indexOf(msg.tool_call_id);
      if (idx === -1) {
        warnings.push(`результат ${msg.tool_call_id} без соответствующего вызова — отброшен`);
        continue;
      }
      pending.splice(idx, 1);
      out.push(msg);
      continue;
    }

    if (pending.length > 0) flushPending();
    out.push(msg);

    if (msg.role === 'assistant' && Array.isArray(msg.tool_calls)) {
      pending = msg.tool_calls.map((c) => c.id);
    }
  }

  if (pending.length > 0) flushPending();
  return out;
}

// ── Конвертация инструментов ─────────────────────────────────────────────────

/**
 * Определения инструментов приложения → формат OpenAI.
 * Поля берутся поимённо: любые лишние ключи отсекаются (часть серверов
 * строго валидирует схему и отвечает 400 на неизвестные поля).
 */
export function toOpenAiTools(tools: AiToolDefinition[] | undefined): ChatCompletionFunctionTool[] | undefined {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
      parameters: t.parameters ?? { type: 'object', properties: {}, required: [] },
    },
  }));
}

// ── Сборка потоковых вызовов инструментов ────────────────────────────────────

export interface ToolCallDelta {
  index?: number;
  id?: string;
  function?: { name?: string; arguments?: string };
}

export interface CollectedToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  /** Аргументы пришли, но не разобрались как JSON (обрыв по лимиту токенов и т.п.). */
  malformedArguments: boolean;
}

/**
 * Накопитель вызовов инструментов из потока.
 *
 * Особенности, из-за которых нельзя просто взять последний чанк:
 *  - аргументы приходят фрагментами строки и склеиваются;
 *  - `id` и `name` обычно приходят только в ПЕРВОМ фрагменте вызова;
 *  - ключ вызова — `index`, а не `id` (по `id` собирать нельзя, его может не быть);
 *  - часть серверов повторяет полное имя в каждом фрагменте, часть — дробит его.
 */
export class ToolCallAccumulator {
  private byIndex = new Map<number, { id: string; name: string; args: string }>();

  get size(): number {
    return this.byIndex.size;
  }

  add(deltas: ToolCallDelta[] | undefined): void {
    if (!deltas) return;
    for (const d of deltas) {
      const index = typeof d.index === 'number' ? d.index : 0;
      const cur = this.byIndex.get(index) ?? { id: '', name: '', args: '' };
      if (d.id) cur.id = d.id;
      const name = d.function?.name;
      if (name) {
        // Пусто — берём как есть; повтор того же имени — игнорируем; иначе имя
        // пришло по частям и фрагменты склеиваются.
        if (!cur.name) cur.name = name;
        else if (cur.name !== name) cur.name += name;
      }
      if (d.function?.arguments) cur.args += d.function.arguments;
      this.byIndex.set(index, cur);
    }
  }

  collect(warnings: string[] = []): CollectedToolCall[] {
    const out: CollectedToolCall[] = [];
    for (const index of [...this.byIndex.keys()].sort((a, b) => a - b)) {
      const cur = this.byIndex.get(index);
      if (!cur) continue;
      if (!cur.name) {
        warnings.push(`вызов инструмента #${index} без имени — отброшен`);
        continue;
      }
      const raw = cur.args.trim();
      let input: Record<string, unknown> = {};
      let malformed = false;
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            input = parsed as Record<string, unknown>;
          } else {
            malformed = true;
          }
        } catch {
          malformed = true;
        }
      }
      if (malformed) {
        warnings.push(`аргументы вызова ${cur.name} не разобрались как JSON — инструмент получит пустой ввод`);
      }
      out.push({
        // Некоторые серверы не присылают id — подставляем стабильный, иначе
        // ответный `tool_call_id` будет пустым и следующий запрос упадёт с 400.
        id: cur.id || `call_${index}`,
        name: cur.name,
        input,
        malformedArguments: malformed,
      });
    }
    return out;
  }
}

// ── Фильтр размышлений ───────────────────────────────────────────────────────

const THINK_OPEN = '<think>';
const THINK_CLOSE = '</think>';

/** Длина хвоста, который может оказаться началом тега и должен подождать следующий чанк. */
function heldSuffixLength(s: string, tag: string): number {
  const max = Math.min(s.length, tag.length - 1);
  for (let n = max; n > 0; n--) {
    if (tag.startsWith(s.slice(s.length - n))) return n;
  }
  return 0;
}

/**
 * Вырезает блоки `<think>…</think>` из потока текста.
 *
 * Подстраховка: у заказчика reasoning-parser включён и размышления по умолчанию
 * выключены, поэтому рассуждения приходят отдельным полем `reasoning_content`.
 * Но при запуске без парсера они попадают прямо в текст — и пользователь увидит
 * в чате внутренний монолог модели. Теги могут быть разорваны между чанками,
 * поэтому фильтр держит незавершённый хвост до следующего вызова.
 */
export class ThinkTagFilter {
  private buffer = '';
  private inside = false;

  feed(chunk: string): string {
    this.buffer += chunk;
    let out = '';
    for (;;) {
      if (this.inside) {
        const i = this.buffer.indexOf(THINK_CLOSE);
        if (i === -1) {
          const hold = heldSuffixLength(this.buffer, THINK_CLOSE);
          this.buffer = hold > 0 ? this.buffer.slice(this.buffer.length - hold) : '';
          break;
        }
        this.buffer = this.buffer.slice(i + THINK_CLOSE.length);
        this.inside = false;
        continue;
      }
      const i = this.buffer.indexOf(THINK_OPEN);
      if (i === -1) {
        const hold = heldSuffixLength(this.buffer, THINK_OPEN);
        out += this.buffer.slice(0, this.buffer.length - hold);
        this.buffer = hold > 0 ? this.buffer.slice(this.buffer.length - hold) : '';
        break;
      }
      out += this.buffer.slice(0, i);
      this.buffer = this.buffer.slice(i + THINK_OPEN.length);
      this.inside = true;
    }
    return out;
  }

  /** Остаток после конца потока. Незакрытый блок размышлений выбрасывается. */
  flush(): string {
    const rest = this.inside ? '' : this.buffer;
    this.buffer = '';
    this.inside = false;
    return rest;
  }
}

// ── Ошибки ───────────────────────────────────────────────────────────────────

export interface ModelErrorInfo {
  /** Текст для пользователя. */
  userMessage: string;
  /** Поля для лога сервера (`pm2 logs po-copilot-api`). */
  log: Record<string, unknown>;
}

/** Разбор ошибки обращения к модели в понятное сообщение + структурированный лог. */
export function describeModelError(err: unknown): ModelErrorInfo {
  if (err instanceof OpenAI.APIError) {
    const status = err.status;
    const log = { status, code: err.code, type: err.type, requestId: err.requestID, message: err.message };
    if (status === 429) {
      return { userMessage: 'Модель перегружена запросами (лимит). Повторите через несколько секунд.', log };
    }
    if (status === 503 || status === 529) {
      return { userMessage: 'Сервис модели временно перегружен. Повторите запрос.', log };
    }
    if (status === 401 || status === 403) {
      return { userMessage: `Ошибка авторизации при обращении к модели (${status}). Проверьте AI_API_KEY.`, log };
    }
    if (status === 404) {
      return {
        userMessage: 'Модель не найдена (404). Проверьте AI_MODEL и AI_BASE_URL — адрес должен оканчиваться на /v1.',
        log,
      };
    }
    if (status === 400) {
      return {
        userMessage: `Модель отклонила запрос (400): ${err.message}. Частые причины — несовместимая схема инструментов или неподдерживаемый тип вложения.`,
        log,
      };
    }
    return { userMessage: `Ошибка обращения к модели${status ? ` (${status})` : ''}: ${err.message}`, log };
  }
  if (err instanceof Error) {
    return { userMessage: `Ошибка обращения к модели: ${err.message}`, log: { message: err.message } };
  }
  return { userMessage: 'Ошибка обращения к модели.', log: { error: String(err) } };
}
