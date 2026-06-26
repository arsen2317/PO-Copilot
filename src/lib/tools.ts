import { getMetricDefinitions, getMetricGroupDefs } from '../data/api/metric-definitions';
import { getTasks } from '../data/api/tasks';
import { getAgents } from '../data/api/agents';
import { getToken } from '../features/auth/auth';

export const TOOL_DEFINITIONS = [
  {
    name: 'get_metric_groups',
    description: 'Возвращает список всех групп метрик с их ID, названиями и цветами.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_metrics',
    description: 'Возвращает метрики продукта: текущее значение, план, % выполнения, тренд. Можно фильтровать по группе.',
    input_schema: {
      type: 'object' as const,
      properties: {
        groupId: { type: 'string', description: 'ID группы метрик (необязательно). Если не указан — возвращает все метрики.' },
      },
      required: [],
    },
  },
  {
    name: 'get_tasks',
    description: 'Возвращает список задач из бэклога: название, статус, приоритет, исполнитель.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_agents',
    description: 'Возвращает список доступных ИИ-агентов: название, описание, статус.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'search_web',
    description: 'Выполняет поиск в интернете по заданному запросу. Используй для поиска актуальных новостей о конкурентах, банковских трендах, новых фичах российских банков. Возвращает список результатов с заголовком, URL и кратким описанием.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Поисковый запрос на русском или английском языке.' },
      },
      required: ['query'],
    },
  },
] as const;

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'get_metric_groups':
      return getMetricGroupDefs();

    case 'get_metrics': {
      const all = await getMetricDefinitions();
      const groupId = typeof input.groupId === 'string' ? input.groupId : null;
      const metrics = groupId ? all.filter((m) => m.groupId === groupId) : all;
      return metrics.map((m) => ({
        id: m.id,
        name: m.name,
        groupId: m.groupId,
        currentValue: m.currentValue,
        planValue: m.planValue,
        lastPeriodValue: m.lastPeriodValue,
        unit: m.unit,
        format: m.format,
        lowerIsBetter: m.lowerIsBetter,
        fulfillmentPct: m.planValue === 0
          ? 100
          : Math.round(
              (m.lowerIsBetter
                ? (m.planValue / m.currentValue)
                : (m.currentValue / m.planValue)) * 100,
            ),
      }));
    }

    case 'get_tasks':
      return getTasks();

    case 'get_agents':
      return getAgents();

    case 'search_web': {
      const query = typeof input.query === 'string' ? input.query : '';
      if (!query) return { results: [] };
      const token = getToken();
      const resp = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query }),
      });
      if (!resp.ok) return { error: `Search failed: ${resp.status}`, results: [] };
      return resp.json();
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
