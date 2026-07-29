/**
 * Аудит-лог: журнал изменений конфигурации (требование ИБ банка).
 *
 * Отвечает на вопрос «КТО и КОГДА что изменил», в отличие от обычных логов
 * приложения, отвечающих на «почему сломалось». Поэтому поток отдельный:
 * у аудита другой срок хранения, другие требования к целостности и другие читатели.
 *
 * ⚠️ КАРКАС. Слой готов принимать и писать события, но в прототипе аккаунт один
 * на всех (логин/пароль в .env.local), поэтому поле actor у всех событий одинаковое.
 * Полноценным журнал станет с появлением аутентификации пользователей — см. STATUS.md,
 * раздел «Требование ИБ».
 *
 * Формат вывода — JSON Lines (одно событие = одна строка), это то, что напрямую
 * читают ELK и Splunk. Куда пишем:
 *   AUDIT_LOG_FILE задан  → дописываем в этот файл;
 *   не задан              → пишем в stdout с полем kind:"audit", чтобы сборщик
 *                           логов контейнера мог отделить аудит от прочего вывода.
 */
import fs from 'fs';

/**
 * Разрешённые действия. Контролируемый словарь: неизвестное действие отклоняется,
 * чтобы в журнал не попадал мусор и опечатки. Добавляя событие в интерфейсе,
 * добавь его сюда же.
 */
export const AUDIT_ACTIONS = [
  'settings.theme.change',
  'settings.profile.update',
  'settings.notifications.update',
  'integration.connect',
  'integration.disconnect',
  'integration.update',
  'agent.enable',
  'agent.disable',
  'agent.update',
  'service.enable',
  'service.disable',
  'access.grant',
  'access.revoke',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** То, что присылает интерфейс. Ни actor, ни время сюда не входят намеренно. */
export interface AuditRequest {
  action: string;
  target: string;
  targetId?: string;
  before?: unknown;
  after?: unknown;
}

/** Запись журнала. */
export interface AuditEvent extends AuditRequest {
  kind: 'audit';
  ts: string;
  actor: string;
  ip?: string;
  userAgent?: string;
}

/** Предел на сериализованное значение — защита от заливания журнала. */
const MAX_VALUE_CHARS = 4000;

const SENSITIVE_KEY = /pass|secret|token|apikey|api_key|authorization|cookie/i;

/**
 * Прячет значения полей, похожих на секреты, на любой глубине.
 * В журнал попадает факт изменения, но не сам секрет.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[слишком глубокая структура]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[скрыто]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > MAX_VALUE_CHARS) {
    return value.slice(0, MAX_VALUE_CHARS) + '…[обрезано]';
  }
  return value;
}

export function isKnownAction(action: string): action is AuditAction {
  return (AUDIT_ACTIONS as readonly string[]).includes(action);
}

/**
 * Собирает запись журнала. Время и субъект проставляет СЕРВЕР — значения из тела
 * запроса игнорируются, иначе их можно подделать с клиента.
 */
export function buildAuditEvent(
  req: AuditRequest,
  actor: string,
  meta: { ip?: string; userAgent?: string } = {},
): AuditEvent {
  return {
    kind: 'audit',
    ts: new Date().toISOString(),
    actor,
    action: req.action,
    target: req.target,
    ...(req.targetId !== undefined ? { targetId: req.targetId } : {}),
    ...(req.before !== undefined ? { before: redact(req.before) } : {}),
    ...(req.after !== undefined ? { after: redact(req.after) } : {}),
    ...(meta.ip ? { ip: meta.ip } : {}),
    ...(meta.userAgent ? { userAgent: meta.userAgent } : {}),
  };
}

/**
 * Пишет событие. Бросает исключение, если записать не удалось — вызывающий код
 * решает, что делать.
 *
 * ⚠️ Сейчас неудачная запись НЕ отменяет само изменение настройки: интерфейс уже
 * применил её локально. Если ИБ потребует «изменение не применяется без записи
 * в журнал», менять надо здесь и на стороне вызова — сделать запись блокирующей
 * и откатывать действие при ошибке.
 */
export function writeAuditEvent(event: AuditEvent): void {
  const line = JSON.stringify(event) + '\n';
  const file = process.env.AUDIT_LOG_FILE;
  if (file) {
    fs.appendFileSync(file, line, 'utf8');
    return;
  }
  process.stdout.write(line);
}
