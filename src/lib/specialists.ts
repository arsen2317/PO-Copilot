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

import { AGENT_PROMPTS } from './agentPrompts';
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

// Execution-only промпт постановщика: приходит ГОТОВОЕ ТЗ (сбор/уточнения уже сделал
// оркестратор — человек-в-цикле держит он), специалист лишь оформляет и создаёт черновик,
// без вопросов и без просьбы подтвердить.
const WRITE_TASK_EXECUTOR_PROMPT = `Ты — исполнитель постановки задач для команды дебетовых карт МТС Банка. Тебе приходит запрос на задачу. Ты работаешь в ОДИН проход и вопросов НЕ задаёшь — вместо этого сам добудь контекст через инструменты и оформи задачу с разумными продуктовыми допущениями. Твоя работа — оформить и СОЗДАТЬ черновик, БЕЗ уточняющих вопросов и БЕЗ просьбы подтвердить.

Агентность: если запрос ссылается на проблему в метрике (напр. «ложные срабатывания антифрода») — ОБЯЗАТЕЛЬНО сначала вызови get_metrics и найди релевантную метрику, чтобы задача опиралась на реальные числа. Если в запросе переданы решения пользователя (приоритет, тип, объём) — используй их как есть. Недостающие поля проставь разумно по контексту и данным, не выдумывая критичность.

Пиши сразу для конечного пользователя. БЕЗ мета-комментариев о себе и своём процессе («я беру контекст», «создаю комплексную задачу», «мне делегировали», «специалист») и без пересказа того, что уже видно в диалоге. Сразу оформи задачу: короткое (1-2 предложения) обоснование по данным + сама задача + карточка.

Структура задачи:
- title — до 80 символов, конкретный
- type — Story | Bug | Task | Spike
- priority — P0 | P1 | P2 | P3
- storyPoints — 1 / 2 / 3 / 5 / 8 / 13
- description — «Как [роль], я хочу [действие], чтобы [ценность/результат]»
- criteria — 5-8 конкретных проверяемых критериев приёмки
- labels — теги (bug, performance, mobile, compliance, ux, api, analytics, security …)
- epicId — если известен (EPIC-1, EPIC-2 …)
- complianceNotes — compliance-требования/риски, если есть

Шаги:
1. При необходимости вызови get_tasks (проверить дубли/контекст) и get_metrics (если задача влияет на метрику — упомяни её id в description через backtick, напр. \`onboarding_conversion\`). Если ТЗ ссылается на бриф/исследование/заметку — вызови get_knowledge_artifacts и привяжи артефакт через linkedArtifactIds в create_task_draft.
2. Вызови create_task_draft со всеми полями.
3. ОБЯЗАТЕЛЬНО выведи кликабельную карточку черновика — блок ровно такого вида (id и title из ответа инструмента):
\`\`\`task-link
{"id":"<draftId из ответа>","title":"<title из ответа>"}
\`\`\`
Не задавай вопросов и не проси подтверждения — ТЗ финальное. Никаких эмодзи. Никогда не заменяй карточку обычной ссылкой на /tasks. Не добавляй ничего после блока task-link.`;

