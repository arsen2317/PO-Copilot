// @vitest-environment node
/**
 * Тесты слоя конвертации в OpenAI-совместимый формат.
 *
 * Покрывают расхождения форматов, каждое из которых ломает ассистента молча:
 * порядок и парность tool-сообщений, сборку вызовов из потока, поведение
 * при отсутствии зрения у модели, утечку размышлений в текст.
 */
import { describe, it, expect } from 'vitest';
import OpenAI from 'openai';
import {
  ThinkTagFilter,
  ToolCallAccumulator,
  describeAttachedFile,
  describeModelError,
  repairToolPairing,
  toOpenAiMessages,
  toOpenAiTools,
  type AiMessage,
} from './ai-protocol';

const vision = { vision: true };
const noVision = { vision: false };

describe('toOpenAiMessages', () => {
  it('ставит system первым сообщением', () => {
    const { messages } = toOpenAiMessages('Ты ассистент', [{ role: 'user', content: 'привет' }], noVision);
    expect(messages[0]).toEqual({ role: 'system', content: 'Ты ассистент' });
    expect(messages[1]).toEqual({ role: 'user', content: 'привет' });
  });

  it('без system первым идёт сообщение пользователя', () => {
    const { messages } = toOpenAiMessages(undefined, [{ role: 'user', content: 'привет' }], noVision);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({ role: 'user', content: 'привет' });
  });

  it('вызов инструмента у ассистента: tool_calls + content null', () => {
    const msgs: AiMessage[] = [
      { role: 'user', content: 'какие метрики?' },
      { role: 'assistant', content: [{ type: 'tool_call', id: 'call_1', name: 'get_metrics', input: { groupId: 'business' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_call_id: 'call_1', content: '{"ok":true}' }] },
    ];
    const { messages } = toOpenAiMessages(undefined, msgs, noVision);

    expect(messages).toHaveLength(3);
    expect(messages[1]).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_metrics', arguments: '{"groupId":"business"}' } }],
    });
    // Результат инструмента — ОТДЕЛЬНОЕ сообщение с ролью tool, а не часть user.
    expect(messages[2]).toEqual({ role: 'tool', tool_call_id: 'call_1', content: '{"ok":true}' });
  });

  it('текст вместе с вызовом сохраняется в content ассистента', () => {
    const msgs: AiMessage[] = [
      { role: 'user', content: 'посчитай' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Сейчас посмотрю метрики.' },
          { type: 'tool_call', id: 'c1', name: 'get_metrics', input: {} },
        ],
      },
      { role: 'user', content: [{ type: 'tool_result', tool_call_id: 'c1', content: '{}' }] },
    ];
    const { messages } = toOpenAiMessages(undefined, msgs, noVision);
    expect(messages[1]).toMatchObject({ role: 'assistant', content: 'Сейчас посмотрю метрики.' });
  });

  it('несколько параллельных вызовов дают несколько tool-сообщений по порядку', () => {
    const msgs: AiMessage[] = [
      { role: 'user', content: 'сводка' },
      {
        role: 'assistant',
        content: [
          { type: 'tool_call', id: 'a', name: 'get_metrics', input: {} },
          { type: 'tool_call', id: 'b', name: 'get_tasks', input: {} },
        ],
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_call_id: 'a', content: '1' },
          { type: 'tool_result', tool_call_id: 'b', content: '2' },
        ],
      },
    ];
    const { messages, warnings } = toOpenAiMessages(undefined, msgs, noVision);
    expect(warnings).toEqual([]);
    expect(messages.slice(2)).toEqual([
      { role: 'tool', tool_call_id: 'a', content: '1' },
      { role: 'tool', tool_call_id: 'b', content: '2' },
    ]);
  });

  it('картинка при поддержке зрения уходит как image_url с data-URI', () => {
    const msgs: AiMessage[] = [
      { role: 'user', content: [{ type: 'image', mediaType: 'image/png', data: 'QUJD' }, { type: 'text', text: 'что тут?' }] },
    ];
    const { messages } = toOpenAiMessages(undefined, msgs, vision);
    expect(messages[0]).toEqual({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } },
        { type: 'text', text: 'что тут?' },
      ],
    });
  });

  it('картинка без зрения заменяется пометкой и image_url не отправляется', () => {
    const msgs: AiMessage[] = [{ role: 'user', content: [{ type: 'image', mediaType: 'image/png', data: 'QUJD' }] }];
    const { messages } = toOpenAiMessages(undefined, msgs, noVision);
    const serialized = JSON.stringify(messages);
    expect(serialized).not.toContain('image_url');
    expect(serialized).toContain('не поддерживает распознавание изображений');
  });

  it('документ превращается в пометку с именем файла', () => {
    const msgs: AiMessage[] = [
      { role: 'user', content: [{ type: 'file', name: 'договор.pdf', mediaType: 'application/pdf', data: 'QUJD' }] },
    ];
    const { messages } = toOpenAiMessages(undefined, msgs, noVision);
    expect(JSON.stringify(messages)).toContain('договор.pdf');
    expect(JSON.stringify(messages)).toContain('Не придумывай содержимое');
  });

  it('несколько текстовых частей склеиваются в строку, а не в массив', () => {
    const msgs: AiMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '[Файл: a.txt]\nсодержимое' },
          { type: 'text', text: 'вопрос' },
        ],
      },
    ];
    const { messages } = toOpenAiMessages(undefined, msgs, noVision);
    expect(messages[0]).toEqual({ role: 'user', content: '[Файл: a.txt]\nсодержимое\n\nвопрос' });
  });
});

