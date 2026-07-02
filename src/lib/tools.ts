import { getMetricDefinitions, getMetricGroupDefs } from '../data/api/metric-definitions';
import { getFunnelAnalytics } from '../data/api/funnel-analytics';
import { getTasks, getEpics, getTeams } from '../data/api/tasks';
import { getAgents } from '../data/api/agents';
import { getToken } from '../features/auth/auth';
import { useUIStore } from '../store/uiStore';

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
    name: 'get_funnel_steps',
    description: 'Возвращает шаги воронки конверсии: название, техническое имя события, количество пользователей, конверсию от первого шага. Используй для анализа узких мест воронки.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_tasks',
    description: 'Возвращает список задач из бэклога: название, статус, приоритет, исполнитель, эпик, зависимости, даты.',
    input_schema: {
      type: 'object' as const,
      properties: {
        epicId: { type: 'string', description: 'Фильтр по ID эпика (необязательно). Например: EPIC-1, EPIC-2.' },
      },
      required: [],
    },
  },
  {
    name: 'get_timeline',
    description: 'Возвращает данные таймлайна: эпики, задачи с датами начала/конца, зависимости между задачами, информацию о командах. Используй для анализа критического пути, блокировок, влияния задержек на релиз.',
    input_schema: {
      type: 'object' as const,
      properties: {
        epicId: { type: 'string', description: 'Фильтр по ID эпика (необязательно). Если не указан — возвращает все эпики.' },
      },
      required: [],
    },
  },
  {
    name: 'get_agents',
    description: 'Возвращает список доступных ИИ-агентов: название, описание, статус.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_task_draft',
    description: 'Создаёт черновик задачи в разделе «Задачи → Черновики». Используй после того как согласовал структуру задачи с пользователем. Черновик появится на вкладке «Черновики» и пользователь сможет его принять или отредактировать.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Заголовок задачи (до 80 символов)' },
        type: { type: 'string', enum: ['Story', 'Bug', 'Task', 'Spike'], description: 'Тип задачи' },
        priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'], description: 'P0=блокер, P1=высокий, P2=средний, P3=низкий' },
        storyPoints: { type: 'number', description: 'Оценка в story points (1/2/3/5/8/13)' },
        description: { type: 'string', description: 'Описание в формате «Как [роль], я хочу [действие], чтобы [ценность]»' },
        epicId: { type: 'string', description: 'ID эпика (необязательно)' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Метки (теги)' },
        criteria: { type: 'array', items: { type: 'string' }, description: 'Критерии приёмки (5-8 штук, конкретные и проверяемые)' },
        complianceNotes: { type: 'string', description: 'Комплаенс-заметки или требования (необязательно)' },
      },
      required: ['title', 'type', 'priority', 'criteria'],
    },
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

    case 'get_funnel_steps': {
      const steps = await getFunnelAnalytics();
      return steps.map((s, idx) => ({
        id: `funnel:${s.id}`,
        stepNumber: idx + 1,
        name: s.name,
        eventName: s.eventName,
        users: s.users,
        conversionFromFirst: s.conversionFromFirst,
        dropFromPrev: idx === 0 ? 0 : Math.round((1 - s.users / (steps[idx - 1]?.users ?? s.users)) * 100),
      }));
    }

    case 'get_tasks': {
      const tasks = await getTasks();
      const epicId = typeof input.epicId === 'string' ? input.epicId : null;
      const filtered = epicId ? tasks.filter((t) => t.epicId === epicId) : tasks;
      return filtered.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        riskLevel: t.riskLevel,
        epicId: t.epicId,
        teamId: t.teamId,
        assignee: t.assignee?.name,
        startDate: t.startDate,
        deadline: t.deadline,
        storyPoints: t.storyPoints,
        dependencies: t.dependencies,
        labels: t.labels,
      }));
    }

    case 'get_timeline': {
      const [tasks, epics, teams] = await Promise.all([getTasks(), getEpics(), getTeams()]);
      const epicId = typeof input.epicId === 'string' ? input.epicId : null;

      const relevantEpics = epicId ? epics.filter((e) => e.id === epicId) : epics;
      const epicIds = new Set(relevantEpics.map((e) => e.id));
      const relevantTasks = tasks.filter((t) => !epicId || epicIds.has(t.epicId ?? ''));

      // Build dependency map
      const depMap: Record<string, string[]> = {};
      relevantTasks.forEach((t) => {
        if (t.dependencies?.length) {
          t.dependencies.forEach((dep) => {
            if (!depMap[dep]) depMap[dep] = [];
            depMap[dep].push(t.id);
          });
        }
      });

      // Find tasks on critical path (chains of dependencies)
      const allDeps: { from: string; to: string }[] = [];
      relevantTasks.forEach((t) => {
        (t.dependencies ?? []).forEach((fromId) => {
          allDeps.push({ from: fromId, to: t.id });
        });
      });

      const today = '2026-07-02';

      return {
        epics: relevantEpics.map((e) => ({
          id: e.id,
          name: e.name,
          teamId: e.teamId,
          teamName: teams.find((t) => t.id === e.teamId)?.name ?? e.teamId,
          isOurTeam: e.teamId === 'team-debit',
        })),
        tasks: relevantTasks.map((t) => ({
          id: t.id,
          title: t.title,
          epicId: t.epicId,
          status: t.status,
          priority: t.priority,
          riskLevel: t.riskLevel,
          teamId: t.teamId,
          assignee: t.assignee?.name,
          startDate: t.startDate ?? t.createdAt,
          deadline: t.deadline,
          storyPoints: t.storyPoints,
          isOverdue: t.deadline && t.deadline < today && t.status !== 'done',
          dependencies: t.dependencies ?? [],
          blockedBy: t.dependencies ?? [],
          blocks: depMap[t.id] ?? [],
        })),
        dependencies: allDeps,
        today,
        summary: {
          totalTasks: relevantTasks.length,
          overdueTasks: relevantTasks.filter((t) => t.deadline && t.deadline < today && t.status !== 'done').length,
          blockedTasks: relevantTasks.filter((t) => (t.dependencies ?? []).length > 0 && t.status === 'backlog').length,
          criticalTasks: relevantTasks.filter((t) => t.priority === 'critical' && t.status !== 'done').length,
          externalDependencies: allDeps.filter((d) => {
            const fromTask = relevantTasks.find((t) => t.id === d.from);
            const toTask = relevantTasks.find((t) => t.id === d.to);
            return fromTask?.teamId !== toTask?.teamId;
          }).length,
        },
      };
    }

    case 'get_agents':
      return getAgents();

    case 'create_task_draft': {
      const draft: Parameters<ReturnType<typeof useUIStore.getState>['addTaskDraft']>[0] = {
        title: String(input.title ?? ''),
        type: (['Story', 'Bug', 'Task', 'Spike'].includes(String(input.type)) ? input.type : 'Task') as 'Story' | 'Bug' | 'Task' | 'Spike',
        priority: (['P0', 'P1', 'P2', 'P3'].includes(String(input.priority)) ? input.priority : 'P2') as 'P0' | 'P1' | 'P2' | 'P3',
        ...(typeof input.storyPoints === 'number' && { storyPoints: input.storyPoints }),
        ...(typeof input.description === 'string' && { description: input.description }),
        ...(typeof input.epicId === 'string' && { epicId: input.epicId }),
        ...(typeof input.complianceNotes === 'string' && { complianceNotes: input.complianceNotes }),
        labels: Array.isArray(input.labels) ? (input.labels as string[]) : [],
        criteria: Array.isArray(input.criteria) ? (input.criteria as string[]) : [],
      };
      const draftId = useUIStore.getState().addTaskDraft(draft);
      return { success: true, draftId, title: draft.title, message: `Черновик «${draft.title}» создан.` };
    }

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
