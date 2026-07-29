// @vitest-environment node
/**
 * Сквозные тесты `/api/chat` против поддельного OpenAI-совместимого сервера.
 *
 * Проверяют то, что нельзя проверить юнит-тестами: реальный разбор потока,
 * тело запроса, уходящее в модель, поведение при отказах и отмене.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createApp } from './api-server';
import { signToken } from './lib/token';

const SECRET = 'test-secret-for-tokens';

/** Ответ, который поддельная модель отдаст на следующий запрос. */
type FakeReply =
  | { kind: 'sse'; chunks: object[] }
  | { kind: 'json'; body: object }
  | { kind: 'status'; status: number; body?: object };

let fakeServer: http.Server;
let fakeUrl = '';
let appServer: http.Server;
let appUrl = '';
let token = '';

/** Очередь ответов поддельной модели и журнал полученных запросов. */
let replies: FakeReply[] = [];
let requests: Array<Record<string, unknown>> = [];

function sseChunk(obj: object): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

/** Кусок потока с текстовой дельтой. */
function textDelta(text: string) {
  return { choices: [{ index: 0, delta: { content: text }, finish_reason: null }] };
}

/** Кусок потока с фрагментом вызова инструмента. */
function toolDelta(index: number, fields: { id?: string; name?: string; arguments?: string }) {
  return {
    choices: [
      {
        index: 0,
        delta: {
          tool_calls: [
            {
              index,
              ...(fields.id ? { id: fields.id } : {}),
              type: 'function',
              function: {
                ...(fields.name ? { name: fields.name } : {}),
                ...(fields.arguments !== undefined ? { arguments: fields.arguments } : {}),
              },
            },
          ],
        },
        finish_reason: null,
      },
    ],
  };
}

function finish(reason: string) {
  return { choices: [{ index: 0, delta: {}, finish_reason: reason }] };
}

beforeAll(async () => {
  fakeServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      requests.push(JSON.parse(body || '{}') as Record<string, unknown>);
      const reply = replies.shift() ?? { kind: 'json' as const, body: { choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] } };

      if (reply.kind === 'status') {
        res.writeHead(reply.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reply.body ?? { error: { message: 'fake failure' } }));
        return;
      }
      if (reply.kind === 'json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(reply.body));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      for (const chunk of reply.chunks) res.write(sseChunk(chunk));
      res.write('data: [DONE]\n\n');
      res.end();
    });
  });
  await new Promise<void>((r) => fakeServer.listen(0, '127.0.0.1', r));
  fakeUrl = `http://127.0.0.1:${(fakeServer.address() as AddressInfo).port}/v1`;

  appServer = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((r) => appServer.once('listening', r));
  appUrl = `http://127.0.0.1:${(appServer.address() as AddressInfo).port}`;

  token = await signToken('tester', SECRET);
});

afterAll(async () => {
  await new Promise<void>((r) => fakeServer.close(() => r()));
  await new Promise<void>((r) => appServer.close(() => r()));
});

beforeEach(() => {
  replies = [];
  requests = [];
  process.env.APP_SESSION_SECRET = SECRET;
  process.env.AI_BASE_URL = fakeUrl;
  process.env.AI_MODEL = 'qwen3-32b';
  process.env.AI_API_KEY = '';
  process.env.AI_VISION = 'false';
  process.env.AI_STREAM = 'true';
  process.env.AI_ENABLE_THINKING = 'false';
});

interface ChatBody {
  messages: unknown[];
  system?: string;
  tools?: unknown[];
}