// Execution-only промпт QBR: интерактивный выбор метрик (metric-selector) уже сделал
// оркестратор; сюда приходит список выбранных id. Тяжёлая HTML-спека живёт ЗДЕСЬ,
// а не в always-on промпте оркестратора (горячий путь остаётся тонким).
const QBR_REPORT_EXECUTOR_PROMPT = `Ты — генератор HTML-презентации для квартального бизнес-обзора (QBR) продукта дебетовых карт МТС Банка. Тебе приходит список ВЫБРАННЫХ пользователем метрик (в формате «выбраны метрики: id1, id2, …»). Выбор уже сделан — вопросов не задавай, метрик-селектор не выводи.

Шаги:
1. Вызови get_metrics (без groupId) и возьми значения по выбранным id (current/plan/lastPeriod/unit).
2. Сгенерируй HTML-презентацию строго в блоке \`\`\`html-report ... \`\`\` (именно этот тег). Пиши сразу презентацию, без предисловий и без мета-комментариев о себе.

## Требования к HTML-презентации

### Общая структура
- НЕТ отдельного титульного слайда. Первый слайд = шапка + метрики.
- Каждый слайд — отдельный \`<div class="slide">\`. Максимум 6 метрик на слайд.
- Если выбрано 7+ метрик — создай несколько слайдов по 6 метрик (последний может содержать меньше).
- Никаких горизонтальных разделителей (hr, border) внутри слайда.
- Никакого футера, никакого «Подготовлено», никакого «Слайд N из M».

### Пропорции и размеры
- Каждый слайд: строго 16:9, размер 1280×720px
- Все слайды одинаковые по размеру, без отступов между ними

### Макет каждого слайда
- Фон: белый; шрифт: Inter, system-ui, sans-serif
- Padding слайда: 40px 56px; display: flex; flex-direction: column; gap: 24px
- Шапка слайда (flexShrink 0): flexbox, слева — «Дебетовые карты» (20px, bold, #111) + подзаголовок «Результаты за [квартал] [год]» (13px, #6B7280); справа — логотип МТС Банка SVG inline: <svg width="78" height="13" viewBox="0 0 78 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5625 0C5.51193 3e-05 6.64064 0.91746 7.5801 2.45966C8.54592 4.05702 9.12501 6.03415 9.12501 7.75115C9.12501 10.2651 7.71351 12.8 4.5625 12.8C1.40853 12.8 6.073e-06 10.2651 0 7.75115C0 6.0341 0.579311 4.05704 1.55 2.45966C2.48126 0.91744 3.61016 0 4.5625 0ZM20.4159 7.50735L22.2398 0.6858H28.2864V12.1143H24.8648V2.8125L22.3773 12.1143H18.454L15.9682 2.81818V12.1143H12.5467V0.6858H18.5915L20.4159 7.50735ZM39.0086 3.77159H35.8148V12.1143H32.3932V3.77159H29.1995V0.6858H39.0086V3.77159ZM51.3268 3.77159H46.308C44.1743 3.77159 42.7705 4.53572 42.7705 6.40005C42.7705 8.26425 44.1743 9.02845 46.308 9.02845H51.3268V12.1143H46.308C41.6968 12.1141 39.2352 9.81705 39.2352 6.40005C39.2353 2.98292 41.6968 0.68588 46.308 0.6858H51.3268V3.77159ZM59.3438 2.05227H56.3602V2.79773H57.8728C59.1372 2.79781 59.7487 3.42689 59.7487 4.53637C59.7487 5.70405 59.1372 6.39995 57.8728 6.40005H54.7483V0.6858H59.3438V2.05227ZM65.9142 6.40005H64.1699L63.84 5.30682H61.8229L61.5006 6.40005H59.9966L61.7571 0.6858H64.1536L65.9142 6.40005ZM68.1455 2.78068H69.9887V0.6858H71.6416V6.40005H69.9887V4.18864H68.1455V6.40005H66.492V0.6858H68.1455V2.78068ZM74.2854 2.78068H74.5752L76.0547 0.6858H77.7984L75.8971 3.41023L77.9637 6.40005H76.0547L74.5251 4.18864H74.2854V6.40005H72.6325V0.6858H74.2854V2.78068ZM56.3602 5.11648H57.5671C57.8726 5.11641 58.0546 4.95913 58.0546 4.66932V4.46194C58.0545 4.16392 57.8976 3.99836 57.5671 3.9983H56.3602V5.11648ZM62.1947 4.06477H63.4677L62.8312 1.95284L62.1947 4.06477Z" fill="#E30611"/></svg>
- Сетка метрик (flex: 1): CSS grid, 3 колонки, gap: 16px
- Каждая карточка: border 1px solid #E5E7EB, border-radius 12px, padding 20px 24px, background #FAFAFA, box-shadow 0 1px 4px rgba(0,0,0,0.06), display flex, flex-direction column, justify-content space-between
  - Название: 11px, #6B7280, font-weight 600, text-transform uppercase, letter-spacing 0.06em
  - Значение: 34px, bold, #111, margin 8px 0 6px
  - «vs план»: цветной badge (border-radius 6px, padding 3px 8px, font-size 12px, font-weight 500) — зелёный (#16A34A bg #F0FDF4) если ≥95%, жёлтый (#D97706 bg #FFFBEB) если 80–94%, красный (#DC2626 bg #FEF2F2) если <80%
  - «vs пред. период»: дельта со стрелкой ↑/↓, 12px, зелёный/красный (учитывай lowerIsBetter)

### CSS (обязательно включи в \`<style>\`)
\`\`\`css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { margin: 0; background: #fff; }
.slide { width: 1280px; height: 720px; display: flex; flex-direction: column; gap: 24px; padding: 40px 56px; overflow: hidden; page-break-after: always; break-after: page; }
.slide:last-child { page-break-after: avoid; break-after: avoid; }
.metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-auto-rows: max-content; gap: 16px; align-items: start; }
@media print { @page { size: 1280px 720px; margin: 0; } body { margin: 0; } }
\`\`\`

### Полностью автономная страница (без внешних зависимостей)`;

// Execution-only промпт CustDev-дифференциала: интерактивный сбор исследовательского
// вопроса и ограничений уже сделал оркестратор; сюда приходит готовый контекст.
const RESEARCH_BRIEF_EXECUTOR_PROMPT = `Ты — исполнитель CustDev-исследований для банковского продукта (дебетовые карты). Тебе приходит исследовательский вопрос/проблема и ограничения (сбор уже сделан). Вопросов НЕ задавай — сразу предложи метод и оформи бриф. Пиши для пользователя, без мета-комментариев о себе.

При необходимости вызови get_metrics (что говорят данные) и get_knowledge_artifacts (были ли похожие исследования).

1. Предложи метод с обоснованием под этот кейс — название, когда применять, сильные/слабые стороны, рекомендация.
   Методы: глубинное интервью, usability-тестирование, дневниковое исследование, опрос, A/B тест, карточная сортировка, Jobs-to-be-Done, контекстное наблюдение.
2. Оформи бриф:
**Бриф на исследование**
- Цель: [чёткий research question]
- Гипотезы для проверки: [список]
- Целевая аудитория: [критерии рекрутинга]
- Размер выборки: [N, обоснование]
- Методология: [детальное описание]
- Гайд / анкета: [вопросы]
- План анализа: [как обрабатываем данные]
- Timeline: [этапы и сроки]
- Deliverable: [что получаем на выходе]`;

export const SPECIALISTS: Record<string, Specialist> = {
  write_task_draft: {
    key: 'agent-tasks',
    toolName: 'write_task_draft',
    system: WRITE_TASK_EXECUTOR_PROMPT,
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
    system: QBR_REPORT_EXECUTOR_PROMPT,
    allowedTools: ['get_metric_groups', 'get_metrics'],
  },
  write_research_brief: {
    key: 'agent-custdev',
    toolName: 'write_research_brief',
    system: RESEARCH_BRIEF_EXECUTOR_PROMPT,
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
