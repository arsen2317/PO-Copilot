/**
 * API-сервер «Барометр» — единый бэкенд для dev и production.
 *
 * Запуск:
 *   dev  — `npm run dev` (concurrently с Vite, порт 3001)
 *   prod — PM2 через `scripts/start-api.sh` (порт 3001, nginx проксирует /api/)
 *
 * Эндпоинты: /api/auth (логин), /api/chat (стриминг ответа модели), /api/search (Brave).
 * Переменные окружения — см. `.env.example` и раздел README «Переменные окружения».
 *
 * Модель вызывается через OpenAI-совместимый API (`{AI_BASE_URL}/chat/completions`).
 * Вся конвертация форматов — в `scripts/lib/ai-protocol.ts`, это единственное место,
 * знающее формат провайдера.
 */
import express from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'node:url';
import { signToken, verifyToken, readTokenSubject } from './lib/token';
import { buildAuditEvent, isKnownAction, writeAuditEvent, type AuditRequest } from './lib/audit';
import {
  MAX_TOKENS,
  ToolCallAccumulator,
  ThinkTagFilter,
  describeModelError,
  toOpenAiMessages,
  toOpenAiTools,
  type AiMessage,
  type AiToolDefinition,
  type ToolCallDelta,
} from './lib/ai-protocol';

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
}

/** Значение переменной окружения как флаг. */
function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

/** Событие нашего SSE-протокола (браузер разбирает его в `src/lib/ai.ts`). */
type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'done'; finishReason: string; toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> }
  | { type: 'error'; error: string };

