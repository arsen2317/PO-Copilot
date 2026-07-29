/**
 * Инварианты папки скиллов.
 *
 * Промпты — это текст, который компилятор не проверяет. Здесь закреплено то,
 * что уже ломалось на практике: потерянная преамбула у специалиста (утекали эмодзи
 * и переставали работать чипы метрик) и волатильные данные в начале промпта
 * (ломают prefix caching сервера инференса).
 */
import { describe, it, expect } from 'vitest';
import {
  AGENT_PROMPTS,
  getBaseSystemPrompt,
  getOrchestratorSystemPrompt,
  getSpecialistPreamble,
  FORMATTING_RULES,
  INTERACTIVE_LINK_RULES,
} from '../skills';
import { SPECIALISTS } from '../lib/specialists';

const AGENT_KEYS = [
  'agent-briefing',
  'agent-metrics',
  'agent-qbr',
  'agent-tasks',
  'agent-risks',
  'agent-hypotheses',
  'agent-custdev',
  'agent-cjm',
  'agent-trends',
];

describe('скиллы агентов', () => {
  it('присутствуют все девять и ни один не пустой', () => {
    expect(Object.keys(AGENT_PROMPTS).sort()).toEqual([...AGENT_KEYS].sort());
    for (const [key, prompt] of Object.entries(AGENT_PROMPTS)) {
      expect(prompt.length, `${key} пустой`).toBeGreaterThan(100);
    }
  });
});

describe('скиллы специалистов', () => {
  it('у каждого специалиста непустой system и хотя бы один инструмент', () => {
    expect(Object.keys(SPECIALISTS)).toHaveLength(9);
    for (const [name, spec] of Object.entries(SPECIALISTS)) {
      expect(spec.system.length, `${name}: пустой промпт`).toBeGreaterThan(100);
      expect(spec.allowedTools.length, `${name}: нет инструментов`).toBeGreaterThan(0);
      expect(spec.toolName).toBe(name);
    }
  });
});

describe('общие правила не разъезжаются', () => {
  it('преамбула специалиста несёт правила формата и интерактивных ссылок', () => {
    const preamble = getSpecialistPreamble();
    expect(preamble).toContain(FORMATTING_RULES);
    expect(preamble).toContain(INTERACTIVE_LINK_RULES);
  });

  it('преамбула специалиста запрещает блоки suggestions и choices', () => {
    // Их добавляет отдельный финальный ход оркестратора — иначе блок задвоится.
    expect(getSpecialistPreamble()).toContain('Не добавляй блоки');
  });

  it('промпт оркестратора включает базовый и каталог специалистов', () => {
    const orchestrator = getOrchestratorSystemPrompt();
    expect(orchestrator).toContain(getBaseSystemPrompt());
    for (const toolName of Object.keys(SPECIALISTS)) {
      expect(orchestrator, `в каталоге нет ${toolName}`).toContain(toolName);
    }
  });
});

describe('prefix caching', () => {
  it('промпт оркестратора не начинается с волатильной даты', () => {
    // Меняющееся начало промпта = промах кэша префикса на каждом запросе.
    expect(getOrchestratorSystemPrompt().startsWith('Текущая дата')).toBe(false);
  });

  it('два вызова подряд дают одинаковый промпт', () => {
    expect(getOrchestratorSystemPrompt()).toBe(getOrchestratorSystemPrompt());
  });
});
