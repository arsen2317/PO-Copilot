// Специалисты для оркестратора (вертикальный срез, Сессия 34).
//
// Паттерн «агент-как-инструмент»: оркестратор (главный цикл в AIPanelSider) владеет
// диалогом и интерактивным сбором, а тяжёлое исполнение делегирует специалисту —
// чистому stateless-исполнителю, вызываемому как инструмент по готовому ТЗ.
//
// Промпт специалиста ПЕРЕИСПОЛЬЗУЕТ существующий фокусный промпт агента из
// AGENT_PROMPTS (без дублирования текста), а набор инструментов сужается до нужного.
// Ключевые write-инструменты (create_task_draft / create_cjm / update_cjm) отданы
// ТОЛЬКО специалистам — оркестратор ими не владеет, поэтому правила рендера карточек
// (task-link / cjm-result) живут у специалиста, а не в лёгком base-промпте.

import { AGENT_PROMPTS, WRITE_TASK_SKILL, QBR_REPORT_SKILL, RESEARCH_BRIEF_SKILL } from '../skills';
import { TOOL_DEFINITIONS } from './tools';

export interface Specialist {
  /** Ключ агента, чей промпт переиспользуется как system специалиста. */
  key: string;
  /** Имя инструмента, которым оркестратор вызывает специалиста. */
  toolName: string;
  /** Фокусный system-промпт специалиста. */
  system: string;
  /** Имена инструментов, доступных специалисту (подмножество TOOL_DEFINITIONS). */
  allowedTools: string[];
}

// Инструменты, которыми владеет ТОЛЬКО специалист (у оркестратора его нет) — так
// правило рендера карточки task-link живёт у специалиста, а создание черновика
// гарантированно идёт через него (баг «голого линка» из общего чата закрыт).
// create_cjm/update_cjm НАМЕРЕННО остаются у оркестратора: интерактивная правка/
// актуализация/проверка привязанного артефакта CJM (в т.ч. отвязка) выполняется инлайн.
const SPECIALIST_OWNED_TOOLS = ['create_task_draft'];

export const SPECIALISTS: Record<string, Specialist> = {
  write_task_draft: {
    key: 'agent-tasks',
    toolName: 'write_task_draft',
    system: WRITE_TASK_SKILL,
    allowedTools: ['get_tasks', 'get_timeline', 'get_team_workload', 'get_metrics', 'get_knowledge_artifacts', 'create_task_draft'],
  },
  generate_cjm: {
    key: 'agent-cjm',
    toolName: 'generate_cjm',
    system: AGENT_PROMPTS['agent-cjm'] ?? '',
    allowedTools: ['get_cjm_list', 'get_cjm', 'get_metrics', 'get_funnel_steps', 'get_knowledge_artifacts', 'create_cjm', 'update_cjm', 'search_web'],
  },
  analyze_metrics: {
    key: 'agent-metrics',
    toolName: 'analyze_metrics',
    system: AGENT_PROMPTS['agent-metrics'] ?? '',
    allowedTools: ['get_metric_groups', 'get_metrics'],
  },
  analyze_risks: {
    key: 'agent-risks',
    toolName: 'analyze_risks',
    system: `${AGENT_PROMPTS['agent-risks'] ?? ''}\n\n(Работаешь в один проход: уточняющих вопросов НЕ задавай — анализируй с имеющимся контекстом и разумными допущениями. Пиши сразу для пользователя, без мета-комментариев о себе.)`,
    allowedTools: ['get_metrics', 'get_tasks', 'get_knowledge_artifacts'],
  },
  generate_hypotheses: {
    key: 'agent-hypotheses',
    toolName: 'generate_hypotheses',
    system: AGENT_PROMPTS['agent-hypotheses'] ?? '',
    allowedTools: ['get_metrics', 'get_funnel_steps', 'get_knowledge_artifacts'],
  },
  watch_trends: {
    key: 'agent-trends',
    toolName: 'watch_trends',
    system: AGENT_PROMPTS['agent-trends'] ?? '',
    allowedTools: ['search_web'],
  },
  make_briefing: {
    key: 'agent-briefing',
    toolName: 'make_briefing',
    system: AGENT_PROMPTS['agent-briefing'] ?? '',
    allowedTools: ['get_metric_groups', 'get_metrics', 'get_tasks', 'get_timeline'],
  },
  generate_qbr_report: {
    key: 'agent-qbr',
    toolName: 'generate_qbr_report',
    system: QBR_REPORT_SKILL,
    allowedTools: ['get_metric_groups', 'get_metrics'],
  },
  write_research_brief: {
    key: 'agent-custdev',
    toolName: 'write_research_brief',
    system: RESEARCH_BRIEF_SKILL,
    allowedTools: ['get_metrics', 'get_knowledge_artifacts'],
  },
};

