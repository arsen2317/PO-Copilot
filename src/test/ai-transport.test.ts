/**
 * Тесты браузерной стороны протокола: разбор SSE-событий сервера в результат хода.
 *
 * Проверяют то, на что опирается агентный цикл ассистента: накопление текста,
 * получение готовых вызовов инструментов, признак финального хода, ошибки.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamChat } from '../lib/ai';

/** Ответ сервера в виде потока строк SSE. */
function sseResponse(lines: string[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function event(obj: object): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

function mockFetch(res: Response) {
  const fn = vi.fn().mockResolvedValue(res);
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('streamChat', () => {
  it('накапливает текст и отдаёт его дельтами', async () => {
    mockFetch(sseResponse([event({ type: 'text', text: 'При' }), event({ type: 'text', text: 'вет' }), event({ type: 'done', finishReason: 'stop', toolCalls: [] }), 'data: [DONE]\n\n']));

    const deltas: string[] = [];
    const res = await streamChat({ messages: [{ role: 'user', content: 'привет' }], onTextDelta: (d) => deltas.push(d) });

    expect(deltas).toEqual(['При', 'вет']);
    expect(res.blocks).toEqual([{ type: 'text', text: 'Привет' }]);
    expect(res.toolCalls).toEqual([]);
    expect(res.finishReason).toBe('stop');
  });

  it('ход с вызовом инструмента: toolCalls непустой, блоки содержат текст и вызов', async () => {
    mockFetch(
      sseResponse([
        event({ type: 'text', text: 'Смотрю метрики' }),
        event({ type: 'done', finishReason: 'tool_calls', toolCalls: [{ id: 'c1', name: 'get_metrics', input: { groupId: 'cx' } }] }),
        'data: [DONE]\n\n',
      ]),
    );

    const res = await streamChat({ messages: [{ role: 'user', content: 'метрики' }] });

    expect(res.toolCalls).toEqual([{ type: 'tool_call', id: 'c1', name: 'get_metrics', input: { groupId: 'cx' } }]);
    expect(res.blocks).toEqual([
      { type: 'text', text: 'Смотрю метрики' },
      { type: 'tool_call', id: 'c1', name: 'get_metrics', input: { groupId: 'cx' } },
    ]);
  });

  it('вызов без текста даёт блоки только с вызовом', async () => {
    mockFetch(sseResponse([event({ type: 'done', finishReason: 'tool_calls', toolCalls: [{ id: 'c1', name: 'get_tasks', input: {} }] }), 'data: [DONE]\n\n']));
    const res = await streamChat({ messages: [{ role: 'user', content: 'задачи' }] });
    expect(res.blocks).toHaveLength(1);
    expect(res.blocks[0]).toMatchObject({ type: 'tool_call' });
  });

  it('событие разрезано между чанками потока — разбирается корректно', async () => {
    const whole = event({ type: 'text', text: 'целое сообщение' });
    const cut = Math.floor(whole.length / 2);
    mockFetch(sseResponse([whole.slice(0, cut), whole.slice(cut), event({ type: 'done', finishReason: 'stop', toolCalls: [] })]));

    const res = await streamChat({ messages: [{ role: 'user', content: 'x' }] });
    expect(res.blocks).toEqual([{ type: 'text', text: 'целое сообщение' }]);
  });

  it('событие ошибки превращается в исключение с текстом сервера', async () => {
    mockFetch(sseResponse([event({ type: 'error', error: 'Модель перегружена запросами (лимит).' })]));
    await expect(streamChat({ messages: [{ role: 'user', content: 'x' }] })).rejects.toThrow('Модель перегружена');
  });

  it('HTTP-ошибка эндпоинта поднимается как исключение', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('AI_BASE_URL не задан', { status: 500 })));
    await expect(streamChat({ messages: [{ role: 'user', content: 'x' }] })).rejects.toThrow('AI_BASE_URL');
  });

  it('в теле запроса уходят сообщения, system и инструменты', async () => {
    const fn = mockFetch(sseResponse([event({ type: 'done', finishReason: 'stop', toolCalls: [] })]));
    await streamChat({
      messages: [{ role: 'user', content: 'привет' }],
      system: 'Ты ассистент',
      tools: [{ name: 'get_metrics' }],
    });

    const body = JSON.parse((fn.mock.calls[0]?.[1] as RequestInit).body as string) as Record<string, unknown>;
    expect(body.system).toBe('Ты ассистент');
    expect(body.messages).toEqual([{ role: 'user', content: 'привет' }]);
    expect(body.tools).toEqual([{ name: 'get_metrics' }]);
  });

  it('пустые аргументы вызова превращаются в пустой объект', async () => {
    mockFetch(sseResponse([event({ type: 'done', finishReason: 'tool_calls', toolCalls: [{ id: 'c', name: 'get_agents' }] })]));
    const res = await streamChat({ messages: [{ role: 'user', content: 'x' }] });
    expect(res.toolCalls[0]?.input).toEqual({});
  });
});