describe('repairToolPairing', () => {
  it('подставляет недостающий результат вызова', () => {
    const warnings: string[] = [];
    const fixed = repairToolPairing(
      [
        { role: 'user', content: 'дай' },
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            { id: 'a', type: 'function', function: { name: 'x', arguments: '{}' } },
            { id: 'b', type: 'function', function: { name: 'y', arguments: '{}' } },
          ],
        },
        { role: 'tool', tool_call_id: 'a', content: '1' },
        { role: 'user', content: 'дальше' },
      ],
      warnings,
    );
    // Для вызова b результата не было — он синтезирован ДО следующего сообщения.
    expect(fixed[3]).toEqual({ role: 'tool', tool_call_id: 'b', content: JSON.stringify({ error: 'Результат инструмента отсутствует' }) });
    expect(fixed[4]).toEqual({ role: 'user', content: 'дальше' });
    expect(warnings).toHaveLength(1);
  });

  it('выбрасывает результат без соответствующего вызова', () => {
    const warnings: string[] = [];
    const fixed = repairToolPairing(
      [
        { role: 'user', content: 'дай' },
        { role: 'tool', tool_call_id: 'ghost', content: '1' },
      ],
      warnings,
    );
    expect(fixed).toHaveLength(1);
    expect(warnings[0]).toContain('ghost');
  });

  it('корректную историю не меняет и не жалуется', () => {
    const warnings: string[] = [];
    const input = [
      { role: 'assistant' as const, content: null, tool_calls: [{ id: 'a', type: 'function' as const, function: { name: 'x', arguments: '{}' } }] },
      { role: 'tool' as const, tool_call_id: 'a', content: '1' },
    ];
    expect(repairToolPairing(input, warnings)).toEqual(input);
    expect(warnings).toEqual([]);
  });
});

describe('toOpenAiTools', () => {
  it('переводит схему приложения в формат function', () => {
    const tools = toOpenAiTools([
      { name: 'get_metrics', description: 'метрики', parameters: { type: 'object', properties: { groupId: { type: 'string' } }, required: [] } },
    ]);
    expect(tools).toEqual([
      {
        type: 'function',
        function: {
          name: 'get_metrics',
          description: 'метрики',
          parameters: { type: 'object', properties: { groupId: { type: 'string' } }, required: [] },
        },
      },
    ]);
  });

  it('отсекает посторонние поля вроде cache_control', () => {
    const tools = toOpenAiTools([
      { name: 'x', parameters: { type: 'object' }, ...({ cache_control: { type: 'ephemeral' } } as object) },
    ]);
    expect(JSON.stringify(tools)).not.toContain('cache_control');
  });

  it('пустой список инструментов даёт undefined, а не пустой массив', () => {
    expect(toOpenAiTools([])).toBeUndefined();
    expect(toOpenAiTools(undefined)).toBeUndefined();
  });

  it('инструменту без схемы подставляется пустой объектный тип', () => {
    const tools = toOpenAiTools([{ name: 'ping' }]);
    expect(tools?.[0]?.function.parameters).toEqual({ type: 'object', properties: {}, required: [] });
  });
});