// Схемы инструментов-специалистов, которые видит оркестратор.
export const SPECIALIST_TOOL_DEFINITIONS = [
  {
    name: 'write_task_draft',
    description:
      'Специалист-постановщик задач. Вызови, когда пользователь просит написать / оформить / поставить задачу в бэклог. ' +
      'В поле request передай ПОЛНОЕ описание задачи и весь релевантный контекст из диалога (проблема, метрика, id связанного артефакта). ' +
      'Специалист сам оформит черновик, вызовет create_task_draft и покажет пользователю кликабельную карточку черновика. ' +
      'НЕ вызывай create_task_draft сам — только через этого специалиста.',
    parameters: {
      type: 'object' as const,
      properties: {
        request: {
          type: 'string',
          description: 'Полное ТЗ на задачу: что нужно сделать, контекст, метрики, id связанных артефактов — всё, что специалист должен учесть.',
        },
      },
      required: ['request'],
    },
  },
  {
    name: 'generate_cjm',
    description:
      'Специалист по созданию CJM (карты пути клиента). Вызови, когда нужно ПОСТРОИТЬ новый CJM — после того как сценарий/персона выбраны пользователем ' +
      '(интерактивный подбор варианта делай сам, до вызова). В поле request передай выбранный сценарий/персону и цель карты. ' +
      'Специалист сам соберёт данные, построит карту и покажет карточку. ' +
      'Правку/актуализацию существующего CJM и проверку привязанного артефакта НЕ делегируй сюда — это интерактивные сценарии, выполняй их сам инлайн через get_cjm/update_cjm.',
    parameters: {
      type: 'object' as const,
      properties: {
        request: {
          type: 'string',
          description: 'Полное ТЗ на новый CJM: выбранный сценарий/персона, цель карты, ключевые этапы если заданы.',
        },
      },
      required: ['request'],
    },
  },
  {
    name: 'analyze_metrics',
    description: 'Продуктовый аналитик метрик. Вызови, когда пользователь просит проанализировать метрики / найти проблемные зоны / разобрать дашборд. В request передай фокус запроса (или «общий анализ»). Специалист сам загрузит метрики и выдаст диагностику.',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Что анализировать: конкретная зона/метрика или общий анализ + контекст из диалога.' } },
      required: ['request'],
    },
  },
  {
    name: 'analyze_risks',
    description: 'Эксперт по рискам (регуляторные/комплаенс, технические, продуктовые). Вызови, когда просят оценить риски фичи/решения/документа. В request передай, что анализировать, и весь контекст (описание фичи, ограничения).',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Что оценивать на риски + весь релевантный контекст из диалога.' } },
      required: ['request'],
    },
  },
  {
    name: 'generate_hypotheses',
    description: 'Генератор продуктовых гипотез с ICE-скорингом и планом проверки. Вызови, когда просят гипотезы / идеи экспериментов. В request передай проблему/цель и контекст.',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Проблема/цель для гипотез + контекст из диалога.' } },
      required: ['request'],
    },
  },
  {
    name: 'watch_trends',
    description: 'Трендвотчер: мониторинг конкурентов (Т-Банк, Сбер, ВТБ, Альфа …) и трендов через веб-поиск. Вызови, когда просят разбор трендов/конкурентов/новинок рынка. В request передай тему/конкурента/период.',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Тема / конкурент / период мониторинга (или «общий обзор»).' } },
      required: ['request'],
    },
  },
  {
    name: 'make_briefing',
    description: 'Ситуационный брифинг ПМ: главное за 3 дня, отклонения метрик, задачи требующие внимания, что решить сегодня. Вызови на запрос брифинга/сводки/«что важного». В request передай акцент, если есть.',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Акцент брифинга или «общий брифинг».' } },
      required: ['request'],
    },
  },
  {
    name: 'generate_qbr_report',
    description: 'Генератор HTML-презентации QBR. Вызывай ТОЛЬКО после того, как пользователь выбрал метрики в metric-selector и пришло сообщение «QBR: выбраны метрики: …». В request передай этот список выбранных метрик. Специалист сам соберёт значения и отрендерит презентацию.',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Список выбранных метрик в формате «выбраны метрики: id1, id2, …» + квартал/год если известны.' } },
      required: ['request'],
    },
  },
  {
    name: 'write_research_brief',
    description: 'CustDev-исполнитель: подбор метода исследования с обоснованием + бриф + гайд/анкета. Вызывай ПОСЛЕ того, как уточнил исследовательский вопрос и ограничения. В request передай research question, гипотезы, ограничения по времени/ресурсам.',
    parameters: {
      type: 'object' as const,
      properties: { request: { type: 'string', description: 'Исследовательский вопрос + гипотезы + ограничения (время/ресурсы) + что уже известно.' } },
      required: ['request'],
    },
  },
];

/** Подмножество инструментов для конкретного специалиста. */
export function toolsForSpecialist(spec: Specialist): object[] {
  return (TOOL_DEFINITIONS as readonly { name: string }[])
    .filter((t) => spec.allowedTools.includes(t.name)) as unknown as object[];
}

/** Инструменты оркестратора: все базовые кроме отданных специалистам + сами инструменты-специалисты. */
export function getOrchestratorTools(): object[] {
  const base = (TOOL_DEFINITIONS as readonly { name: string }[])
    .filter((t) => !SPECIALIST_OWNED_TOOLS.includes(t.name));
  return [...base, ...SPECIALIST_TOOL_DEFINITIONS] as unknown as object[];
}
