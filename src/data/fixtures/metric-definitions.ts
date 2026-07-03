import type { MetricDefinition, MetricGroupDef, MetricPoint } from '../types';

export const metricGroupDefs: MetricGroupDef[] = [
  { id: 'business',    name: 'Бизнес и портфель',           color: '#4A82F7' },
  { id: 'engagement',  name: 'Вовлечение',                  color: '#12B76A' },
  { id: 'cx',          name: 'Клиентский опыт',             color: '#F79009' },
  { id: 'unit_econ',   name: 'Юнит-экономика',              color: '#9E77ED' },
  { id: 'reliability', name: 'Надёжность и риски',          color: '#F04438' },
  { id: 'team',        name: 'Командная эффективность',     color: '#0BA5EC' },
];

// ── История охватывает два квартала ──────────────────────────────────────────
// Q1 2026: 1 января – 31 марта  → индексы   0–89
// Q2 2026: 1 апреля – 25 июня   → индексы  90–175
// Инцидент (деградация антифрод-модели): день 100 = 11 апреля
// TOTAL_DAYS = 176 (индексы 0–175)
const TOTAL_DAYS = 176;

function dateFromIdx(idx: number): string {
  const d = new Date('2026-01-01');
  d.setDate(d.getDate() + idx);
  return d.toISOString().slice(0, 10);
}

/**
 * Строит ежедневную историю линейной интерполяцией между контрольными точками.
 * cps: массив [dayIndex, value]. noiseAmp добавляет детерминированный sin-шум.
 */
function mkHistory(
  cps: Array<[number, number]>,
  noiseAmp: number,
  precision = 0,
): MetricPoint[] {
  const sorted = [...cps].sort((a, b) => a[0] - b[0]);
  const mult = 10 ** precision;
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    let lo = sorted[0]!;
    let hi = sorted[sorted.length - 1]!;
    for (let k = 0; k < sorted.length - 1; k++) {
      if (sorted[k]![0] <= i && sorted[k + 1]![0] >= i) {
        lo = sorted[k]!;
        hi = sorted[k + 1]!;
        break;
      }
    }
    const t = hi[0] === lo[0] ? 0 : (i - lo[0]) / (hi[0] - lo[0]);
    const base = lo[1] + (hi[1] - lo[1]) * t;
    const n = Math.sin(i * 0.37 + lo[0] * 0.13) * noiseAmp;
    return { date: dateFromIdx(i), value: Math.max(0, Math.round((base + n) * mult) / mult) };
  });
}

