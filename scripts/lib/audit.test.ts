// @vitest-environment node
/** Юнит-тесты слоя аудита: сокрытие секретов и сборка записи. */
import { describe, it, expect } from 'vitest';
import { buildAuditEvent, isKnownAction, redact } from './audit';

describe('redact', () => {
  it('прячет значения полей, похожих на секреты', () => {
    expect(redact({ url: 'https://x', apiKey: 'k', password: 'p', token: 't' })).toEqual({
      url: 'https://x',
      apiKey: '[скрыто]',
      password: '[скрыто]',
      token: '[скрыто]',
    });
  });

  it('работает на вложенных структурах и в массивах', () => {
    expect(redact({ list: [{ secret: 's', name: 'ok' }] })).toEqual({ list: [{ secret: '[скрыто]', name: 'ok' }] });
  });

  it('обрезает слишком длинные строки', () => {
    const long = 'я'.repeat(5000);
    const out = redact(long) as string;
    expect(out.length).toBeLessThan(long.length);
    expect(out.endsWith('…[обрезано]')).toBe(true);
  });

  it('не ломается на глубокой вложенности', () => {
    let deep: unknown = 'дно';
    for (let i = 0; i < 20; i++) deep = { next: deep };
    expect(() => redact(deep)).not.toThrow();
  });

  it('простые значения не трогает', () => {
    expect(redact('light')).toBe('light');
    expect(redact(42)).toBe(42);
    expect(redact(null)).toBe(null);
  });
});

describe('buildAuditEvent', () => {
  it('проставляет kind, время и субъекта', () => {
    const event = buildAuditEvent({ action: 'agent.enable', target: 'agent.metrics' }, 'ivanov');
    expect(event.kind).toBe('audit');
    expect(event.actor).toBe('ivanov');
    expect(Number.isNaN(Date.parse(event.ts))).toBe(false);
  });

  it('необязательные поля не появляются пустыми', () => {
    const event = buildAuditEvent({ action: 'agent.enable', target: 'agent.metrics' }, 'ivanov');
    expect('before' in event).toBe(false);
    expect('targetId' in event).toBe(false);
    expect('ip' in event).toBe(false);
  });

  it('значение false сохраняется, а не отбрасывается', () => {
    const event = buildAuditEvent({ action: 'agent.disable', target: 'agent.metrics', before: true, after: false }, 'ivanov');
    expect(event.after).toBe(false);
  });
});

describe('словарь действий', () => {
  it('известные действия проходят, произвольные — нет', () => {
    expect(isKnownAction('settings.theme.change')).toBe(true);
    expect(isKnownAction('access.grant')).toBe(true);
    expect(isKnownAction('что-то.своё')).toBe(false);
  });
});
