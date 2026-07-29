/**
 * Проверка формы определений инструментов.
 *
 * Сервер перекладывает их в `{type:'function', function:{name, description, parameters}}`.
 * Если у инструмента не окажется `parameters` (например, кто-то вернёт старое имя поля
 * `input_schema`), модель получит инструмент без схемы и начнёт вызывать его с пустыми
 * аргументами — ассистент внешне работает, но данные не приходят. Тест ловит это сразу.
 */
import { describe, it, expect } from 'vitest';
import { TOOL_DEFINITIONS } from '../lib/tools';
import { getOrchestratorTools } from '../lib/specialists';

interface ToolShape {
  name?: unknown;
  description?: unknown;
  parameters?: unknown;
}

const allTools: ToolShape[] = [
  ...(TOOL_DEFINITIONS as readonly unknown[] as ToolShape[]),
  ...(getOrchestratorTools() as unknown[] as ToolShape[]),
];

describe('определения инструментов', () => {
  it('набор непустой и содержит и базовые инструменты, и специалистов', () => {
    const names = (getOrchestratorTools() as unknown[] as ToolShape[]).map((t) => t.name);
    expect(names).toContain('get_metrics');
    expect(names).toContain('write_task_draft');
    // create_task_draft отдан специалисту эксклюзивно — у оркестратора его быть не должно.
    expect(names).not.toContain('create_task_draft');
  });

  it.each(allTools.map((t) => [String(t.name), t] as const))('%s — корректная форма', (_name, tool) => {
    expect(typeof tool.name).toBe('string');
    expect(String(tool.name).length).toBeGreaterThan(0);
    expect(typeof tool.description === 'string' || tool.description === undefined).toBe(true);

    const params = tool.parameters as { type?: unknown; properties?: unknown } | undefined;
    expect(params, 'у инструмента должно быть поле parameters').toBeDefined();
    expect(params?.type).toBe('object');
    expect(typeof params?.properties).toBe('object');
  });

  it('ни у одного инструмента не осталось поля input_schema', () => {
    for (const tool of allTools) {
      expect(tool).not.toHaveProperty('input_schema');
    }
  });

  it('имена инструментов уникальны', () => {
    const names = (getOrchestratorTools() as unknown[] as ToolShape[]).map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
