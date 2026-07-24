import { getMetricDefinitions, getMetricGroupDefs } from '../data/api/metric-definitions';
import { getFunnelAnalytics } from '../data/api/funnel-analytics';
import { getTasks, getEpics, getTeams, getEmployees } from '../data/api/tasks';
import { getAgents } from '../data/api/agents';
import { getArtifacts } from '../data/api/knowledge';
import { getCjmList, getCjmById } from '../data/api/cjm';
import { getToken } from '../features/auth/auth';
import { useUIStore } from '../store/uiStore';
import { useCjmStore } from '../store/cjmStore';
import { useKnowledgeStore } from '../store/knowledgeStore';
import { buildCjmFromTemplate, type CjmStageInput } from '../features/cjm/cjmLayout';
import type { CjmMap, CjmNodeData, CjmStatus, KnowledgeArtifact, ArtifactType } from '../data/types';

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
        linkedArtifactIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'ID артефактов Базы знаний (из get_knowledge_artifacts или из save_artifact в этом диалоге), которые нужно привязать к задаче. ' +
            'Если задача создаётся на основе брифа/исследования/заметки — ОБЯЗАТЕЛЬНО привяжи этот артефакт, не спрашивая пользователя.',
        },
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
    description: 'Возвращает артефакты из базы знаний: опросы пользователей, UX-исследования, анализы оттока, NPS-отчёты, а также сохранённые заметки — с полными данными и инсайтами. Используй для обогащения CJM реальными болями и данными.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'save_artifact',
    description:
      'Сохраняет артефакт в раздел «База знаний»: заметку с саммари обсуждения, бриф на исследование, ключевые выводы, отчёт. ' +
      'Используй, когда пользователь просит сохранить обсуждённое «в заметку»/«в базу знаний», сохранить созданный бриф или выводы. ' +
      'Перед сохранением коротко покажи, что именно сохранишь. После успешного вызова ОБЯЗАТЕЛЬНО выведи блок artifact-result со ссылкой на артефакт.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Короткий заголовок артефакта (до 80 символов)' },
        type: {
          type: 'string',
          enum: ['note', 'research', 'analysis', 'report', 'survey'],
          description: 'note=заметка/саммари, research=бриф/исследование, analysis=анализ, report=отчёт, survey=опрос. По умолчанию note.',
        },
        description: {
          type: 'string',
          description: 'Содержание артефакта в Markdown. Подзаголовки — строкой **жирным**, списки — через «- », цитаты — через «> ». Структурно и по делу.',
        },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'create_cjm',
    description:
      'Создаёт новый CJM и сохраняет его в текущей сессии. Возвращает id и title. ' +
      'Позиции нод, ID и рёбра между этапами вычисляются автоматически из массива stages — ' +
      'тебе нужно передать только содержание каждого этапа, а не координаты или технические ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Название CJM (конкретное, описывает сценарий)' },
        persona: { type: 'string', description: 'Описание персоны (возраст, роль, контекст)' },
        description: { type: 'string', description: 'Краткое описание CJM (1-2 предложения, со ссылками на данные)' },
        status: { type: 'string', enum: ['draft', 'active', 'archived'], description: 'Статус. По умолчанию: draft' },
        stages: {
          type: 'array',
          description: 'Этапы пути клиента по порядку (оптимально 5, не менее 4, не более 7). Для каждого — содержание всех строк карты.',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Название этапа (1-3 слова)' },
              metric: { type: 'string', description: 'Реальная метрика этапа, например "84 000 пользователей · CR 62%" (из get_metrics/get_funnel_steps)' },
              linkedMetricId: { type: 'string', description: 'ID метрики из get_metrics, если этап однозначно ей соответствует (необязательно)' },
              touchpoint: {
                type: 'object',
                description: 'Конкретное взаимодействие клиента с продуктом на этом этапе',
                properties: {
                  label: { type: 'string', description: 'Конкретное описание взаимодействия' },
                  channel: { type: 'string', description: '"Приложение", "SMS", "Офлайн", "Браузер" и т.д.' },
                },
                required: ['label'],
              },
              emotion: {
                type: 'object',
                description: 'Реальная мысль/эмоция клиента (из исследований, не абстрактная)',
                properties: {
                  label: { type: 'string', description: 'Цитата или описание состояния клиента' },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                },
                required: ['label'],
              },
              pain: {
                type: 'object',
                description: 'Конкретная боль на этом этапе, желательно с цифрами',
                properties: {
                  label: { type: 'string', description: 'Конкретная боль (из get_knowledge_artifacts, воронки, поиска)' },
                  linkedArtifactId: {
                    type: 'string',
                    description: 'ID артефакта из get_knowledge_artifacts, если он напрямую подтверждает эту боль — привязывай, когда есть реально релевантный артефакт',
                  },
                },
                required: ['label'],
              },
              opportunity: {
                type: 'object',
                description: 'Конкретное actionable решение (фича, UX-изменение, процесс) — не общие слова',
                properties: {
                  label: { type: 'string', description: 'Конкретное улучшение' },
                  linkedArtifactId: {
                    type: 'string',
                    description: 'ID артефакта из get_knowledge_artifacts, если он обосновывает именно это решение',
                  },
                },
                required: ['label'],
              },
            },
            required: ['label', 'touchpoint', 'emotion', 'pain', 'opportunity'],
          },
        },
      },
      required: ['title', 'persona', 'description', 'stages'],
    },
  },
  {
    name: 'update_cjm',
    description:
      'Обновляет существующий CJM. Три независимых типа изменений, можно комбинировать в одном вызове:\n' +
      '1) метаданные (title/persona/description/status);\n' +
      '2) stages — полная пересборка нод/рёбер из шаблона (как в create_cjm): используй при добавлении/удалении этапов или полной реактуализации;\n' +
      '3) nodeUpdates — точечное обновление конкретных нод по id, без пересборки всей карты: самый дешёвый способ поправить 1-2 ноды (например текст и/или linkedArtifactId).',
    input_schema: {
      type: 'object' as const,
      properties: {
        id: { type: 'string', description: 'ID CJM-карты для обновления' },
        title: { type: 'string' },
        persona: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', enum: ['draft', 'active', 'archived'] },
        stages: {
          type: 'array',
          description: 'Полный новый набор этапов той же структуры, что и в create_cjm — заменяет все текущие ноды/рёбра.',
          items: { type: 'object' },
        },
        nodeUpdates: {
          type: 'array',
          description: 'Точечные изменения конкретных нод по id (получи id через get_cjm). Не влияет на остальные ноды.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID ноды, которую нужно изменить (из get_cjm)' },
              data: {
                type: 'object',
                description: 'Только те поля, которые нужно изменить.',
                properties: {
                  label: { type: 'string' },
                  metric: { type: 'string' },
                  channel: { type: 'string' },
                  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                  linkedMetricId: { type: 'string' },
                  linkedArtifactId: { type: 'string', description: 'ID артефакта для привязки. Передай пустую строку "", чтобы отвязать текущий артефакт.' },
                },
              },
            },
            required: ['id', 'data'],
          },
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_navigation',
    description:
      'Возвращает карту разделов приложения (маршруты, что где находится) и подсказки «как сделать» (создать CJM, добавить задачу и т.п.). ' +
      'Вызывай, когда пользователь спрашивает где что находится, как куда попасть или как что-то создать. ' +
      'В ответе давай кликабельную ссылку на раздел в формате Markdown на внутренний путь, например [Задачи](/tasks).',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_team_workload',
    description:
      'Возвращает загрузку сотрудников команды: сколько у каждого задач всего/активных/в работе/просроченных, сумму story points и флаг простоя (isIdle). ' +
      'Используй для поиска бутылочных горлышек, перегруженных и простаивающих сотрудников и рекомендаций по перераспределению задач.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
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

      const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('ru-RU');

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
      // Resolve linked knowledge-artifact ids → {id, title} (fixtures + session-saved)
      let linkedArtifacts: { id: string; title: string }[] = [];
      if (Array.isArray(input.linkedArtifactIds) && input.linkedArtifactIds.length > 0) {
        const ids = (input.linkedArtifactIds as unknown[]).map(String);
        const all = [...useKnowledgeStore.getState().generatedArtifacts, ...(await getArtifacts())];
        linkedArtifacts = ids
          .map((aid) => all.find((a) => a.id === aid))
          .filter((a): a is NonNullable<typeof a> => !!a)
          .map((a) => ({ id: a.id, title: a.title }));
      }

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
        ...(linkedArtifacts.length > 0 && { linkedArtifacts }),
      };
      const draftId = useUIStore.getState().addTaskDraft(draft);
      return {
        success: true,
        draftId,
        title: draft.title,
        linkedArtifacts,
        message: `Черновик «${draft.title}» создан${linkedArtifacts.length > 0 ? ` (привязано артефактов: ${linkedArtifacts.length})` : ''}.`,
      };
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
      const generated = useKnowledgeStore.getState().generatedArtifacts;
      return [...generated, ...artifacts].map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt,
      }));
    }

    case 'save_artifact': {
      const validTypes: ArtifactType[] = ['note', 'survey', 'research', 'analysis', 'report'];
      const type = validTypes.includes(String(input.type) as ArtifactType)
        ? (String(input.type) as ArtifactType)
        : 'note';
      const id = `art-gen${Date.now().toString(36)}`;
      const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('ru-RU');
      const artifact: KnowledgeArtifact = {
        id,
        type,
        title: String(input.title ?? 'Заметка'),
        description: String(input.description ?? ''),
        createdAt: today,
      };
      useKnowledgeStore.getState().addArtifact(artifact);
      return { success: true, id, title: artifact.title };
    }

    case 'get_navigation': {
      return {
        sections: [
          { label: 'Ассистент', route: '/assistant', about: 'ИИ-помощник: анализ, планирование, генерация' },
          { label: 'Дашборд', route: '/dashboard', about: 'Виджеты: воронка, NPS, скорость команды, инциденты' },
          { label: 'Метрики', route: '/metrics', about: 'Ключевые показатели продукта и тренды' },
          { label: 'Воронка конверсии', route: '/funnel', about: 'Шаги конверсии и падения; «Добавить воронку» — кнопка справа' },
          { label: 'Unit-экономика', route: '/unit-economics', about: 'Калькулятор прибыльности одной карты: CM, окупаемость, LTV' },
          { label: 'CJM', route: '/cjm', about: 'Карты пути клиента. Создать: кнопка «Создать CJM с ИИ» или «Добавить»' },
          { label: 'Задачи', route: '/tasks', about: 'Канбан/Список/Бэклог/Таймлайн/Черновики. Черновик создаёт ассистент (агент «Постановщик задач»)' },
          { label: 'База знаний', route: '/knowledge', about: 'Артефакты: опросы, исследования, анализы, отчёты, сохранённые заметки' },
          { label: 'Агенты', route: '/agents', about: 'Готовые агенты и конструктор (/agents/builder)' },
          { label: 'ИИ-сервисы', route: '/services', about: 'Каталог сторонних ИИ-инструментов' },
          { label: 'Комнаты', route: '/rooms', about: 'Планирование спринта, ретро, груминг' },
          { label: 'Уведомления', route: '/notifications', about: 'Лента уведомлений' },
          { label: 'Профиль', route: '/profile', about: 'Настройки профиля, интеграций, персонализации' },
        ],
        howTo: [
          { task: 'Создать CJM', steps: 'Раздел CJM (/cjm) → «Создать CJM с ИИ», либо попроси меня — я соберу карту' },
          { task: 'Добавить задачу', steps: 'Задачи (/tasks). Оформить черновик проще через меня — агент «Постановщик задач»' },
          { task: 'Посчитать unit-экономику', steps: 'Раздел Unit-экономика (/unit-economics), меняй параметры слева' },
          { task: 'Сохранить заметку в базу знаний', steps: 'Попроси меня «сохрани это в заметку» — я создам артефакт в Базе знаний' },
        ],
        linkFormat: 'Давай ссылку на раздел в чат как Markdown-ссылку на внутренний путь, напр. [Задачи](/tasks).',
      };
    }

    case 'get_team_workload': {
      const [tasks, employees] = await Promise.all([getTasks(), getEmployees()]);
      const today = new Date().toISOString().split('T')[0] ?? '';
      const activeStatuses = new Set(['todo', 'in_progress', 'review']);
      return employees.map((e) => {
        const assigned = tasks.filter((t) => t.assignee?.id === e.id);
        const active = assigned.filter((t) => activeStatuses.has(t.status));
        return {
          id: e.id,
          name: e.name,
          role: e.role,
          department: e.department,
          totalTasks: assigned.length,
          activeTasks: active.length,
          inProgress: assigned.filter((t) => t.status === 'in_progress').length,
          overdueTasks: assigned.filter((t) => t.deadline && t.deadline < today && t.status !== 'done').length,
          activeStoryPoints: active.reduce((s, t) => s + (t.storyPoints ?? 0), 0),
          isIdle: active.length === 0,
        };
      });
    }

    case 'create_cjm': {
      const prefix = `gen${Date.now().toString(36)}`;
      const mapId = `cjm-${prefix}`;
      const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('ru-RU');

      const rawStages = Array.isArray(input.stages) ? (input.stages as Record<string, unknown>[]) : [];
      const stages = rawStages.map(sanitizeStageInput);
      const { nodes, edges } = buildCjmFromTemplate(mapId, stages);

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
      return { success: true, id: mapId, title: map.title, stagesCount: stages.length };
    }

    case 'update_cjm': {
      const mapId = typeof input.id === 'string' ? input.id : '';
      if (!mapId) return { error: 'id is required' };

      const store = useCjmStore.getState();
      const generatedMap = store.generatedMaps.find((m) => m.id === mapId);
      const isGenerated = !!generatedMap;
      const fixture = isGenerated ? undefined : await getCjmById(mapId);
      if (!isGenerated && !fixture) return { error: `CJM not found: ${mapId}` };

      const today = new Date().toISOString().split('T')[0] ?? new Date().toLocaleDateString('ru-RU');

      // 1) Metadata — only mutable for AI-generated maps (fixtures are read-only source data)
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

      // 2) Full rebuild from a simplified stages template (restructure / re-actualize)
      if (Array.isArray(input.stages)) {
        const rawStages = input.stages as Record<string, unknown>[];
        const stages = rawStages.map(sanitizeStageInput);
        const { nodes, edges } = buildCjmFromTemplate(mapId, stages);
        store.setMapNodes(mapId, nodes);
        store.setMapEdges(mapId, edges);
      }

      // 3) Surgical partial edits — cheapest path, doesn't require resending the whole graph
      if (Array.isArray(input.nodeUpdates)) {
        const rawUpdates = input.nodeUpdates as Record<string, unknown>[];
        const baseNodes = store.nodesState[mapId] ?? generatedMap?.nodes ?? fixture?.nodes ?? [];
        let nodes = baseNodes;
        for (const u of rawUpdates) {
          const nodeId = String(u.id ?? '');
          if (!nodeId) continue;
          const rawData = (u.data && typeof u.data === 'object') ? u.data as Record<string, unknown> : {};
          const patch: Partial<CjmNodeData> = {};
          if (typeof rawData.label === 'string')         patch.label = rawData.label;
          if (typeof rawData.metric === 'string')        patch.metric = rawData.metric;
          if (typeof rawData.channel === 'string')       patch.channel = rawData.channel;
          if (typeof rawData.linkedMetricId === 'string') patch.linkedMetricId = rawData.linkedMetricId;
          const sentiments = ['positive', 'neutral', 'negative'] as const;
          if (sentiments.includes(rawData.sentiment as typeof sentiments[number])) {
            patch.sentiment = rawData.sentiment as 'positive' | 'neutral' | 'negative';
          }
          const unlinkArtifact = rawData.linkedArtifactId === '';
          if (!unlinkArtifact && typeof rawData.linkedArtifactId === 'string') {
            patch.linkedArtifactId = rawData.linkedArtifactId;
          }
          nodes = nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const newData: CjmNodeData = { ...n.data, ...patch };
            if (unlinkArtifact) delete newData.linkedArtifactId;
            return { ...n, data: newData };
          });
        }
        store.setMapNodes(mapId, nodes);
      }

      return { success: true, id: mapId };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function sanitizeStageInput(raw: Record<string, unknown>): CjmStageInput {
  const stage: CjmStageInput = { label: String(raw.label ?? '') };
  if (typeof raw.metric === 'string') stage.metric = raw.metric;
  if (typeof raw.linkedMetricId === 'string') stage.linkedMetricId = raw.linkedMetricId;

  const tp = (raw.touchpoint && typeof raw.touchpoint === 'object') ? raw.touchpoint as Record<string, unknown> : null;
  if (tp) {
    stage.touchpoint = { label: String(tp.label ?? '') };
    if (typeof tp.channel === 'string') stage.touchpoint.channel = tp.channel;
  }

  const em = (raw.emotion && typeof raw.emotion === 'object') ? raw.emotion as Record<string, unknown> : null;
  if (em) {
    stage.emotion = { label: String(em.label ?? '') };
    const sentiments = ['positive', 'neutral', 'negative'] as const;
    if (sentiments.includes(em.sentiment as typeof sentiments[number])) {
      stage.emotion.sentiment = em.sentiment as 'positive' | 'neutral' | 'negative';
    }
  }

  const pn = (raw.pain && typeof raw.pain === 'object') ? raw.pain as Record<string, unknown> : null;
  if (pn) {
    stage.pain = { label: String(pn.label ?? '') };
    if (typeof pn.linkedArtifactId === 'string' && pn.linkedArtifactId) stage.pain.linkedArtifactId = pn.linkedArtifactId;
  }

  const op = (raw.opportunity && typeof raw.opportunity === 'object') ? raw.opportunity as Record<string, unknown> : null;
  if (op) {
    stage.opportunity = { label: String(op.label ?? '') };
    if (typeof op.linkedArtifactId === 'string' && op.linkedArtifactId) stage.opportunity.linkedArtifactId = op.linkedArtifactId;
  }

  return stage;
}
