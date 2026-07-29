import type {
  ClusterKpi,
  ClusterKpiGroup,
  ClusterKpiStatus,
  ClusterMonth,
  ClusterProductRow,
  ClusterStream,
  MyClusterData,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// «Мой кластер» — сводка кластера «Дэйли Бэнкинг».
// ВСЕ значения — вымышленные (как и остальные метрики в кабинете продакта).
// ─────────────────────────────────────────────────────────────────────────────

const streams: ClusterStream[] = [
  { id: 'stream-debit', name: 'Дебетовые карты' },
  { id: 'stream-pay', name: 'Платежи и переводы' },
  { id: 'stream-proc', name: 'Платёжные технологии и процессинг' },
];

// ── Фильтр «Месяц» и KPI по периодам ─────────────────────────────────────────
// Данные текущего года по июнь 2026. Квартальные метрики (финансы, производство)
// показывают квартал выбранного месяца, прошлый период — предыдущий квартал
// (для Q1 — Q4’25); месячные (клиентские) — сам месяц против предыдущего.
// Подписи периода включаются в label («ФинРез Q2», «Активные клиенты, июнь»).
//
// Согласованность синтетики (числа НЕ производные от какого-либо реального
// источника, но арифметика внутри честная):
// - «% выполнения» в таблице = факт / бюджет × 100 (считается точно);
// - строка «Всего» = суммы значений строк таблицы;
// - клиентские KPI за июнь = итоги соответствующих колонок таблицы (она на 2026-06).

const MONTH_IDS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'];
const months: ClusterMonth[] = MONTH_IDS.map((id, i) => ({ id, name: MONTH_NAMES[i]! }));

const fmt = (n: number, dec: number): string =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace('-', '−');

/** Статус по направлению изменения: у каждой метрики своя «хорошая» сторона. */
type StatusRule = { up: ClusterKpiStatus; down: ClusterKpiStatus };

interface QuarterlyDef {
  id: string;
  label: string;
  suffix: string;
  dec: number;
  /** Значения по кварталам: Q4’25 (только как прошлый период), Q1, Q2. */
  q4: number;
  q1: number;
  q2: number;
  /** % выполнения плана по кварталам (стрелочный процент, как в дашборде). */
  pct?: { q1: string; q2: string };
  rule: StatusRule;
}

const QUARTERLY_FINANCIAL: QuarterlyDef[] = [
  { id: 'fin', label: 'ФинРез', suffix: ' млн', dec: 1, q4: -242.6, q1: -298.7, q2: -387.2, pct: { q1: '82,9%', q2: '76,4%' }, rule: { up: 'good', down: 'bad' } },
  { id: 'cti', label: 'CTI',    suffix: '%',    dec: 1, q4: 149.2,  q1: 164.8,  q2: 187.4,  pct: { q1: '103,4%', q2: '108,9%' }, rule: { up: 'good', down: 'warn' } },
];

const QUARTERLY_PRODUCTION: QuarterlyDef[] = [
  { id: 'lt',   label: 'Lead Time',            suffix: ' дн.', dec: 1, q4: 41.2, q1: 44.9, q2: 52.6, rule: { up: 'bad',  down: 'good' } },
  { id: 'df',   label: 'Релизы (DF)',          suffix: '',     dec: 0, q4: 198,  q1: 226,  q2: 312,  rule: { up: 'good', down: 'warn' } },
  { id: 'cfr',  label: 'Сбойные релизы (CFR)', suffix: '%',    dec: 1, q4: 9.4,  q1: 7.8,  q2: 4.6,  rule: { up: 'bad',  down: 'good' } },
  { id: 'mttr', label: 'MTTR',                 suffix: ' ч.',  dec: 2, q4: 1.87, q1: 2.08, q2: 2.34, rule: { up: 'warn', down: 'good' } },
];

interface MonthlyDef {
  id: string;
  label: string;
  suffix: string;
  dec: number;
  /** Значения помесячно: дек’25 (только как прошлый период) + янв…июн. */
  values: [number, number, number, number, number, number, number];
  rule: StatusRule;
}

const MONTHLY_CLIENT: MonthlyDef[] = [
  { id: 'active',   label: 'Активные клиенты', suffix: ' млн',  dec: 2, values: [1.94, 1.98, 2.03, 2.07, 2.09, 2.11, 2.23], rule: { up: 'good', down: 'warn' } },
  { id: 'inflow',   label: 'Приток',           suffix: ' тыс.', dec: 1, values: [231.4, 238.9, 244.7, 252.1, 259.8, 268.3, 292.5], rule: { up: 'good', down: 'warn' } },
  { id: 'reactive', label: 'Реактивация',      suffix: ' тыс.', dec: 1, values: [141.2, 138.4, 129.7, 142.3, 148.9, 135.6, 120.1], rule: { up: 'good', down: 'warn' } },
  { id: 'churn',    label: 'Отток',            suffix: ' тыс.', dec: 1, values: [262.3, 270.8, 265.4, 271.9, 268.2, 279.4, 293.8], rule: { up: 'bad',  down: 'good' } },
];

function quarterlyKpi(def: QuarterlyDef, quarter: 'q1' | 'q2'): ClusterKpi {
  const value = quarter === 'q1' ? def.q1 : def.q2;
  const prev = quarter === 'q1' ? def.q4 : def.q1;
  const trend = value >= prev ? 'up' : 'down';
  return {
    id: def.id,
    label: `${def.label} ${quarter === 'q1' ? 'Q1' : 'Q2'}`,
    value: `${fmt(value, def.dec)}${def.suffix}`,
    status: def.rule[trend],
    trend,
    ...(def.pct ? { pct: def.pct[quarter] } : {}),
    prevValue: `${fmt(prev, def.dec)}${def.suffix}`,
    prevLabel: quarter === 'q1' ? 'Q4’25' : 'Q1',
  };
}

function monthlyKpi(def: MonthlyDef, monthIdx: number): ClusterKpi {
  const value = def.values[monthIdx + 1]!;
  const prev = def.values[monthIdx]!;
  const trend = value >= prev ? 'up' : 'down';
  return {
    id: def.id,
    label: `${def.label}, ${MONTH_NAMES[monthIdx]!.toLowerCase()}`,
    value: `${fmt(value, def.dec)}${def.suffix}`,
    status: def.rule[trend],
    trend,
    prevValue: `${fmt(prev, def.dec)}${def.suffix}`,
    prevLabel: monthIdx === 0 ? 'Дек’25' : MONTH_NAMES[monthIdx - 1]!,
  };
}

const groupsByMonth: Record<string, ClusterKpiGroup[]> = Object.fromEntries(
  MONTH_IDS.map((id, monthIdx) => {
    const quarter: 'q1' | 'q2' = monthIdx < 3 ? 'q1' : 'q2';
    const groups: ClusterKpiGroup[] = [
      { id: 'financial',  title: 'Финансовые метрики',        kpis: QUARTERLY_FINANCIAL.map((d) => quarterlyKpi(d, quarter)) },
      { id: 'client',     title: 'Клиентские метрики',        kpis: MONTHLY_CLIENT.map((d) => monthlyKpi(d, monthIdx)) },
      { id: 'production', title: 'Производственные метрики',  kpis: QUARTERLY_PRODUCTION.map((d) => quarterlyKpi(d, quarter)) },
    ];
    return [id, groups];
  }),
);

// Все «% выполнения» = факт / бюджет × 100 (посчитаны точно);
// строка «Всего» = суммы соответствующих колонок (кроме относительных метрик).
const products: ClusterProductRow[] = [
  {
    id: 'p-debit-bank',
    product: 'Дебетовые карты МТС Банк',
    code: 'BI_141',
    streamId: 'stream-debit',
    finFact: -862_340_500,
    finBudget: -1_154_200_000,
    finFulfil: 74.7,
    ctiFact: 198.6,
    ctiBudget: 172.4,
    ctiFulfil: 115.2,
    active: 815_240,
    inflow: 34_620,
    reactive: 21_480,
    churn: 64_350,
    crPct: null,
    abs: 71,
    secDebt1H: 91.2,
    secDebt2H: 78.6,
    leadTime: 47.3,
    df: 9,
    cfr: 18.2,
    mttr: 'На листе',
  },
  {
    id: 'p-debit-money',
    product: 'Дебетовые карты МТС Деньги',
    code: 'BI_3459',
    streamId: 'stream-debit',
    finFact: -356_780_200,
    finBudget: null,
    finFulfil: null,
    ctiFact: null,
    ctiBudget: null,
    ctiFulfil: null,
    active: 1_322_560,
    inflow: 248_930,
    reactive: 96_410,
    churn: 217_640,
    crPct: null,
    abs: 18,
    secDebt1H: 91.2,
    secDebt2H: 78.6,
    leadTime: 41.8,
    df: 27,
    cfr: 3.4,
    mttr: 'На листе',
  },
  {
    id: 'p-loyalty',
    product: 'Лояльность МТС Деньги',
    code: 'BI_3645',
    streamId: 'stream-debit',
    finFact: null,
    finBudget: null,
    finFulfil: null,
    ctiFact: null,
    ctiBudget: null,
    ctiFulfil: null,
    active: null,
    inflow: null,
    reactive: null,
    churn: null,
    crPct: null,
    abs: 39,
    secDebt1H: null,
    secDebt2H: null,
    leadTime: 58.7,
    df: 11,
    cfr: 6.8,
    mttr: 'На листе',
  },
  {
    id: 'p-mts-pay',
    product: 'МТС Pay (app)',
    code: 'BI_2569',
    streamId: 'stream-proc',
    finFact: -28_640_700,
    finBudget: -52_300_000,
    finFulfil: 54.8,
    ctiFact: 842.7,
    ctiBudget: null,
    ctiFulfil: null,
    active: null,
    inflow: null,
    reactive: null,
    churn: null,
    crPct: null,
    abs: null,
    secDebt1H: 91.2,
    secDebt2H: 78.6,
    leadTime: 55.4,
    df: 12,
    cfr: 8.3,
    mttr: 'На листе',
  },
  {
    id: 'p-savings',
    product: 'Накопительный счёт',
    code: 'BI_3010',
    streamId: 'stream-debit',
    finFact: 158_420_300,
    finBudget: 197_500_000,
    finFulfil: 80.2,
    ctiFact: null,
    ctiBudget: null,
    ctiFulfil: null,
    active: 96_780,
    inflow: 8_940,
    reactive: 2_210,
    churn: 11_830,
    crPct: null,
    abs: 5,
    secDebt1H: 91.2,
    secDebt2H: 78.6,
    leadTime: 44.1,
    df: 6,
    cfr: 12.5,
    mttr: 'На листе',
  },
  {
    id: 'p-transfers',
    product: 'Переводы',
    code: 'BI_2185',
    streamId: 'stream-pay',
    finFact: 448_260_900,
    finBudget: 512_800_000,
    finFulfil: 87.4,
    ctiFact: 42.8,
    ctiBudget: 38.1,
    ctiFulfil: 112.3,
    active: null,
    inflow: null,
    reactive: null,
    churn: null,
    crPct: null,
    abs: 12,
    secDebt1H: 98.7,
    secDebt2H: 91.5,
    leadTime: 28.4,
    df: 54,
    cfr: 0.0,
    mttr: 'На листе',
  },
  {
    id: 'p-payments',
    product: 'Платежи',
    code: 'BI_2186',
    streamId: 'stream-pay',
    finFact: null,
    finBudget: null,
    finFulfil: null,
    ctiFact: null,
    ctiBudget: null,
    ctiFulfil: null,
    active: null,
    inflow: null,
    reactive: null,
    churn: null,
    crPct: null,
    abs: 3,
    secDebt1H: null,
    secDebt2H: null,
    leadTime: 28.4,
    df: 36,
    cfr: 0.0,
    mttr: 'На листе',
  },
  {
    id: 'p-sbp',
    product: 'СБП',
    code: 'BI_156',
    streamId: 'stream-pay',
    finFact: -214_380_600,
    finBudget: -187_400_000,
    finFulfil: 114.4,
    ctiFact: -18.3,
    ctiBudget: -15.6,
    ctiFulfil: 117.3,
    active: null,
    inflow: null,
    reactive: null,
    churn: null,
    crPct: null,
    abs: 7,
    secDebt1H: 91.2,
    secDebt2H: 78.6,
    leadTime: 39.6,
    df: 8,
    cfr: 2.1,
    mttr: 'На листе',
  },
  {
    // Суммы строк выше: финансы/клиенты/ABS/DF — арифметические суммы,
    // относительные (вып.%, sec debt, LT, CFR) — агрегаты уровня кластера.
    id: 'p-total',
    product: 'Всего по кластеру',
    code: '—',
    streamId: 'all',
    finFact: -855_460_800,
    finBudget: -683_600_000,
    finFulfil: 125.1,
    ctiFact: 174.6,
    ctiBudget: 160.3,
    ctiFulfil: 108.9,
    active: 2_234_580,
    inflow: 292_490,
    reactive: 120_100,
    churn: 293_820,
    crPct: null,
    abs: 155,
    secDebt1H: 93.4,
    secDebt2H: 82.7,
    leadTime: 52.6,
    df: 163,
    cfr: 3.1,
    mttr: 'На листе',
    isTotal: true,
  },
];

export const myClusterData: MyClusterData = {
  clusterName: 'Дэйли Бэнкинг',
  streams,
  months,
  groupsByMonth,
  products,
};