describe('ToolCallAccumulator', () => {
  it('собирает имя из первого фрагмента и аргументы по кусочкам', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'call_1', function: { name: 'get_metrics', arguments: '' } }]);
    acc.add([{ index: 0, function: { arguments: '{"group' } }]);
    acc.add([{ index: 0, function: { arguments: 'Id":"bus' } }]);
    acc.add([{ index: 0, function: { arguments: 'iness"}' } }]);
    expect(acc.collect()).toEqual([
      { id: 'call_1', name: 'get_metrics', input: { groupId: 'business' }, malformedArguments: false },
    ]);
  });

  it('повтор одного и того же имени в каждом фрагменте не дублирует его', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'c', function: { name: 'get_tasks', arguments: '{' } }]);
    acc.add([{ index: 0, id: 'c', function: { name: 'get_tasks', arguments: '}' } }]);
    expect(acc.collect()[0]?.name).toBe('get_tasks');
  });

  it('имя, разбитое на фрагменты, склеивается', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'c', function: { name: 'get_' } }]);
    acc.add([{ index: 0, function: { name: 'metrics', arguments: '{}' } }]);
    expect(acc.collect()[0]?.name).toBe('get_metrics');
  });

  it('различает параллельные вызовы по index, а не по id', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'a', function: { name: 'get_metrics', arguments: '{}' } }]);
    acc.add([{ index: 1, id: 'b', function: { name: 'get_tasks', arguments: '{"epicId":"E1"}' } }]);
    acc.add([{ index: 0, function: { arguments: '' } }]);
    const calls = acc.collect();
    expect(calls).toHaveLength(2);
    expect(calls[0]?.name).toBe('get_metrics');
    expect(calls[1]).toMatchObject({ id: 'b', name: 'get_tasks', input: { epicId: 'E1' } });
  });

  it('подставляет id, если сервер его не прислал', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, function: { name: 'get_tasks', arguments: '{}' } }]);
    expect(acc.collect()[0]?.id).toBe('call_0');
  });

  it('дельта без index считается нулевой', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ id: 'c', function: { name: 'get_tasks' } }]);
    acc.add([{ function: { arguments: '{}' } }]);
    expect(acc.collect()).toHaveLength(1);
  });

  it('оборванный JSON аргументов даёт пустой ввод и предупреждение', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'c', function: { name: 'create_task_draft', arguments: '{"title":"незакон' } }]);
    const warnings: string[] = [];
    const calls = acc.collect(warnings);
    expect(calls[0]).toMatchObject({ input: {}, malformedArguments: true });
    expect(warnings[0]).toContain('create_task_draft');
  });

  it('пустые аргументы — это пустой объект, а не ошибка', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'c', function: { name: 'get_agents', arguments: '' } }]);
    expect(acc.collect()[0]).toMatchObject({ input: {}, malformedArguments: false });
  });

  it('вызов без имени отбрасывается с предупреждением', () => {
    const acc = new ToolCallAccumulator();
    acc.add([{ index: 0, id: 'c', function: { arguments: '{}' } }]);
    const warnings: string[] = [];
    expect(acc.collect(warnings)).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });
});

describe('ThinkTagFilter', () => {
  it('обычный текст проходит без изменений', () => {
    const f = new ThinkTagFilter();
    expect(f.feed('Привет, ') + f.feed('как дела?') + f.flush()).toBe('Привет, как дела?');
  });

  it('вырезает блок размышлений целиком', () => {
    const f = new ThinkTagFilter();
    expect(f.feed('<think>внутренний монолог</think>Ответ') + f.flush()).toBe('Ответ');
  });

  it('вырезает блок, разорванный между чанками', () => {
    const f = new ThinkTagFilter();
    let out = '';
    for (const chunk of ['До. <thi', 'nk>рассужд', 'ения</thin', 'k>После.']) out += f.feed(chunk);
    expect(out + f.flush()).toBe('До. После.');
  });

  it('незакрытый блок размышлений не попадает в вывод', () => {
    const f = new ThinkTagFilter();
    expect(f.feed('Текст<think>оборвалось') + f.flush()).toBe('Текст');
  });

  it('текст, похожий на начало тега, не теряется', () => {
    const f = new ThinkTagFilter();
    expect(f.feed('Сравнение a < b и c') + f.flush()).toBe('Сравнение a < b и c');
  });

  it('несколько блоков подряд', () => {
    const f = new ThinkTagFilter();
    expect(f.feed('A<think>1</think>B<think>2</think>C') + f.flush()).toBe('ABC');
  });
});

describe('describeModelError', () => {
  const apiError = (status: number, message = 'boom') =>
    new OpenAI.APIError(status, { error: { message } }, message, undefined);

  it('429 объясняет перегрузку лимитом', () => {
    expect(describeModelError(apiError(429)).userMessage).toContain('перегружена запросами');
  });

  it('404 подсказывает проверить AI_MODEL и AI_BASE_URL', () => {
    const msg = describeModelError(apiError(404)).userMessage;
    expect(msg).toContain('AI_MODEL');
    expect(msg).toContain('/v1');
  });

  it('401 указывает на AI_API_KEY', () => {
    expect(describeModelError(apiError(401)).userMessage).toContain('AI_API_KEY');
  });

  it('400 намекает на схему инструментов', () => {
    expect(describeModelError(apiError(400)).userMessage).toContain('схема инструментов');
  });

  it('обычная ошибка не теряет текст', () => {
    expect(describeModelError(new Error('сеть недоступна')).userMessage).toContain('сеть недоступна');
  });
});

describe('describeAttachedFile', () => {
  it('содержит имя, тип и запрет выдумывать содержимое', () => {
    const note = describeAttachedFile({ type: 'file', name: 'смета.xlsx', mediaType: 'application/vnd.ms-excel', data: 'QUJD' });
    expect(note).toContain('смета.xlsx');
    expect(note).toContain('Не придумывай содержимое');
  });
});
