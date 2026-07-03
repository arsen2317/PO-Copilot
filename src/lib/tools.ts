import { getMetricDefinitions, getMetricGroupDefs } from '../data/api/metric-definitions';
import { getFunnelAnalytics } from '../data/api/funnel-analytics';
import { getTasks, getEpics, getTeams } from '../data/api/tasks';
import { getAgents } from '../data/api/agents';
import { getArtifacts } from '../data/api/knowledge';
import { getCjmList, getCjmById } from '../data/api/cjm';
import { getToken } from '../features/auth/auth';
import { useUIStore } from '../store/uiStore';
import { useCjmStore } from '../store/cjmStore';
import type { CjmMap, CjmFlowNode, CjmFlowEdge, CjmNodeData, CjmNodeType, CjmStatus } from '../data/types';

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
  {
    name: 'get_cjm_list',
    description: 'Возвращает список всех CJM-карт (карт пути клиента): id, заголовок, персона, статус, описание.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_cjm',
    description: 'Возвращает полный CJM по id, включая все ноды (этапы, touchpoint, эмоции, боли, возможности) и рёбра.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID CJM-карты' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_knowledge_artifacts',
    description: 'Возвращает артефакты из базы знаний: опросы пользователей, UX-исследования, анализы оттока, NPS-отчёты — с полными данными и инсайтами. Используй для обогащения CJM реальными болями и данными.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_cjm',
    description: 'Создаёт новый CJM и сохраняет его в текущей сессии. Возвращает id и title созданного CJM.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Название CJM (конкретное, описывает сценарий)' },
        persona: { type: 'string', description: 'Описание персоны (возраст, роль, контекст)' },
        description: { type: 'string', description: 'Краткое описание CJM (1-2 предложения, со ссылками на данные)' },
        status: { type: 'string', enum: ['draft', 'active', 'archived'], description: 'Статус. По умолчанию: draft' },
        nodes: {
          type: 'array',
          description: 'Ноды CJM. Для N этапов: N*5 нод (stage, touchpoint, emotion, pain, opportunity для каждой колонки)',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID ноды. Формат: {prefix}-s{col+1} для stage, -t для touchpoint, -e для emotion, -p для pain, -o для opportunity' },
              type: { type: 'string', enum: ['stage', 'touchpoint', 'emotion', 'pain', 'opportunity'] },
              position: {
                type: 'object',
                properties: { x: { type: 'number', description: 'col * 280' }, y: { type: 'number', description: 'stage=0, touchpoint=170, emotion=340, pain=510, opportunity=680' } },
                required: ['x', 'y'],
              },
              data: {
                type: 'object',
                properties: {
                  label: { type: 'string', description: 'Текст ноды' },
                  metric: { type: 'string', description: 'Только для stage: метрика (число пользователей, CR%)' },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'], description: 'Только для emotion' },
                  channel: { type: 'string', description: 'Только для touchpoint: канал взаимодействия' },
                },
                required: ['label'],
              },
            },
            required: ['id', 'type', 'position', 'data'],
          },
        },
        edges: {
          type: 'array',
          description: 'Рёбра между stage-нодами. Для N этапов: N-1 рёбер',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              source: { type: 'string', description: 'ID исходной stage-ноды' },
              target: { type: 'string', description: 'ID целевой stage-ноды' },
            },
            required: ['id', 'source', 'target'],
          },
        },
      },
      required: ['title', 'persona', 'description', 'nodes', 'edges'],
    },
  },
  {
    name: 'update_cjm',
    description: 'Обновляет существующий CJM. Можно обновить метаданные (title, persona, description, status) и/или полный набор нод и рёбер.',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID CJM-карты для обновления' },
        title: { type: 'string' },
        persona: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'active', 'archived'] },
        nodes: {
          type: 'array',
          description: 'Полный новый набор нод (заменяет текущий)',
          items: { type: 'object' },
        },
        edges: {
          type: 'array',
          description: 'Полный новый набор рёбер (заменяет текущий)',
          items: { type: 'object' },
        },
      },
      required: ['id'],
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

    case 'get_cjm_list': {
      const fixtureMaps = await getCjmList();
      const generatedMaps = useCjmStore.getState().generatedMaps;
      const all = [...generatedMaps, ...fixtureMaps];
      return all.map((m) => ({
        id: m.id,
        title: m.title,
        persona: m.persona,
        status: m.status,
        description: m.description,
        updatedAt: m.updatedAt,
        stagesCount: m.nodes.filter((n) => n.type === 'stage').length,
        isGenerated: generatedMaps.some((g) => g.id === m.id),
      }));
    }

    case 'get_cjm': {
      const mapId = typeof input.id === 'string' ? input.id : '';
      if (!mapId) return { error: 'id is required' };
      const generatedMaps = useCjmStore.getState().generatedMaps;
      const nodesState = useCjmStore.getState().nodesState;
      const edgesState = useCjmStore.getState().edgesState;
      const generated = generatedMaps.find((m) => m.id === mapId);
      const fixture = generated ? undefined : await getCjmById(mapId);
      const map = generated ?? fixture;
      if (!map) return { error: `CJM not found: ${mapId}` };
      const nodes = nodesState[mapId] ?? map.nodes;
      const edges = edgesState[mapId] ?? map.edges;
      return { ...map, nodes, edges };
    }

    case 'get_knowledge_artifacts': {
      const artifacts = await getArtifacts();
      return artifacts.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt,
      }));
    }

    case 'create_cjm': {
      const prefix = `gen${Date.now().toString(36)}`;
      const mapId = `cjm-${prefix}`;
      const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('ru-RU');

      const rawNodes = Array.isArray(input.nodes) ? (input.nodes as Record<string, unknown>[]) : [];
      const rawEdges = Array.isArray(input.edges) ? (input.edges as Record<string, unknown>[]) : [];

      // Build ID remap so edges can reference original IDs
      const idMap = new Map<string, string>();

      const nodes: CjmFlowNode[] = rawNodes.map((n) => {
        const origId = String(n.id ?? '');
        const newId = origId ? `${mapId}-${origId}` : `${mapId}-n${Math.random().toString(36).slice(2)}`;
        idMap.set(origId, newId);

        const rawData = (n.data && typeof n.data === 'object') ? n.data as Record<string, unknown> : {};
        const data: CjmNodeData = { label: String(rawData.label ?? '') };
        if (typeof rawData.metric === 'string')      data.metric = rawData.metric;
        if (typeof rawData.channel === 'string')     data.channel = rawData.channel;
        if (typeof rawData.description === 'string') data.description = rawData.description;
        const sentiments = ['positive', 'neutral', 'negative'] as const;
        if (sentiments.includes(rawData.sentiment as typeof sentiments[number])) {
          data.sentiment = rawData.sentiment as 'positive' | 'neutral' | 'negative';
        }

        const rawPos = (n.position && typeof n.position === 'object') ? n.position as Record<string, unknown> : {};
        const validTypes: CjmNodeType[] = ['stage', 'touchpoint', 'emotion', 'pain', 'opportunity'];
        const nodeType = validTypes.includes(String(n.type) as CjmNodeType) ? String(n.type) as CjmNodeType : 'stage';

        return { id: newId, type: nodeType, position: { x: Number(rawPos.x ?? 0), y: Number(rawPos.y ?? 0) }, data };
      });

      const edges: CjmFlowEdge[] = rawEdges.map((e, i) => ({
        id: `${mapId}-edge${i}`,
        source: idMap.get(String(e.source ?? '')) ?? `${mapId}-${String(e.source ?? '')}`,
        target: idMap.get(String(e.target ?? '')) ?? `${mapId}-${String(e.target ?? '')}`,
      }));

      const validStatuses: CjmStatus[] = ['draft', 'active', 'archived'];
      const map: CjmMap = {
        id: mapId,
        title: String(input.title ?? 'Новый CJM'),
        persona: String(input.persona ?? ''),
        status: validStatuses.includes(String(input.status) as CjmStatus) ? String(input.status) as CjmStatus : 'draft',
        updatedAt: today,
        description: String(input.description ?? ''),
        nodes,
        edges,
      };

      useCjmStore.getState().addGeneratedMap(map);
      return { success: true, id: mapId, title: map.title };
    }

    case 'update_cjm': {
      const mapId = typeof input.id === 'string' ? input.id : '';
      if (!mapId) return { error: 'id is required' };

      const store = useCjmStore.getState();
      const isGenerated = store.generatedMaps.some((m) => m.id === mapId);
      const fixture = isGenerated ? undefined : await getCjmById(mapId);
      if (!isGenerated && !fixture) return { error: `CJM not found: ${mapId}` };

      const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('ru-RU');

      // Update metadata for generated maps
      if (isGenerated) {
        const metaUpdates: Partial<CjmMap> = { updatedAt: today };
        if (typeof input.title === 'string')       metaUpdates.title = input.title;
        if (typeof input.persona === 'string')     metaUpdates.persona = input.persona;
        if (typeof input.description === 'string') metaUpdates.description = input.description;
        const validStatuses: CjmStatus[] = ['draft', 'active', 'archived'];
        if (validStatuses.includes(String(input.status) as CjmStatus)) {
          metaUpdates.status = String(input.status) as CjmStatus;
        }
        store.updateMap(mapId, metaUpdates);
      }

      // Update nodes/edges if provided
      if (Array.isArray(input.nodes)) {
        const rawNodes = input.nodes as Record<string, unknown>[];
        const nodes: CjmFlowNode[] = rawNodes.map((n) => {
          const rawData = (n.data && typeof n.data === 'object') ? n.data as Record<string, unknown> : {};
          const data: CjmNodeData = { label: String(rawData.label ?? '') };
          if (typeof rawData.metric === 'string')      data.metric = rawData.metric;
          if (typeof rawData.channel === 'string')     data.channel = rawData.channel;
          if (typeof rawData.description === 'string') data.description = rawData.description;
          const sentiments = ['positive', 'neutral', 'negative'] as const;
          if (sentiments.includes(rawData.sentiment as typeof sentiments[number])) {
            data.sentiment = rawData.sentiment as 'positive' | 'neutral' | 'negative';
          }
          const rawPos = (n.position && typeof n.position === 'object') ? n.position as Record<string, unknown> : {};
          const validTypes: CjmNodeType[] = ['stage', 'touchpoint', 'emotion', 'pain', 'opportunity'];
          const nodeType = validTypes.includes(String(n.type) as CjmNodeType) ? String(n.type) as CjmNodeType : 'stage';
          return { id: String(n.id ?? ''), type: nodeType, position: { x: Number(rawPos.x ?? 0), y: Number(rawPos.y ?? 0) }, data };
        });
        store.setMapNodes(mapId, nodes);
      }

      if (Array.isArray(input.edges)) {
        const rawEdges = input.edges as Record<string, unknown>[];
        const edges: CjmFlowEdge[] = rawEdges.map((e) => ({
          id: String(e.id ?? ''),
          source: String(e.source ?? ''),
          target: String(e.target ?? ''),
        }));
        store.setMapEdges(mapId, edges);
      }

      return { success: true, id: mapId };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