export const metricDefinitions: MetricDefinition[] = [

  // ── 1. Бизнес и портфель ─────────────────────────────────────────────────
  {
    id: 'active_cards',
    name: 'Активные карты',
    description: 'Карты, по которым была хотя бы одна операция за последние 30 дней',
    groupId: 'business', unit: 'шт.', lowerIsBetter: false,
    currentValue: 483_240, planValue: 500_000, lastPeriodValue: 462_000,
    format: 'number', owner: 'Команда продукта', updatedAt: '2026-06-25', onDashboard: true,
    history: mkHistory([[0, 441_000], [89, 462_000], [175, 483_240]], 3_000),
  },
  {
    id: 'new_issuance',
    name: 'Новые выдачи в месяц',
    description: 'Органический прирост: отделения, партнёры, цифровые каналы, зарплатные проекты',
    groupId: 'business', unit: 'шт.', lowerIsBetter: false,
    currentValue: 16_800, planValue: 22_000, lastPeriodValue: 17_200,
    format: 'number', owner: 'Команда продукта', updatedAt: '2026-06-25', onDashboard: true,
    history: mkHistory([[0, 14_200], [89, 17_200], [120, 18_400], [150, 17_500], [175, 16_800]], 500),
  },
  {
    id: 'portfolio_balance',
    name: 'Баланс портфеля',
    description: 'Среднемесячные остатки на счетах держателей дебетовых карт, млн ₽',
    groupId: 'business', unit: 'млн ₽', lowerIsBetter: false,
    currentValue: 2_840, planValue: 3_100, lastPeriodValue: 2_640,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-24', onDashboard: false,
    history: mkHistory([[0, 2_400], [89, 2_640], [175, 2_840]], 60),
  },
  {
    id: 'product_revenue',
    name: 'Доход от продукта (квартал)',
    description: 'Комиссионный + процентный доход от размещения остатков, млн ₽',
    groupId: 'business', unit: 'млн ₽', lowerIsBetter: false,
    currentValue: 412, planValue: 480, lastPeriodValue: 358,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-20', onDashboard: true,
    history: mkHistory([[0, 300], [89, 358], [175, 412]], 12),
  },
  {
    id: 'cac',
    name: 'CAC (стоимость привлечения)',
    description: 'Средняя стоимость привлечения одного клиента дебетовой карты, ₽',
    groupId: 'business', unit: '₽', lowerIsBetter: true,
    currentValue: 1_850, planValue: 1_600, lastPeriodValue: 2_050,
    format: 'currency', owner: 'Команда маркетинга', updatedAt: '2026-06-22', onDashboard: false,
    history: mkHistory([[0, 2_200], [89, 2_050], [175, 1_850]], 60),
  },
  {
    id: 'ltv',
    name: 'LTV клиента (бизнес)',
    description: 'Пожизненная ценность клиента по всему портфелю продуктов: дебетовая карта + кредиты + вклады + кросс-продажи. Шире, чем unit-экономика одной карты.',
    groupId: 'business', unit: '₽', lowerIsBetter: false,
    currentValue: 24_500, planValue: 27_000, lastPeriodValue: 22_800,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-20', onDashboard: false,
    history: mkHistory([[0, 21_000], [89, 22_800], [175, 24_500]], 400),
  },

  // ── 2. Вовлечение ────────────────────────────────────────────────────────
  {
    id: 'mau',
    name: 'MAU дебетовой карты',
    description: 'Активные пользователи в месяц — совершившие хотя бы одну операцию',
    groupId: 'engagement', unit: 'чел.', lowerIsBetter: false,
    currentValue: 312_000, planValue: 340_000, lastPeriodValue: 293_000,
    format: 'number', owner: 'Команда продукта', updatedAt: '2026-06-25', onDashboard: true,
    history: mkHistory([[0, 278_000], [89, 293_000], [175, 312_000]], 4_000),
  },
  {
    id: 'dau',
    name: 'DAU дебетовой карты',
    description: 'Активные пользователи в день',
    groupId: 'engagement', unit: 'чел.', lowerIsBetter: false,
    currentValue: 89_400, planValue: 95_000, lastPeriodValue: 84_000,
    format: 'number', owner: 'Команда продукта', updatedAt: '2026-06-25', onDashboard: true,
    history: mkHistory([[0, 79_000], [89, 84_000], [175, 89_400]], 2_000),
  },
  {
    id: 'tx_frequency',
    name: 'Частота транзакций на карту',
    description: 'Среднее количество операций на одну активную карту в месяц',
    groupId: 'engagement', unit: 'опер.', lowerIsBetter: false,
    currentValue: 14.2, planValue: 16.0, lastPeriodValue: 13.1,
    format: 'number', owner: 'Команда аналитики', updatedAt: '2026-06-24', onDashboard: false,
    history: mkHistory([[0, 12.2], [89, 13.1], [175, 14.2]], 0.4, 1),
  },
  {
    id: 'avg_ticket',
    name: 'Средний чек покупки',
    description: 'Средняя сумма одной покупки по дебетовым картам, ₽',
    groupId: 'engagement', unit: '₽', lowerIsBetter: false,
    currentValue: 3_240, planValue: 3_500, lastPeriodValue: 3_080,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-24', onDashboard: false,
    history: mkHistory([[0, 2_950], [89, 3_080], [175, 3_240]], 60),
  },
  {
    id: 'cashback_adoption',
    name: 'Доля с кэшбэком / лояльностью',
    description: 'Клиенты, подключившие кэшбэк или программу лояльности, от всех активных',
    groupId: 'engagement', unit: '%', lowerIsBetter: false,
    currentValue: 67.3, planValue: 72.0, lastPeriodValue: 65.2,
    format: 'percent', owner: 'Команда продукта', updatedAt: '2026-06-23', onDashboard: false,
    // Рост в Q1, плато в Q2 — клиенты менее охотно подключают лояльность
    history: mkHistory([[0, 62.0], [89, 65.2], [130, 67.5], [175, 67.3]], 0.6, 1),
  },

  // ── 3. Клиентский опыт (ПРОБЛЕМНАЯ ЗОНА) ────────────────────────────────
  {
    id: 'nps_general',
    name: 'NPS общий',
    description: 'Net Promoter Score по дебетовой карте: общий опрос держателей',
    groupId: 'cx', unit: '', lowerIsBetter: false,
    currentValue: 58, planValue: 72, lastPeriodValue: 72,
    format: 'number', owner: 'CX-команда', updatedAt: '2026-06-21', onDashboard: true,
    // Q1: достиг плана 72. Падение с ~15 мая (лаг 35 дней от инцидента)
    history: mkHistory([[0, 66], [89, 72], [120, 72], [140, 65], [162, 60], [175, 58]], 2),
  },
  {
    id: 'nps_tx',
    name: 'NPS транзакционный',
    description: 'NPS после ключевых сценариев: выпуск виртуальной карты, блокировка, спорная операция',
    groupId: 'cx', unit: '', lowerIsBetter: false,
    currentValue: 67, planValue: 78, lastPeriodValue: 76,
    format: 'number', owner: 'CX-команда', updatedAt: '2026-06-21', onDashboard: false,
    history: mkHistory([[0, 70], [89, 76], [120, 76], [140, 71], [162, 68], [175, 67]], 2),
  },
  {
    id: 'support_contacts',
    name: 'Обращения на 1 000 карт',
    description: 'Количество контактов в поддержку: блокировки, мошенничество, кэшбэк, неуспешные платежи',
    groupId: 'cx', unit: '', lowerIsBetter: true,
    currentValue: 31.2, planValue: 18.0, lastPeriodValue: 21.0,
    format: 'per_1000', owner: 'CX-команда', updatedAt: '2026-06-24', onDashboard: false,
    // Резкий скачок сразу после инцидента: отклонённые платежи → звонки в поддержку
    history: mkHistory([[0, 27.0], [89, 21.0], [100, 21.0], [108, 34.5], [130, 33.0], [175, 31.2]], 1.0, 1),
  },
  {
    id: 'ttr',
    name: 'TTR — время решения проблемы',
    description: 'Среднее время от обращения до закрытия инцидента по картам (спорные транзакции, перевыпуск)',
    groupId: 'cx', unit: 'ч.', lowerIsBetter: true,
    currentValue: 6.8, planValue: 2.5, lastPeriodValue: 3.8,
    format: 'duration_h', owner: 'CX-команда', updatedAt: '2026-06-23', onDashboard: false,
    // Поддержка перегружена резко выросшим объёмом обращений
    history: mkHistory([[0, 5.8], [89, 3.8], [100, 3.8], [108, 7.6], [130, 7.2], [175, 6.8]], 0.3, 1),
  },
  {
    id: 'churn_rate',
    name: 'Churn Rate (отток)',
    description: 'Клиенты, закрывшие карту или не совершавшие операций более 90 дней',
    groupId: 'cx', unit: '%', lowerIsBetter: true,
    currentValue: 3.8, planValue: 2.0, lastPeriodValue: 2.4,
    format: 'percent', owner: 'Команда удержания', updatedAt: '2026-06-22', onDashboard: true,
    // Лаг ~15 дней от инцидента: потеря доверия → закрытие карт
    history: mkHistory([[0, 3.2], [89, 2.4], [105, 2.4], [120, 3.0], [148, 3.6], [175, 3.8]], 0.12, 1),
  },

  // ── 4. Юнит-экономика (ДАВЛЕНИЕ) ────────────────────────────────────────
  {
    id: 'revenue_per_card',
    name: 'Выручка на карту в месяц',
    description: 'Комиссионный + процентный доход в расчёте на одну активную карту',
    groupId: 'unit_econ', unit: '₽', lowerIsBetter: false,
    currentValue: 340, planValue: 380, lastPeriodValue: 312,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-24', onDashboard: false,
    history: mkHistory([[0, 285], [89, 312], [175, 340]], 10),
  },
  {
    id: 'cost_per_card',
    name: 'Затраты на обслуживание карты',
    description: 'Выпуск + поддержка + процессинг + бонусные программы, на одну карту в месяц, ₽',
    groupId: 'unit_econ', unit: '₽', lowerIsBetter: true,
    currentValue: 222, planValue: 160, lastPeriodValue: 195,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-22', onDashboard: false,
    // Q1: снижались. Q2: рост из-за перегрузки поддержки и cashback-компенсаций
    history: mkHistory([[0, 212], [89, 195], [100, 195], [118, 210], [150, 218], [175, 222]], 6),
  },
  {
    id: 'profit_per_card',
    name: 'Прибыль на карту',
    description: 'Выручка минус затраты на одну активную карту в месяц, ₽',
    groupId: 'unit_econ', unit: '₽', lowerIsBetter: false,
    currentValue: 118, planValue: 220, lastPeriodValue: 148,
    format: 'currency', owner: 'Команда аналитики', updatedAt: '2026-06-24', onDashboard: false,
    // Q1: росла. Q2: падает — выручка не успевает за ростом затрат
    history: mkHistory([[0, 88], [89, 148], [110, 148], [132, 128], [160, 121], [175, 118]], 8),
  },
  {
    id: 'cohort_retention_12m',
    name: 'Когортное удержание 12M',
    description: 'Доля карт из выпуска 12 месяцев назад, остающихся активными сегодня',
    groupId: 'unit_econ', unit: '%', lowerIsBetter: false,
    currentValue: 68.5, planValue: 75.0, lastPeriodValue: 70.2,
    format: 'percent', owner: 'Команда аналитики', updatedAt: '2026-06-20', onDashboard: false,
    // Незначительное снижение в Q2 — эффект оттока начинает проявляться
    history: mkHistory([[0, 67.5], [89, 70.2], [130, 70.0], [175, 68.5]], 0.5, 1),
  },
  {
    id: 'cashback_cost',
    name: 'Cashback Cost',
    description: 'Стоимость программы лояльности как процент от объёма покупок; контролируем рост',
    groupId: 'unit_econ', unit: '%', lowerIsBetter: true,
    currentValue: 1.45, planValue: 1.10, lastPeriodValue: 1.09,
    format: 'percent', owner: 'Команда продукта', updatedAt: '2026-06-23', onDashboard: false,
    // Q1: у плана. Q2: постепенный рост — компенсации за отклонённые платежи
    history: mkHistory([[0, 1.08], [89, 1.09], [100, 1.12], [130, 1.28], [155, 1.40], [175, 1.45]], 0.03, 2),
  },

  // ── 5. Надёжность и риски (КОРЕНЬ ПРОБЛЕМЫ) ─────────────────────────────
  {
    id: 'uptime',
    name: 'Uptime процессинга',
    description: 'Доступность платёжного процессинга — своевременная авторизация. Цель: 99,99%',
    groupId: 'reliability', unit: '%', lowerIsBetter: false,
    currentValue: 99.97, planValue: 99.99, lastPeriodValue: 99.95,
    format: 'percent', owner: 'Команда надёжности', updatedAt: '2026-06-25', onDashboard: true,
    history: mkHistory([[0, 99.92], [89, 99.95], [175, 99.97]], 0.02, 2),
  },
  {
    id: 'auth_success_rate',
    name: 'Authorization Success Rate',
    description: '% одобренных транзакций от общего числа попыток (исключая мошеннические отказы)',
    groupId: 'reliability', unit: '%', lowerIsBetter: false,
    currentValue: 96.8, planValue: 99.0, lastPeriodValue: 98.5,
    format: 'percent', owner: 'Команда надёжности', updatedAt: '2026-06-25', onDashboard: true,
    // Прямое следствие: false positive rate ↑ → auth success rate ↓
    history: mkHistory([[0, 97.4], [89, 98.5], [100, 98.5], [108, 96.0], [130, 96.4], [175, 96.8]], 0.2, 1),
  },
  {
    id: 'auth_latency_p95',
    name: 'Latency авторизации p95',
    description: 'Время ответа на авторизацию, 95-й перцентиль — критично для офлайн-покупок',
    groupId: 'reliability', unit: 'мс', lowerIsBetter: true,
    currentValue: 180, planValue: 150, lastPeriodValue: 198,
    format: 'duration_ms', owner: 'Команда надёжности', updatedAt: '2026-06-25', onDashboard: false,
    // Небольшой откат в Q2: повторные попытки авторизации увеличивают нагрузку
    history: mkHistory([[0, 215], [89, 198], [100, 194], [108, 210], [130, 196], [175, 180]], 8),
  },
  {
    id: 'mttd',
    name: 'MTTD — время обнаружения инцидента',
    description: 'Среднее время от начала инцидента до его обнаружения командой',
    groupId: 'reliability', unit: 'мин.', lowerIsBetter: true,
    currentValue: 12, planValue: 8, lastPeriodValue: 16,
    format: 'duration_h', owner: 'Команда надёжности', updatedAt: '2026-06-23', onDashboard: false,
    history: mkHistory([[0, 20], [89, 16], [175, 12]], 2),
  },
  {
    id: 'mttr',
    name: 'MTTR — время восстановления',
    description: 'Среднее время от обнаружения инцидента до полного восстановления',
    groupId: 'reliability', unit: 'мин.', lowerIsBetter: true,
    currentValue: 47, planValue: 30, lastPeriodValue: 62,
    format: 'duration_h', owner: 'Команда надёжности', updatedAt: '2026-06-23', onDashboard: false,
    history: mkHistory([[0, 72], [89, 62], [175, 47]], 5),
  },
  {
    id: 'fraud_rate',
    name: 'Fraud Rate',
    description: 'Уровень мошенничества: % от объёма транзакций; отслеживается по типам (CNP, скимминг, соц. инженерия)',
    groupId: 'reliability', unit: '%', lowerIsBetter: true,
    currentValue: 0.034, planValue: 0.030, lastPeriodValue: 0.038,
    format: 'rate', owner: 'Команда безопасности', updatedAt: '2026-06-24', onDashboard: true,
    history: mkHistory([[0, 0.044], [89, 0.038], [175, 0.034]], 0.003, 3),
  },
  {
    id: 'false_positive_rate',
    name: 'False Positive Rate антифрода',
    description: 'Легитимные операции, ошибочно отклонённые антифрод-системой; высокий уровень — отток клиентов',
    groupId: 'reliability', unit: '%', lowerIsBetter: true,
    currentValue: 1.35, planValue: 0.60, lastPeriodValue: 0.65,
    format: 'percent', owner: 'Команда безопасности', updatedAt: '2026-06-24', onDashboard: false,
    // КОРЕНЬ ПРОБЛЕМЫ: обновление модели 11 апреля → резкий скачок → частичная стабилизация
    history: mkHistory([[0, 0.92], [89, 0.65], [100, 0.65], [104, 1.82], [115, 1.68], [145, 1.48], [175, 1.35]], 0.04, 2),
  },
  {
    id: 'chargeback_rate',
    name: 'Chargeback Rate',
    description: 'Доля спорных операций — критично для соблюдения правил платёжных систем Visa/MC',
    groupId: 'reliability', unit: '%', lowerIsBetter: true,
    currentValue: 0.14, planValue: 0.10, lastPeriodValue: 0.12,
    format: 'rate', owner: 'Команда безопасности', updatedAt: '2026-06-23', onDashboard: false,
    // Небольшой рост: часть отклонённых легитимных операций оспаривается
    history: mkHistory([[0, 0.155], [89, 0.12], [100, 0.12], [115, 0.148], [175, 0.14]], 0.006, 3),
  },

  // ── 6. Командная эффективность ───────────────────────────────────────────
  {
    id: 'velocity',
    name: 'Velocity (SP/спринт)',
    description: 'Стори-поинты, завершённые за спринт. Стабильный рост без ущерба качеству',
    groupId: 'team', unit: 'SP', lowerIsBetter: false,
    currentValue: 68, planValue: 72, lastPeriodValue: 62,
    format: 'number', owner: 'Команда разработки', updatedAt: '2026-06-24', onDashboard: false,
    // Ступенчатые значения по 14-дневным спринтам
    history: Array.from({ length: TOTAL_DAYS }, (_, i) => {
      const sprint = Math.floor(i / 14);
      const val = Math.round(56 + sprint * 1.1 + Math.sin(sprint * 0.9) * 3);
      return { date: dateFromIdx(i), value: Math.max(50, val) };
    }),
  },
  {
    id: 'lead_time',
    name: 'Lead Time',
    description: 'Время от появления идеи до деплоя в продакшн. Стремимся сокращать time-to-market',
    groupId: 'team', unit: 'дн.', lowerIsBetter: true,
    currentValue: 9.3, planValue: 7.0, lastPeriodValue: 11.2,
    format: 'duration_d', owner: 'Команда разработки', updatedAt: '2026-06-24', onDashboard: false,
    history: mkHistory([[0, 12.5], [89, 11.2], [175, 9.3]], 0.6, 1),
  },
  {
    id: 'cycle_time',
    name: 'Cycle Time',
    description: 'Время от начала разработки до деплоя (от "In Progress" до "Done")',
    groupId: 'team', unit: 'дн.', lowerIsBetter: true,
    currentValue: 2.1, planValue: 1.5, lastPeriodValue: 2.7,
    format: 'duration_d', owner: 'Команда разработки', updatedAt: '2026-06-24', onDashboard: false,
    history: mkHistory([[0, 3.0], [89, 2.7], [175, 2.1]], 0.2, 1),
  },
  {
    id: 'deploy_frequency',
    name: 'Deploy Frequency',
    description: 'Количество деплоев в неделю. Баланс стабильности и частоты итераций',
    groupId: 'team', unit: 'деп./нед.', lowerIsBetter: false,
    currentValue: 2.3, planValue: 3.0, lastPeriodValue: 1.9,
    format: 'number', owner: 'Команда разработки', updatedAt: '2026-06-23', onDashboard: false,
    history: mkHistory([[0, 1.6], [89, 1.9], [175, 2.3]], 0.2, 1),
  },
  {
    id: 'defect_rate',
    name: 'Defect Rate',
    description: 'Доля критических и мажорных багов, попавших в продакшн, от общего числа релизов',
    groupId: 'team', unit: '%', lowerIsBetter: true,
    currentValue: 1.8, planValue: 1.0, lastPeriodValue: 2.3,
    format: 'percent', owner: 'Команда QA', updatedAt: '2026-06-23', onDashboard: false,
    history: mkHistory([[0, 2.8], [89, 2.3], [175, 1.8]], 0.2, 1),
  },
  {
    id: 'backlog_ratio',
    name: 'Соотношение бэклога (фичи/баги/долг)',
    description: 'Доля фич, багов и технического долга в активном бэклоге. Цель: 60 / 25 / 15',
    groupId: 'team', unit: '%', lowerIsBetter: false,
    currentValue: 60, planValue: 60, lastPeriodValue: 54,
    format: 'percent', owner: 'Команда продукта', updatedAt: '2026-06-21', onDashboard: false,
    history: mkHistory([[0, 50], [89, 54], [175, 60]], 2),
  },
];