async function chat(body: ChatBody, auth = true) {
  return fetch(`${appUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

/** Разбор нашего SSE-протокола обратно в события. */
function parseEvents(raw: string): Array<Record<string, unknown>> {
  return raw
    .split('\n')
    .filter((l) => l.startsWith('data:'))
    .map((l) => l.slice(5).trim())
    .filter((d) => d && d !== '[DONE]')
    .map((d) => JSON.parse(d) as Record<string, unknown>);
}

const TOOLS = [
  { name: 'get_metrics', description: 'метрики продукта', parameters: { type: 'object', properties: { groupId: { type: 'string' } }, required: [] } },
];

describe('служебные эндпоинты', () => {
  it('проба живости отвечает без авторизации', async () => {
    const res = await fetch(`${appUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('неизвестный путь /api/ не маскируется страницей приложения', async () => {
    const res = await fetch(`${appUrl}/api/nope`);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type') ?? '').not.toContain('text/html');
  });
});

describe('/api/audit — журнал изменений конфигурации', () => {
  const auditFile = path.join(os.tmpdir(), `audit-test-${process.pid}.log`);

  const audit = (body: unknown, auth = true) =>
    fetch(`${appUrl}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });

  const readEvents = () =>
    fs.existsSync(auditFile)
      ? fs.readFileSync(auditFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>)
      : [];

  beforeEach(() => {
    process.env.AUDIT_LOG_FILE = auditFile;
    if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
  });

  afterAll(() => {
    if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
    delete process.env.AUDIT_LOG_FILE;
  });

  it('без токена не принимает событие', async () => {
    expect((await audit({ action: 'settings.theme.change', target: 'settings.theme' }, false)).status).toBe(401);
    expect(readEvents()).toHaveLength(0);
  });

  it('записывает событие строкой JSON со всеми полями', async () => {
    const res = await audit({
      action: 'settings.theme.change',
      target: 'settings.theme',
      before: 'dark',
      after: 'light',
    });
    expect(res.status).toBe(204);

    const events = readEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'audit',
      actor: 'tester',
      action: 'settings.theme.change',
      target: 'settings.theme',
      before: 'dark',
      after: 'light',
    });
    expect(typeof events[0]?.ts).toBe('string');
  });

  it('субъекта и время берёт сервер — подделать с клиента нельзя', async () => {
    await audit({
      action: 'access.grant',
      target: 'user.roles',
      actor: 'admin-подделка',
      ts: '2000-01-01T00:00:00.000Z',
      kind: 'not-audit',
    });
    const event = readEvents()[0];
    expect(event?.actor).toBe('tester');
    expect(event?.ts).not.toBe('2000-01-01T00:00:00.000Z');
    expect(event?.kind).toBe('audit');
  });

  it('неизвестное действие отклоняется и в журнал не попадает', async () => {
    const res = await audit({ action: 'что-то.своё', target: 'x' });
    expect(res.status).toBe(400);
    expect(readEvents()).toHaveLength(0);
  });

  it('требует action и target', async () => {
    expect((await audit({ target: 'x' })).status).toBe(400);
    expect((await audit({ action: 'settings.theme.change' })).status).toBe(400);
  });

  it('секреты в значениях не попадают в журнал', async () => {
    await audit({
      action: 'integration.update',
      target: 'integration.jira',
      before: { url: 'https://old', apiKey: 'секрет-1' },
      after: { url: 'https://new', apiKey: 'секрет-2', nested: { password: 'ещё-секрет' } },
    });
    const raw = fs.readFileSync(auditFile, 'utf8');
    expect(raw).toContain('https://new');
    expect(raw).not.toContain('секрет-1');
    expect(raw).not.toContain('секрет-2');
    expect(raw).not.toContain('ещё-секрет');
    expect(raw).toContain('[скрыто]');
  });

  it('несколько событий пишутся отдельными строками', async () => {
    await audit({ action: 'agent.enable', target: 'agent.metrics' });
    await audit({ action: 'agent.disable', target: 'agent.metrics' });
    expect(readEvents()).toHaveLength(2);
  });
});

describe('/api/chat — доступ и конфигурация', () => {
  it('без токена отдаёт 401', async () => {
    const res = await chat({ messages: [{ role: 'user', content: 'привет' }] }, false);
    expect(res.status).toBe(401);
  });

  it('без AI_BASE_URL отдаёт понятную 500, а не сбой стрима', async () => {
    delete process.env.AI_BASE_URL;
    const res = await chat({ messages: [{ role: 'user', content: 'привет' }] });
    expect(res.status).toBe(500);
    expect((await res.json() as { error: string }).error).toContain('AI_BASE_URL');
  });

  it('без AI_MODEL отдаёт понятную 500', async () => {
    delete process.env.AI_MODEL;
    const res = await chat({ messages: [{ role: 'user', content: 'привет' }] });
    expect((await res.json() as { error: string }).error).toContain('AI_MODEL');
  });
});

describe('/api/chat — обычный ответ', () => {
  it('стримит текст и завершает ход без вызовов', async () => {
    replies.push({ kind: 'sse', chunks: [textDelta('Привет'), textDelta(', как дела?'), finish('stop')] });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'привет' }] })).text());

    const text = events.filter((e) => e.type === 'text').map((e) => e.text).join('');
    expect(text).toBe('Привет, как дела?');
    const done = events.find((e) => e.type === 'done');
    expect(done).toMatchObject({ finishReason: 'stop', toolCalls: [] });
  });

  it('поле reasoning_content в чат не попадает', async () => {
    replies.push({
      kind: 'sse',
      chunks: [
        { choices: [{ index: 0, delta: { reasoning_content: 'сначала подумаю про метрики' }, finish_reason: null }] },
        textDelta('Готовый ответ'),
        finish('stop'),
      ],
    });
    const raw = await (await chat({ messages: [{ role: 'user', content: 'привет' }] })).text();
    expect(raw).toContain('Готовый ответ');
    expect(raw).not.toContain('сначала подумаю');
  });

  it('теги <think> вырезаются, даже если разорваны между чанками', async () => {
    replies.push({
      kind: 'sse',
      chunks: [textDelta('До. <thi'), textDelta('nk>шум</thi'), textDelta('nk>После.'), finish('stop')],
    });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'x' }] })).text());
    const text = events.filter((e) => e.type === 'text').map((e) => e.text).join('');
    expect(text).toBe('До. После.');
  });
});

describe('/api/chat — вызовы инструментов', () => {
  it('собирает вызов из фрагментов потока и отдаёт готовым', async () => {
    replies.push({
      kind: 'sse',
      chunks: [
        toolDelta(0, { id: 'call_1', name: 'get_metrics', arguments: '' }),
        toolDelta(0, { arguments: '{"group' }),
        toolDelta(0, { arguments: 'Id":"business"}' }),
        finish('tool_calls'),
      ],
    });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'метрики' }], tools: TOOLS })).text());
    const done = events.find((e) => e.type === 'done');
    expect(done).toMatchObject({
      finishReason: 'tool_calls',
      toolCalls: [{ id: 'call_1', name: 'get_metrics', input: { groupId: 'business' } }],
    });
  });

  it('finish_reason=stop при наличии вызовов всё равно даёт tool_calls', async () => {
    // Реальное поведение части tool-парсеров vLLM. Опора на finish_reason здесь
    // оборвала бы агентный цикл, и ассистент ответил бы без данных.
    replies.push({
      kind: 'sse',
      chunks: [toolDelta(0, { id: 'c1', name: 'get_metrics', arguments: '{}' }), finish('stop')],
    });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'метрики' }], tools: TOOLS })).text());
    const done = events.find((e) => e.type === 'done') as { finishReason: string; toolCalls: unknown[] };
    expect(done.finishReason).toBe('tool_calls');
    expect(done.toolCalls).toHaveLength(1);
  });

  it('несколько параллельных вызовов собираются раздельно', async () => {
    replies.push({
      kind: 'sse',
      chunks: [
        toolDelta(0, { id: 'a', name: 'get_metrics', arguments: '{}' }),
        toolDelta(1, { id: 'b', name: 'get_tasks', arguments: '{"epicId":' }),
        toolDelta(1, { arguments: '"EPIC-1"}' }),
        finish('tool_calls'),
      ],
    });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'сводка' }], tools: TOOLS })).text());
    const done = events.find((e) => e.type === 'done') as { toolCalls: Array<{ name: string; input: unknown }> };
    expect(done.toolCalls.map((c) => c.name)).toEqual(['get_metrics', 'get_tasks']);
    expect(done.toolCalls[1]?.input).toEqual({ epicId: 'EPIC-1' });
  });

  it('оборванные аргументы не роняют ход — инструмент получает пустой ввод', async () => {
    replies.push({
      kind: 'sse',
      chunks: [toolDelta(0, { id: 'c', name: 'create_task_draft', arguments: '{"title":"обор' }), finish('length')],
    });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'задача' }], tools: TOOLS })).text());
    const done = events.find((e) => e.type === 'done') as { toolCalls: Array<{ input: unknown }> };
    expect(done.toolCalls[0]?.input).toEqual({});
  });
});

describe('/api/chat — тело запроса к модели', () => {
  it('инструменты уходят в формате function, система — первым сообщением', async () => {
    replies.push({ kind: 'sse', chunks: [textDelta('ок'), finish('stop')] });
    await (await chat({ messages: [{ role: 'user', content: 'привет' }], system: 'Ты ассистент', tools: TOOLS })).text();

    const sent = requests[0] as { model: string; messages: Array<Record<string, unknown>>; tools: Array<Record<string, unknown>>; max_tokens: number };
    expect(sent.model).toBe('qwen3-32b');
    expect(sent.max_tokens).toBe(4096);
    expect(sent.messages[0]).toEqual({ role: 'system', content: 'Ты ассистент' });
    expect(sent.tools[0]).toEqual({
      type: 'function',
      function: { name: 'get_metrics', description: 'метрики продукта', parameters: TOOLS[0]!.parameters },
    });
  });

  it('результат инструмента уходит отдельным сообщением role=tool сразу за вызовом', async () => {
    replies.push({ kind: 'sse', chunks: [textDelta('Готово'), finish('stop')] });
    await (
      await chat({
        messages: [
          { role: 'user', content: 'метрики' },
          { role: 'assistant', content: [{ type: 'tool_call', id: 'call_1', name: 'get_metrics', input: {} }] },
          { role: 'user', content: [{ type: 'tool_result', tool_call_id: 'call_1', content: '{"nps":58}' }] },
        ],
        tools: TOOLS,
      })
    ).text();

    const sent = requests[0] as { messages: Array<Record<string, unknown>> };
    expect(sent.messages[1]).toMatchObject({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_metrics' } }],
    });
    expect(sent.messages[2]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"nps":58}' });
  });

  it('без AI_VISION картинка не уходит как image_url', async () => {
    replies.push({ kind: 'sse', chunks: [textDelta('ок'), finish('stop')] });
    await (
      await chat({ messages: [{ role: 'user', content: [{ type: 'image', mediaType: 'image/png', data: 'QUJD' }] }] })
    ).text();
    expect(JSON.stringify(requests[0])).not.toContain('image_url');
  });

  it('с AI_VISION картинка уходит как image_url', async () => {
    process.env.AI_VISION = 'true';
    replies.push({ kind: 'sse', chunks: [textDelta('ок'), finish('stop')] });
    await (
      await chat({ messages: [{ role: 'user', content: [{ type: 'image', mediaType: 'image/png', data: 'QUJD' }] }] })
    ).text();
    expect(JSON.stringify(requests[0])).toContain('data:image/png;base64,QUJD');
  });

  it('документ уходит пометкой с именем файла, а не бинарником', async () => {
    replies.push({ kind: 'sse', chunks: [textDelta('ок'), finish('stop')] });
    await (
      await chat({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'file', name: 'договор.pdf', mediaType: 'application/pdf', data: 'JVBERi0xLjQK' },
              { type: 'text', text: 'что в файле?' },
            ],
          },
        ],
      })
    ).text();
    const sent = JSON.stringify(requests[0]);
    expect(sent).toContain('договор.pdf');
    expect(sent).toContain('Не придумывай содержимое');
    // Сам файл модели не отправляется.
    expect(sent).not.toContain('JVBERi0xLjQK');
  });

  it('AI_ENABLE_THINKING добавляет chat_template_kwargs', async () => {
    process.env.AI_ENABLE_THINKING = 'true';
    replies.push({ kind: 'sse', chunks: [textDelta('ок'), finish('stop')] });
    await (await chat({ messages: [{ role: 'user', content: 'привет' }] })).text();
    expect(requests[0]?.chat_template_kwargs).toEqual({ enable_thinking: true });
  });

  it('по умолчанию режим размышлений не включается', async () => {
    replies.push({ kind: 'sse', chunks: [textDelta('ок'), finish('stop')] });
    await (await chat({ messages: [{ role: 'user', content: 'привет' }] })).text();
    expect(requests[0]?.chat_template_kwargs).toBeUndefined();
  });
});

describe('/api/chat — режим без стриминга', () => {
  it('AI_STREAM=false возвращает текст и вызовы инструментов', async () => {
    process.env.AI_STREAM = 'false';
    replies.push({
      kind: 'json',
      body: {
        choices: [
          {
            message: {
              content: 'Смотрю метрики',
              tool_calls: [{ id: 'c1', type: 'function', function: { name: 'get_metrics', arguments: '{"groupId":"cx"}' } }],
            },
            finish_reason: 'tool_calls',
          },
        ],
      },
    });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'метрики' }], tools: TOOLS })).text());
    expect(events.filter((e) => e.type === 'text').map((e) => e.text).join('')).toBe('Смотрю метрики');
    expect(events.find((e) => e.type === 'done')).toMatchObject({
      finishReason: 'tool_calls',
      toolCalls: [{ id: 'c1', name: 'get_metrics', input: { groupId: 'cx' } }],
    });
    expect(requests[0]?.stream).toBe(false);
  });
});

describe('/api/chat — отказы модели', () => {
  it('400 превращается в понятное сообщение, а не в сырой текст SDK', async () => {
    replies.push({ kind: 'status', status: 400, body: { error: { message: 'tool schema invalid' } } });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'x' }], tools: TOOLS })).text());
    const err = events.find((e) => e.type === 'error') as { error: string };
    expect(err.error).toContain('схема инструментов');
  });

  it('транзиентная 500 переживается ретраем', async () => {
    replies.push({ kind: 'status', status: 500 });
    replies.push({ kind: 'sse', chunks: [textDelta('со второй попытки'), finish('stop')] });
    const events = parseEvents(await (await chat({ messages: [{ role: 'user', content: 'x' }] })).text());
    expect(events.filter((e) => e.type === 'text').map((e) => e.text).join('')).toBe('со второй попытки');
    expect(requests).toHaveLength(2);
  }, 20000);
});
