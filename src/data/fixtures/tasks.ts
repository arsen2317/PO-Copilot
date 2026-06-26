import type { Task } from '../types';

const u1 = { id: 'u1', name: 'Анна Смирнова', role: 'developer' };
const u2 = { id: 'u2', name: 'Иван Петров', role: 'product_manager' };
const u3 = { id: 'u3', name: 'Мария Ковалёва', role: 'designer' };
const u4 = { id: 'u4', name: 'Дмитрий Волков', role: 'developer' };
const u5 = { id: 'u5', name: 'Екатерина Новикова', role: 'qa' };
const u6 = { id: 'u6', name: 'Сергей Лебедев', role: 'analyst' };

export const taskFixtures: Task[] = [
  // ── BACKLOG ──────────────────────────────────────────────────────────────────
  {
    id: 'TASK-011',
    title: 'Добавить биометрическую аутентификацию в мобильное приложение',
    status: 'backlog',
    priority: 'high',
    riskLevel: 'warning',
    storyPoints: 13,
    epicId: 'EPIC-3',
    labels: ['mobile', 'security'],
    assignee: u4,
    deadline: '2026-07-25',
    createdAt: '2026-06-10',
    description:
      'Реализовать вход по Face ID / Touch ID в iOS и Android-версиях. Требуется согласование с командой безопасности и compliance-отдела банка.',
    criteria: [
      { id: 'c1', text: 'Face ID работает на iOS 15+', done: false },
      { id: 'c2', text: 'Touch ID работает на Android 9+', done: false },
      { id: 'c3', text: 'Fallback на PIN при ошибке биометрии', done: false },
      { id: 'c4', text: 'Логирование попыток входа в аудит-лог', done: false },
    ],
    compliance: [
      { id: 'cc1', label: 'Согласовано с ИБ-отделом', passed: false },
      { id: 'cc2', label: 'Соответствует ГОСТ Р 57580', passed: false },
    ],
    relatedMetricIds: ['dau', 'auth_success_rate'],
  },
  {
    id: 'TASK-012',
    title: 'Разработать модуль аналитики конверсии воронки онбординга',
    status: 'backlog',
    priority: 'medium',
    riskLevel: 'ok',
    storyPoints: 8,
    epicId: 'EPIC-1',
    labels: ['analytics', 'onboarding'],
    assignee: u6,
    deadline: '2026-07-30',
    createdAt: '2026-06-12',
    description:
      'Разработать внутренний дашборд с детальными воронками по шагам онбординга. Источник данных — Amplitude через внутренний прокси.',
    criteria: [
      { id: 'c1', text: 'Воронка отображает каждый шаг (6 шагов)', done: false },
      { id: 'c2', text: 'Фильтр по дате, каналу, версии приложения', done: false },
      { id: 'c3', text: 'Экспорт в CSV', done: false },
    ],
    compliance: [],
    relatedMetricIds: ['onboarding_conversion', 'time_to_first_action'],
  },
  {
    id: 'TASK-013',
    title: 'Пересмотреть информационную архитектуру раздела «Продукты»',
    status: 'backlog',
    priority: 'low',
    riskLevel: 'ok',
    storyPoints: 5,
    epicId: 'EPIC-2',
    labels: ['ux', 'research'],
    assignee: u3,
    createdAt: '2026-06-15',
    description:
      'Провести UX-аудит раздела «Продукты» по результатам пользовательского тестирования (май 2026). Предложить новую ИА с учётом выявленных болевых точек.',
    criteria: [
      { id: 'c1', text: 'Проведено 5+ интервью с пользователями', done: false },
      { id: 'c2', text: 'Составлена карта текущего пути', done: false },
      { id: 'c3', text: 'Предложены 3 варианта новой ИА', done: false },
    ],
    compliance: [],
    artifacts: [
      { type: 'confluence', title: 'Отчёт UX-тестирования май 2026', url: '#' },
    ],
  },

  // ── TODO ─────────────────────────────────────────────────────────────────────
  {
    id: 'TASK-007',
    title: 'Реализовать push-уведомления о статусах заявок',
    status: 'todo',
    priority: 'high',
    riskLevel: 'warning',
    storyPoints: 8,
    epicId: 'EPIC-3',
    sprintId: 'SPRINT-14',
    labels: ['mobile', 'notifications'],
    assignee: u4,
    deadline: '2026-07-05',
    createdAt: '2026-06-08',
    description:
      'Подключить Firebase Cloud Messaging для iOS и Android. Отправлять уведомления при смене статуса заявки на кредит/карту. Тип уведомления и шаблоны согласовать с маркетингом.',
    criteria: [
      { id: 'c1', text: 'Уведомления приходят в течение 30 сек после события', done: false },
      { id: 'c2', text: 'Пользователь может отписаться от уведомлений', done: false },
      { id: 'c3', text: 'Логотип и tone-of-voice банка в шаблонах', done: false },
    ],
    compliance: [
      { id: 'cc1', label: 'Шаблоны согласованы с маркетингом', passed: false },
    ],
    comments: [
      {
        id: 'cm1',
        author: u2,
        text: 'Нужно убедиться, что уведомления не попадают в ночное время (22:00–08:00). Требование от compliance.',
        time: '2026-06-20 11:32',
      },
    ],
    relatedMetricIds: ['push_open_rate'],
  },
  {
    id: 'TASK-008',
    title: 'Обновить флоу восстановления пароля',
    status: 'todo',
    priority: 'medium',
    riskLevel: 'ok',
    storyPoints: 5,
    epicId: 'EPIC-3',
    sprintId: 'SPRINT-14',
    labels: ['auth', 'ux'],
    assignee: u1,
    deadline: '2026-07-08',
    createdAt: '2026-06-09',
    description:
      'Текущий флоу восстановления пароля устарел (3 шага → нужно свести к 2). Заменить SMS-OTP на push-OTP там, где у пользователя установлено приложение.',
    criteria: [
      { id: 'c1', text: 'Новый флоу проходит за ≤2 шага', done: false },
      { id: 'c2', text: 'Push-OTP как приоритетный канал', done: false },
      { id: 'c3', text: 'Fallback на SMS при отсутствии приложения', done: false },
      { id: 'c4', text: 'Покрытие тестами ≥80%', done: false },
    ],
    compliance: [
      { id: 'cc1', label: 'Проверка на соответствие 152-ФЗ', passed: true },
    ],
    artifacts: [
      { type: 'figma', title: 'Новый флоу восстановления пароля', url: '#' },
    ],
  },
  {
    id: 'TASK-009',
    title: 'Провести груминг бэклога Q3',
    status: 'todo',
    priority: 'high',
    riskLevel: 'warning',
    storyPoints: 2,
    epicId: 'EPIC-2',
    sprintId: 'SPRINT-14',
    labels: ['process'],
    assignee: u2,
    deadline: '2026-06-30',
    createdAt: '2026-06-14',
    description:
      'Провести сессию груминга для подготовки бэклога Q3. Цель: оценить топ-20 задач, выявить зависимости, расставить compliance-метки.',
    criteria: [
      { id: 'c1', text: 'Все задачи с приоритетом high/critical оценены', done: false },
      { id: 'c2', text: 'Зависимости между задачами зафиксированы', done: false },
      { id: 'c3', text: 'Compliance-метки проставлены', done: false },
    ],
    compliance: [],
    comments: [
      {
        id: 'cm1',
        author: u6,
        text: 'Предлагаю включить в повестку задачи по новому регулированию ЦБ от 15 июня.',
        time: '2026-06-22 14:15',
      },
      {
        id: 'cm2',
        author: u2,
        text: 'Хорошая идея, добавил в программу.',
        time: '2026-06-22 14:48',
      },
    ],
  },

  // ── IN PROGRESS ───────────────────────────────────────────────────────────────
  {
    id: 'TASK-001',
    title: 'Исправить падение конверсии на шаге «Ввод паспорта»',
    status: 'in_progress',
    priority: 'critical',
    riskLevel: 'critical',
    storyPoints: 5,
    epicId: 'EPIC-1',
    sprintId: 'SPRINT-14',
    labels: ['bug', 'conversion', 'critical'],
    assignee: u1,
    deadline: '2026-06-28',
    createdAt: '2026-06-19',
    description:
      'После деплоя PR #4521 конверсия на шаге ввода паспортных данных упала на 10,3% (с 74% до 63,7%). По данным Sentry зафиксированы ошибки валидации серии паспорта в старом формате (до 2020 года). Необходимо откатить валидацию или добавить поддержку обоих форматов.',
    criteria: [
      { id: 'c1', text: 'Поддержка паспортов старого формата (до 2020)', done: true },
      { id: 'c2', text: 'Конверсия вернулась к базовому уровню ≥72%', done: false },
      { id: 'c3', text: 'Регрессионные тесты прошли', done: true },
      { id: 'c4', text: 'Hotfix задеплоен в prod без простоя', done: false },
    ],
    compliance: [
      { id: 'cc1', label: 'Изменения согласованы с командой ИБ', passed: true },
    ],
    artifacts: [
      { type: 'pr', title: 'PR #4521 — Валидация паспортов', url: '#' },
      { type: 'metric', title: 'Конверсия онбординга', url: '#' },
    ],
    comments: [
      {
        id: 'cm1',
        author: u5,
        text: 'Воспроизвела баг на тестовом окружении. Паспорта серии с буквами из старого алфавита падают с ошибкой 422.',
        time: '2026-06-19 10:14',
      },
      {
        id: 'cm2',
        author: u1,
        text: 'Нашла проблему. В regex убрали поддержку старых серий. Готовлю hotfix.',
        time: '2026-06-19 11:45',
      },
      {
        id: 'cm3',
        author: u2,
        text: 'Держите в приоритете, это блокирует онбординг примерно 12% новых пользователей.',
        time: '2026-06-19 12:02',
      },
    ],
    relatedMetricIds: ['onboarding_conversion', 'daily_errors'],
  },
  {
    id: 'TASK-002',
    title: 'Редизайн экрана выбора тарифного плана',
    status: 'in_progress',
    priority: 'high',
    riskLevel: 'ok',
    storyPoints: 8,
    epicId: 'EPIC-2',
    sprintId: 'SPRINT-14',
    labels: ['design', 'conversion'],
    assignee: u3,
    deadline: '2026-07-02',
    createdAt: '2026-06-11',
    description:
      'По результатам A/B-теста (май 2026) новый вариант экрана выбора тарифа даёт +8% к конверсии. Необходимо довести дизайн до production-качества и передать в разработку.',
    criteria: [
      { id: 'c1', text: 'Финальные макеты в Figma по всем брейкпойнтам', done: true },
      { id: 'c2', text: 'Компонент CardTariff описан в дизайн-системе', done: true },
      { id: 'c3', text: 'Прошла проверка accessibility (WCAG AA)', done: false },
      { id: 'c4', text: 'Макеты переданы в разработку с аннотациями', done: false },
    ],
    compliance: [
      { id: 'cc1', label: 'Юридический дисклеймер присутствует', passed: true },
      { id: 'cc2', label: 'Цены соответствуют актуальному прайс-листу', passed: false },
    ],
    artifacts: [
      { type: 'figma', title: 'Экран выбора тарифа v2', url: '#' },
      { type: 'confluence', title: 'Результаты A/B-теста май 2026', url: '#' },
    ],
    comments: [
      {
        id: 'cm1',
        author: u2,
        text: 'Мария, не забудь добавить вариант для корпоративных клиентов, у них другой набор тарифов.',
        time: '2026-06-17 09:30',
      },
      {
        id: 'cm2',
        author: u3,
        text: 'Учла, добавила отдельный экран для B2B-флоу.',
        time: '2026-06-17 16:22',
      },
    ],
    relatedMetricIds: ['tariff_conversion', 'arpu'],
  },
  {
    id: 'TASK-003',
    title: 'Интегрировать новый API кредитного скоринга (v3)',
    status: 'in_progress',
    priority: 'high',
    riskLevel: 'warning',
    storyPoints: 13,
    epicId: 'EPIC-1',
    sprintId: 'SPRINT-14',
    labels: ['integration', 'api', 'compliance'],
    assignee: u4,
    deadline: '2026-07-10',
    createdAt: '2026-06-05',
    description:
      'Миграция с внутреннего API скоринга v2 на новый v3. Изменился формат ответа, добавлены новые поля риска. Требуется обновить маппинг и протестировать на реальных сценариях с командой рисков.',
    criteria: [
      { id: 'c1', text: 'Маппинг полей v2→v3 реализован', done: true },
      { id: 'c2', text: 'Тесты с командой рисков пройдены', done: false },
      { id: 'c3', text: 'Откат на v2 предусмотрен через feature-flag', done: true },
      { id: 'c4', text: 'Нагрузочное тестирование (1000 rps)', done: false },
      { id: 'c5', text: 'Документация обновлена', done: false },
    ],
    compliance: [
      { id: 'cc1', label: 'Согласовано с командой рисков', passed: false },
      { id: 'cc2', label: 'Пройдена проверка ИБ', passed: true },
      { id: 'cc3', label: 'Изменения задокументированы для аудита', passed: false },
    ],
    artifacts: [
      { type: 'confluence', title: 'Спецификация API скоринга v3', url: '#' },
      { type: 'pr', title: 'PR #4589 — Scoring API v3 integration', url: '#' },
    ],
    comments: [
      {
        id: 'cm1',
        author: u6,
        text: 'В новом API появилось поле `risk_category` с 5 уровнями вместо 3. Нужно обновить логику отображения для пользователей.',
        time: '2026-06-18 13:00',
      },
    ],
    relatedMetricIds: ['credit_approval_rate', 'scoring_latency'],
  },

  // ── REVIEW ────────────────────────────────────────────────────────────────────
  {
    id: 'TASK-005',
    title: 'Оптимизировать скорость загрузки главного экрана',
    status: 'review',
    priority: 'high',
    riskLevel: 'ok',
    storyPoints: 8,
    epicId: 'EPIC-2',
    sprintId: 'SPRINT-14',
    labels: ['performance', 'mobile'],
    assignee: u1,
    deadline: '2026-06-27',
    createdAt: '2026-06-01',
    description:
      'Время загрузки главного экрана выросло до 3,8 сек (целевое: ≤2 сек). Анализ показал избыточные запросы при инициализации и неоптимизированные изображения. Выполнена оптимизация: lazy loading, CDN для ассетов, кеширование API-ответов.',
    criteria: [
      { id: 'c1', text: 'Time-to-interactive ≤2 сек на Pixel 5', done: true },
      { id: 'c2', text: 'Размер bundle уменьшен минимум на 20%', done: true },
      { id: 'c3', text: 'Lighthouse Score ≥90', done: true },
      { id: 'c4', text: 'Нет регрессий в Sentry за 48 часов', done: false },
    ],
    compliance: [],
    artifacts: [
      { type: 'pr', title: 'PR #4601 — Performance optimization', url: '#' },
      { type: 'metric', title: 'App Load Time', url: '#' },
    ],
    comments: [
      {
        id: 'cm1',
        author: u5,
        text: 'Тестирую на реальных устройствах. На iOS 15 загрузка 1,7 сек, на Android 9 — 2,1 сек. Продолжаю мониторинг.',
        time: '2026-06-25 15:44',
      },
    ],
    relatedMetricIds: ['app_load_time', 'crash_rate'],
  },
  {
    id: 'TASK-006',
    title: 'Добавить раздел «История операций» в личный кабинет',
    status: 'review',
    priority: 'medium',
    riskLevel: 'ok',
    storyPoints: 5,
    epicId: 'EPIC-2',
    sprintId: 'SPRINT-14',
    labels: ['feature', 'lk'],
    assignee: u4,
    deadline: '2026-06-28',
    createdAt: '2026-06-03',
    description:
      'Реализован раздел с историей операций за последние 12 месяцев с пагинацией, фильтрами (тип, дата, сумма) и экспортом в PDF.',
    criteria: [
      { id: 'c1', text: 'Отображение операций за 12 месяцев', done: true },
      { id: 'c2', text: 'Фильтры по типу, дате и сумме', done: true },
      { id: 'c3', text: 'Экспорт в PDF с логотипом банка', done: true },
      { id: 'c4', text: 'Пагинация (50 операций на страницу)', done: true },
    ],
    compliance: [
      { id: 'cc1', label: 'PDF-выгрузка соответствует требованиям 152-ФЗ', passed: true },
    ],
    artifacts: [
      { type: 'figma', title: 'История операций — финальный макет', url: '#' },
      { type: 'pr', title: 'PR #4612 — Transaction history', url: '#' },
    ],
    comments: [
      {
        id: 'cm1',
        author: u5,
        text: 'Всё работает. Нашла один баг: при экспорте > 500 операций PDF генерируется >30 сек. Нужно добавить прогресс-бар или limit.',
        time: '2026-06-24 17:10',
      },
      {
        id: 'cm2',
        author: u4,
        text: 'Добавил limit 200 операций на экспорт и тост с пояснением. Готово к ре-ревью.',
        time: '2026-06-25 10:30',
      },
    ],
    relatedMetricIds: ['dau', 'session_duration'],
  },

  // ── DONE ──────────────────────────────────────────────────────────────────────
  {
    id: 'TASK-004',
    title: 'Написать тест-кейсы для онбординга',
    status: 'done',
    priority: 'medium',
    riskLevel: 'ok',
    storyPoints: 3,
    epicId: 'EPIC-1',
    sprintId: 'SPRINT-13',
    labels: ['qa', 'onboarding'],
    assignee: u5,
    deadline: '2026-06-20',
    createdAt: '2026-06-04',
    description:
      'Покрыть все шаги онбординга (6 экранов) e2e-тестами в Playwright. Включить позитивные, негативные и edge-кейсы.',
    criteria: [
      { id: 'c1', text: '42 тест-кейса написаны и прошли', done: true },
      { id: 'c2', text: 'Покрытие ≥85% критических путей', done: true },
      { id: 'c3', text: 'Тесты включены в CI-пайплайн', done: true },
    ],
    compliance: [],
    artifacts: [
      { type: 'confluence', title: 'Тест-план онбординга Q2 2026', url: '#' },
    ],
    comments: [],
    relatedMetricIds: ['onboarding_conversion'],
  },
  {
    id: 'TASK-010',
    title: 'Обновить политику хранения cookie и баннер согласия',
    status: 'done',
    priority: 'critical',
    riskLevel: 'ok',
    storyPoints: 3,
    epicId: 'EPIC-1',
    sprintId: 'SPRINT-13',
    labels: ['compliance', 'legal'],
    assignee: u1,
    deadline: '2026-06-15',
    createdAt: '2026-06-01',
    description:
      'Привести баннер согласия и политику cookie в соответствие с новыми требованиями регулятора (письмо ЦБ от 01.06.2026). Срок исполнения — 15.06.2026.',
    criteria: [
      { id: 'c1', text: 'Обновлена политика на сайте и в приложении', done: true },
      { id: 'c2', text: 'Баннер требует явного согласия', done: true },
      { id: 'c3', text: 'Логирование согласий пользователей', done: true },
      { id: 'c4', text: 'Проверено юридическим отделом', done: true },
    ],
    compliance: [
      { id: 'cc1', label: 'Соответствует письму ЦБ от 01.06.2026', passed: true },
      { id: 'cc2', label: 'Подтверждено юридическим отделом', passed: true },
    ],
    comments: [
      {
        id: 'cm1',
        author: u2,
        text: 'Отличная работа, задача закрыта досрочно. Спасибо всем!',
        time: '2026-06-13 18:00',
      },
    ],
  },
];