export function createApp() {
  const app = express();

  // Позади nginx или ingress `req.ip` по умолчанию равен адресу прокси, а не
  // пользователя — в аудит-логе такое поле бесполезно. Включается ЯВНО, потому что
  // слепое доверие заголовку X-Forwarded-For позволяет подделать адрес, если прокси
  // на самом деле нет. Значения: 1/true — доверять; либо строка express
  // (например loopback или число хопов).
  const trustProxy = process.env.TRUST_PROXY;
  if (trustProxy) {
    app.set('trust proxy', trustProxy === '1' || trustProxy === 'true' ? true : trustProxy);
  }

  app.use(express.json({ limit: '10mb' }));

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  app.options(/.*/, (_req, res) => res.sendStatus(204));

  // Проба живости для контейнера (docker HEALTHCHECK, kubernetes probe). Без авторизации,
  // ничего о конфигурации не раскрывает.
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // ── Auth endpoint ──────────────────────────────────────────────────────────
  app.post('/api/auth', async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const validLogin = process.env.APP_LOGIN;
    const validPassword = process.env.APP_PASSWORD;
    const secret = process.env.APP_SESSION_SECRET;

    if (!validLogin || !validPassword || !secret) {
      res.status(500).json({ error: 'Server not configured' });
      return;
    }

    if (username !== validLogin || password !== validPassword) {
      await new Promise((r) => setTimeout(r, 300));
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = await signToken(username, secret);
    res.json({ token });
  });

  // ── Chat endpoint ──────────────────────────────────────────────────────────
  app.post('/api/chat', async (req, res) => {
    const secret = process.env.APP_SESSION_SECRET;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!secret || !token || !(await verifyToken(token, secret))) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Конфигурацию проверяем ДО перехода в режим стрима — иначе ошибку придётся
    // отдавать событием, и в интерфейсе она выглядит как сбой модели, а не как
    // незаполненный .env.local.
    const baseURL = process.env.AI_BASE_URL;
    const model = process.env.AI_MODEL;
    if (!baseURL) {
      res.status(500).json({ error: 'AI_BASE_URL не задан в .env.local (адрес OpenAI-совместимого API, оканчивается на /v1)' });
      return;
    }
    if (!model) {
      res.status(500).json({ error: 'AI_MODEL не задан в .env.local (имя модели на сервере инференса)' });
      return;
    }

    const { messages, system, tools } = req.body as {
      messages: AiMessage[];
      system?: string;
      tools?: AiToolDefinition[];
    };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (event: StreamEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Отмена запроса к модели, если пользователь нажал «стоп» или закрыл вкладку:
    // иначе на локальном сервере инференса зря держится слот генерации.
    const controller = new AbortController();
    let finished = false;
    res.on('close', () => {
      if (!finished) controller.abort();
    });

    const client = new OpenAI({
      // Локальный vLLM часто поднимают без авторизации — пустой ключ там нормален,
      // но SDK требует непустую строку.
      apiKey: process.env.AI_API_KEY || 'not-needed',
      baseURL,
      // Транзиентные 429/5xx и обрывы сети SDK ретраит сам, с экспоненциальным
      // бэкоффом и учётом retry-after. Ретраи происходят до старта стрима.
      maxRetries: 4,
    });

    const vision = envFlag('AI_VISION', false);
    const useStream = envFlag('AI_STREAM', true);
    const enableThinking = envFlag('AI_ENABLE_THINKING', false);

    const converted = toOpenAiMessages(system, messages ?? [], { vision });
    for (const w of converted.warnings) console.warn('[api/chat] история починена:', w);

    const openAiTools = toOpenAiTools(tools);
    const body = {
      model,
      messages: converted.messages,
      max_tokens: MAX_TOKENS,
      ...(openAiTools ? { tools: openAiTools } : {}),
      // Расширение vLLM: включает режим размышлений у Qwen. По умолчанию выключено —
      // размышления кратно увеличивают время ответа и занимают слоты инференса.
      ...(enableThinking ? { chat_template_kwargs: { enable_thinking: true } } : {}),
    };

    const think = new ThinkTagFilter();
    const acc = new ToolCallAccumulator();
    const warnings: string[] = [];
    let finishReason = 'stop';

    try {
      if (useStream) {
        const stream = await client.chat.completions.create(
          { ...body, stream: true } as Parameters<typeof client.chat.completions.create>[0],
          { signal: controller.signal },
        );
        for await (const chunk of stream as AsyncIterable<{
          choices?: Array<{
            delta?: { content?: string | null; tool_calls?: ToolCallDelta[] };
            finish_reason?: string | null;
          }>;
        }>) {
          const choice = chunk.choices?.[0];
          if (!choice) continue;
          // Поле delta.reasoning_content (размышления Qwen) намеренно игнорируется —
          // в чат попадает только видимый ответ.
          const content = choice.delta?.content;
          if (content) {
            const visible = think.feed(content);
            if (visible) send({ type: 'text', text: visible });
          }
          if (choice.delta?.tool_calls) acc.add(choice.delta.tool_calls);
          if (choice.finish_reason) finishReason = choice.finish_reason;
        }
      } else {
        const completion = (await client.chat.completions.create(
          { ...body, stream: false } as Parameters<typeof client.chat.completions.create>[0],
          { signal: controller.signal },
        )) as {
          choices?: Array<{
            message?: { content?: string | null; tool_calls?: Array<{ id?: string; type?: string; function?: { name?: string; arguments?: string } }> };
            finish_reason?: string | null;
          }>;
        };
        const choice = completion.choices?.[0];
        const content = choice?.message?.content;
        if (content) {
          const visible = think.feed(content);
          if (visible) send({ type: 'text', text: visible });
        }
        const calls = choice?.message?.tool_calls ?? [];
        acc.add(
          calls
            .filter((c) => c.type === undefined || c.type === 'function')
            .map((c, i) => ({
              index: i,
              ...(c.id ? { id: c.id } : {}),
              ...(c.function ? { function: c.function } : {}),
            })),
        );
        if (choice?.finish_reason) finishReason = choice.finish_reason;
      }

      const tail = think.flush();
      if (tail) send({ type: 'text', text: tail });

      const toolCalls = acc.collect(warnings);
      for (const w of warnings) console.warn('[api/chat] разбор вызовов:', w);

      // КРИТИЧНО: часть tool-парсеров vLLM отдаёт finish_reason='stop' даже когда
      // вызовы инструментов есть. Признак раунда с инструментами — сам факт вызовов,
      // иначе агентный цикл молча оборвётся и ассистент ответит без данных.
      if (toolCalls.length > 0) finishReason = 'tool_calls';

      send({
        type: 'done',
        finishReason,
        toolCalls: toolCalls.map((c) => ({ id: c.id, name: c.name, input: c.input })),
      });
      res.write('data: [DONE]\n\n');
    } catch (err) {
      // Пользователь закрыл вкладку или нажал «стоп» — это не ошибка, и писать уже некуда.
      if (!controller.signal.aborted) {
        const { userMessage, log } = describeModelError(err);
        console.error('[api/chat] ошибка обращения к модели', log);
        send({ type: 'error', error: userMessage });
      }
    } finally {
      finished = true;
      res.end();
    }
  });

  // ── Audit endpoint ─────────────────────────────────────────────────────────
  // Приём событий аудита от интерфейса (требование ИБ: кто, когда, что изменил,
  // старое → новое). Подробности слоя — в scripts/lib/audit.ts.
  app.post('/api/audit', async (req, res) => {
    const secret = process.env.APP_SESSION_SECRET;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Субъект берём ИЗ ТОКЕНА, а не из тела запроса — иначе «кто» подделывается.
    const actor = secret && token ? await readTokenSubject(token, secret) : null;
    if (!actor) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body as Partial<AuditRequest> | undefined;
    if (!body || typeof body.action !== 'string' || typeof body.target !== 'string') {
      res.status(400).json({ error: 'Требуются поля action и target' });
      return;
    }
    if (!isKnownAction(body.action)) {
      // Строгий словарь: неизвестное действие отклоняем, чтобы в журнал не попадал
      // мусор. Новое событие сначала добавляется в AUDIT_ACTIONS.
      res.status(400).json({ error: `Неизвестное действие аудита: ${body.action}` });
      return;
    }

    const event = buildAuditEvent(
      {
        action: body.action,
        target: body.target,
        ...(body.targetId !== undefined ? { targetId: body.targetId } : {}),
        ...(body.before !== undefined ? { before: body.before } : {}),
        ...(body.after !== undefined ? { after: body.after } : {}),
      },
      actor,
      {
        ...(req.ip ? { ip: req.ip } : {}),
        ...(typeof req.headers['user-agent'] === 'string' ? { userAgent: req.headers['user-agent'] } : {}),
      },
    );

    try {
      writeAuditEvent(event);
      res.status(204).end();
    } catch (err) {
      console.error('[api/audit] не удалось записать событие', err);
      res.status(500).json({ error: 'Не удалось записать событие аудита' });
    }
  });

  // ── Web search endpoint ────────────────────────────────────────────────────
  app.post('/api/search', async (req, res) => {
    const secret = process.env.APP_SESSION_SECRET;
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!secret || !token || !(await verifyToken(token, secret))) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    const { query } = req.body as { query?: string };

    if (!apiKey) {
      res.json({ error: 'BRAVE_SEARCH_API_KEY not configured — add it to .env.local', results: [] });
      return;
    }
    if (!query?.trim()) {
      res.json({ results: [] });
      return;
    }

    try {
      const braveBase = process.env.BRAVE_PROXY_URL ?? 'https://api.search.brave.com';
      const url = `${braveBase}/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&search_lang=ru&country=ru&text_decorations=false`;
      const resp = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey,
          ...(process.env.PROXY_SECRET ? { 'x-proxy-secret': process.env.PROXY_SECRET } : {}),
        },
      });
      const data = await resp.json() as {
        web?: { results?: Array<{ title: string; url: string; description: string }> };
      };
      const results = (data.web?.results ?? []).map((r) => ({ title: r.title, url: r.url, snippet: r.description }));
      res.json({ results });
    } catch (err) {
      res.json({ error: String(err), results: [] });
    }
  });

  // ── Статика SPA ────────────────────────────────────────────────────────────
  // В контейнере приложение отдаётся тем же процессом — отдельный nginx не нужен.
  // В dev каталога `dist/` может не быть, тогда блок просто не подключается
  // (фронтенд обслуживает Vite на :5173).
  const distDir = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    // Клиентский роутинг: любой неизвестный путь отдаёт index.html. Пути /api/
    // сюда попадать не должны — на них честная 404, иначе ошибки эндпоинтов
    // маскировались бы страницей приложения.
    app.get(/.*/, (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

// Запуск только при прямом вызове файла — импорт из тестов сервер не поднимает.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === entry) {
  const PORT = parseInt(process.env.PORT ?? '3001', 10);
  createApp().listen(PORT, () => {
    console.log(`[api] listening on http://localhost:${PORT}`);
  });
}
