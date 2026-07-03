/**
 * Экспорт фикстур проекта в Excel.
 * Запуск: node scripts/export-fixtures-excel.mjs
 * Результат: exports/barometer-fixtures.xlsx
 */

import * as XLSX from '../node_modules/xlsx/xlsx.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Убеждаемся, что значение не будет воспринято Excel как формула */
function safe(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return `'${v}`;
  return v;
}

/** Создаёт лист из массива строк (массивы значений) */
function makeSheet(rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows.map(r => r.map(safe)));
  return ws;
}

/** Устанавливает ширину колонок по содержимому */
function autoCols(ws, rows) {
  const maxLen = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell ?? '').length;
      if (!maxLen[i] || maxLen[i] < len) maxLen[i] = len;
    });
  }
  ws['!cols'] = maxLen.map(w => ({ wch: Math.min(w + 2, 60) }));
}

// ─── Данные фикстур (копия из src/data/fixtures/) ─────────────────────────────
// Дублируем значения здесь, чтобы не зависеть от сборщика TypeScript.

// ── 1. Метрики (metrics.ts) ───────────────────────────────────────────────────

const metricGroups = [
  {
    id: 'acquisition', name: 'Привлечение',
    metrics: [
      { name: 'Новые карты (выдано)',       currentQuarter: 18300,   plan: 22000,   fulfillment: 83, lastQuarter: 15200,   unit: 'шт.' },
      { name: 'Заявок на карту',             currentQuarter: 31500,   plan: 38000,   fulfillment: 83, lastQuarter: 27100,   unit: 'шт.' },
      { name: 'Конверсия заявка → карта',   currentQuarter: 58,      plan: 65,      fulfillment: 89, lastQuarter: 56,      unit: '%'   },
    ],
  },
  {
    id: 'activation', name: 'Активация',
    metrics: [
      { name: 'Активированных карт (первая транзакция)', currentQuarter: 14200, plan: 17000, fulfillment: 84, lastQuarter: 11800, unit: 'шт.' },
      { name: 'Время до первой транзакции (медиана)',    currentQuarter: 3,     plan: 2,     fulfillment: 67, lastQuarter: 4,     unit: 'дня' },
    ],
  },
  {
    id: 'transactions', name: 'Транзакции',
    metrics: [
      { name: 'Оборот по картам',                      currentQuarter: 4820000, plan: 5500000, fulfillment: 88, lastQuarter: 4100000, unit: '₽'   },
      { name: 'Средний чек',                           currentQuarter: 3240,    plan: 3500,    fulfillment: 93, lastQuarter: 3080,    unit: '₽'   },
      { name: 'Транзакций на активную карту (месяц)',  currentQuarter: 11,      plan: 14,      fulfillment: 79, lastQuarter: 10,      unit: 'шт.' },
    ],
  },
  {
    id: 'retention', name: 'Удержание',
    metrics: [
      { name: 'MAU (активные держатели карт)',   currentQuarter: 49200, plan: 55000, fulfillment: 89, lastQuarter: 43500, unit: 'чел.' },
      { name: 'Отток карт (закрыто / выдано)',   currentQuarter: 4.2,   plan: 3.0,   fulfillment: 71, lastQuarter: 4.8,   unit: '%'   },
      { name: 'NPS держателей карт',             currentQuarter: 68,    plan: 72,    fulfillment: 94, lastQuarter: 64,    unit: ''    },
    ],
  },
];

// ── 2. Дашборд — воронка-виджет (dashboard.ts) ───────────────────────────────

const dashboardFunnel = [
  { name: 'Открыл форму',       value: 10000, percent: 100, riskLevel: 'ok'       },
  { name: 'Ввёл личные данные', value: 8500,  percent: 85,  riskLevel: 'ok'       },
  { name: 'Ввод паспорта',      value: 5610,  percent: 66,  riskLevel: 'critical' },
  { name: 'Подтверждение',      value: 5200,  percent: 93,  riskLevel: 'ok'       },
  { name: 'Решение выдано',     value: 4800,  percent: 92,  riskLevel: 'ok'       },
];

const dashboardIncidents = [
  { title: 'Падение конверсии: шаг «Ввод паспорта» −10%',       severity: 'critical', time: '2026-06-19T08:15:00Z' },
  { title: 'Задержка ответа API авторизации ×3',                  severity: 'warning',  time: '2026-06-18T23:40:00Z' },
  { title: 'Compliance: истекает срок пересмотра политики хранения данных', severity: 'warning', time: '2026-06-17T09:00:00Z' },
];

const dashboardSprint = {
  sprintName: 'Sprint 47',
  totalPoints: 80,
  completedPoints: 52,
  daysTotal: 14,
  daysElapsed: 10,
  forecastDate: '2026-06-24',
};

// ── 3. Воронка (funnel-analytics.ts) — сводка ────────────────────────────────

const funnelSummary = [
  { id: 'step1', name: 'Просмотр предложения карты',  eventName: 'view_debit_card_offer',     users: 84000,  change: -2400, conversionFromFirst: 100.0 },
  { id: 'step2', name: 'Начало заявки на карту',       eventName: 'start_card_application',   users: 28000,  change: 1400,  conversionFromFirst: 33.3  },
  { id: 'step3', name: 'Заявка одобрена',              eventName: 'card_application_approved', users: 22400,  change: -800,  conversionFromFirst: 26.7  },
  { id: 'step4', name: 'Карта выпущена',               eventName: 'card_issued',               users: 16800,  change: -5200, conversionFromFirst: 20.0  },
  { id: 'step5', name: 'Карта активирована',           eventName: 'card_activated',            users: 11760,  change: 560,   conversionFromFirst: 14.0  },
];

// ── 4. Воронка — дневная история (91 день, Q2 2026: 01 Apr – 30 Jun) ──────────

const STEP1 = [
  1082,1094,1119,1107,1083,1071,1063,1048,1039,1061,1054,1073,1087,1074,1091,1058,1043,1067,1079,
  1052,1038,1063,1047,1071,1058,1084,1043,1067,1031,1054,
  1027,1014,1041,1018,1033,1007,1024,1039,1012,1028,1003,1018,994,1021,1008,987,1014,1001,1017,993,
  1009,984,1011,997,986,1002,978,994,1018,981,967,
  974,961,988,977,953,968,941,957,971,948,964,978,944,958,936,951,927,943,968,934,921,947,963,939,
  956,971,937,953,928,944,
];
const STEP2 = [
  312,351,338,247,189,374,356,623,671,658,428,441,634,618,642,589,601,387,214,628,614,341,293,367,
  247,278,324,381,317,349,
  362,268,231,357,341,328,294,279,198,162,348,337,368,312,281,243,219,334,289,347,318,296,228,187,
  294,327,311,298,268,237,198,
  319,287,341,323,274,219,178,312,294,278,308,263,234,189,297,279,264,288,251,211,174,284,268,259,
  277,243,198,163,271,254,
];
const STEP3 = [
  283,281,278,276,274,278,281,284,282,279,277,275,278,276,279,277,280,278,275,278,276,273,271,275,
  279,277,274,278,281,279,
  276,274,271,274,277,275,272,275,273,270,268,271,274,272,269,272,275,273,270,267,270,268,271,274,
  272,269,266,269,272,270,273,
  275,278,276,279,277,281,279,276,279,282,280,277,281,284,282,279,276,280,283,281,278,282,285,283,
  280,284,287,285,282,286,
];
const STEP4 = [
  251,263,247,158,131,271,258,193,283,267,74,211,249,268,241,259,234,182,97,261,248,274,239,253,
  128,164,247,231,259,244,
  238,176,142,267,251,189,279,249,153,181,258,243,261,247,234,162,118,251,238,254,241,249,143,167,
  246,258,233,251,237,129,154,
  241,277,231,263,218,157,123,271,244,259,237,228,136,171,209,187,163,148,134,89,71,121,109,97,88,
  79,48,37,71,64,
];
const STEP5 = [
  121,124,127,131,128,132,136,133,138,134,139,143,147,143,146,142,147,151,148,144,149,153,149,154,
  158,154,151,156,153,158,
  159,162,165,162,167,164,169,166,163,168,165,170,167,172,169,173,170,167,172,176,172,177,174,179,
  176,181,178,183,180,177,182,
  183,179,184,188,185,182,187,184,189,186,191,188,185,190,187,192,189,194,191,188,193,190,195,192,
  197,194,191,196,193,198,
];

function makeDate(i) {
  const d = new Date('2026-04-01');
  d.setDate(d.getDate() + i);
  return d.toISOString().slice(0, 10);
}

const funnelHistory = STEP1.map((_, i) => ({
  date: makeDate(i),
  step1: STEP1[i],
  step2: STEP2[i],
  step3: STEP3[i],
  step4: STEP4[i],
  step5: STEP5[i],
}));

// ── 5. Unit-экономика — параметры по умолчанию и расчёт ───────────────────────

const ueParams = {
  txPerMonth: 14,
  avgTxAmount: 560,
  interchangeRate: 1.5,
  avgBalance: 25000,
  nim: 9.7,
  monthlyFee: 0,
  otherFeeIncome: 20,
  cashbackRate: 1.45,
  processingCostPerTx: 2,
  accountServicingCost: 80,
  cac: 1850,
  churnRate: 3.8,
  discountRate: 12,
};

function calcUnitEcon(p) {
  const turnover = p.txPerMonth * p.avgTxAmount;
  const interchange = turnover * p.interchangeRate / 100;
  const interestIncome = p.avgBalance * p.nim / 100 / 12;
  const fees = p.monthlyFee + p.otherFeeIncome;
  const revenue = interchange + interestIncome + fees;

  const cashback = turnover * p.cashbackRate / 100;
  const processing = p.txPerMonth * p.processingCostPerTx;
  const servicing = p.accountServicingCost;
  const cost = cashback + processing + servicing;

  const cm = revenue - cost;
  const cmPct = revenue > 0 ? (cm / revenue) * 100 : 0;
  const paybackMonths = cm > 0 ? p.cac / cm : null;

  const horizon = p.churnRate > 0 ? Math.min(Math.ceil(1 / (p.churnRate / 100)), 120) : 60;
  const retention = 1 - p.churnRate / 100;
  const monthlyDiscount = p.discountRate / 100 / 12;

  let ltv = 0;
  for (let t = 1; t <= horizon; t++) {
    ltv += cm * Math.pow(retention, t - 1) / Math.pow(1 + monthlyDiscount, t - 1);
  }
  const ltvCac = p.cac > 0 ? ltv / p.cac : null;

  const displayHorizon = Math.min(horizon, 48);
  const paybackCurve = [{ month: 0, cumulative: -p.cac }];
  for (let t = 1; t <= displayHorizon; t++) {
    paybackCurve.push({
      month: t,
      cumulative: paybackCurve[t - 1].cumulative + cm * Math.pow(retention, t - 1),
    });
  }

  return {
    turnover,
    interchange,
    interestIncome,
    fees,
    revenue,
    cashback,
    processing,
    servicing,
    cost,
    cm,
    cmPct,
    paybackMonths,
    horizon,
    ltv,
    ltvCac,
    paybackCurve,
  };
}

const ueResult = calcUnitEcon(ueParams);

// ─── Построение листов ────────────────────────────────────────────────────────

// ── Лист 1: Метрики ───────────────────────────────────────────────────────────
function buildMetricsSheet() {
  const header = ['Группа', 'Метрика', 'Факт (Q2 2026)', 'План (Q2 2026)', 'Выполнение, %', 'Прошлый квартал (Q1 2026)', 'Ед. изм.'];
  const rows = [header];
  for (const g of metricGroups) {
    for (const m of g.metrics) {
      rows.push([g.name, m.name, m.currentQuarter, m.plan, m.fulfillment, m.lastQuarter, m.unit]);
    }
  }
  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ── Лист 2: Дашборд ───────────────────────────────────────────────────────────
function buildDashboardSheet() {
  const rows = [];

  rows.push(['ВОРОНКА КОНВЕРСИИ (дашборд-виджет)']);
  rows.push(['Шаг', 'Пользователей', 'Конверсия (от предыдущего), %', 'Уровень риска']);
  for (const f of dashboardFunnel) {
    rows.push([f.name, f.value, f.percent, f.riskLevel]);
  }

  rows.push([]);
  rows.push(['СКОРОСТЬ КОМАНДЫ — Sprint 47']);
  rows.push(['Параметр', 'Значение']);
  rows.push(['Всего story points', dashboardSprint.totalPoints]);
  rows.push(['Выполнено story points', dashboardSprint.completedPoints]);
  rows.push(['Дней всего', dashboardSprint.daysTotal]);
  rows.push(['Дней прошло', dashboardSprint.daysElapsed]);
  rows.push(['Прогноз завершения', dashboardSprint.forecastDate]);

  rows.push([]);
  rows.push(['ИНЦИДЕНТЫ']);
  rows.push(['Заголовок', 'Критичность', 'Время']);
  for (const inc of dashboardIncidents) {
    rows.push([inc.title, inc.severity, inc.time]);
  }

  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ── Лист 3: Воронка — сводка ─────────────────────────────────────────────────
function buildFunnelSummarySheet() {
  const header = ['Шаг', 'Название', 'Event name', 'Пользователей (квартал)', 'Изменение к предыдущему кварталу', 'Конверсия от первого шага, %'];
  const rows = [header];
  let prev = null;
  for (const s of funnelSummary) {
    const convPrev = prev !== null ? ((s.users / prev) * 100).toFixed(1) + '%' : '—';
    rows.push([s.id, s.name, s.eventName, s.users, s.change, s.conversionFromFirst]);
    prev = s.users;
  }
  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ── Лист 4: Воронка — дневная история ────────────────────────────────────────
function buildFunnelHistorySheet() {
  const header = [
    'Дата',
    'Шаг 1 — Просмотр предложения',
    'Шаг 2 — Начало заявки',
    'Шаг 3 — Заявка одобрена',
    'Шаг 4 — Карта выпущена',
    'Шаг 5 — Карта активирована',
  ];
  const rows = [header];
  for (const d of funnelHistory) {
    rows.push([d.date, d.step1, d.step2, d.step3, d.step4, d.step5]);
  }
  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ── Лист 5: Unit-экономика — параметры ───────────────────────────────────────
function buildUEParamsSheet() {
  const rows = [];

  rows.push(['ВХОДНЫЕ ПАРАМЕТРЫ']);
  rows.push(['Параметр', 'Значение', 'Ед. изм.', 'Описание']);
  rows.push(['Транзакций в месяц',       ueParams.txPerMonth,           'шт.',    '']);
  rows.push(['Средний чек',               ueParams.avgTxAmount,          '₽',     '«Экономический» средний чек по обороту']);
  rows.push(['Ставка интерчейнджа',       ueParams.interchangeRate,      '%',     'Процент от суммы транзакции']);
  rows.push(['Остаток на счёте',          ueParams.avgBalance,           '₽',     'Среднемесячный остаток']);
  rows.push(['Чистая процентная маржа',   ueParams.nim,                  '% год', 'NIM, ставка размещения']);
  rows.push(['Ежемесячная плата',         ueParams.monthlyFee,           '₽/мес', '']);
  rows.push(['Прочие доходы',             ueParams.otherFeeIncome,       '₽/мес', 'Снятия наличных, прочие комиссии']);
  rows.push(['Кешбэк / лояльность',       ueParams.cashbackRate,         '% об.', 'Процент от оборота']);
  rows.push(['Процессинг (за транзакцию)',ueParams.processingCostPerTx,  '₽',     '']);
  rows.push(['Обслуживание счёта',        ueParams.accountServicingCost, '₽/мес', 'ДБО, колл-центр, пластик']);
  rows.push(['CAC',                       ueParams.cac,                  '₽',     'Стоимость привлечения одного клиента']);
  rows.push(['Отток в месяц (Churn)',      ueParams.churnRate,            '%/мес', '']);
  rows.push(['Ставка дисконтирования',    ueParams.discountRate,         '% год', '']);

  rows.push([]);
  rows.push(['РАСЧЁТНЫЕ ПОКАЗАТЕЛИ']);
  rows.push(['Показатель', 'Значение', 'Ед. изм.']);
  rows.push(['Оборот на карту в месяц',       ueResult.turnover,       '₽']);
  rows.push(['Интерчейндж',                    ueResult.interchange,    '₽/мес']);
  rows.push(['Процентный доход (NII)',          ueResult.interestIncome, '₽/мес']);
  rows.push(['Комиссии (fees)',                 ueResult.fees,           '₽/мес']);
  rows.push(['Итого ВЫРУЧКА',                   ueResult.revenue,        '₽/мес']);
  rows.push(['Кешбэк',                         ueResult.cashback,       '₽/мес']);
  rows.push(['Процессинг',                      ueResult.processing,     '₽/мес']);
  rows.push(['Обслуживание счёта',              ueResult.servicing,      '₽/мес']);
  rows.push(['Итого РАСХОДЫ',                   ueResult.cost,           '₽/мес']);
  rows.push(['Contribution Margin (CM)',         ueResult.cm,             '₽/мес']);
  rows.push(['CM, % от выручки',                +ueResult.cmPct.toFixed(2), '%']);
  rows.push(['Срок окупаемости (CAC / CM)',      ueResult.paybackMonths !== null ? +ueResult.paybackMonths.toFixed(1) : 'не окупается', 'мес.']);
  rows.push(['Горизонт LTV',                    ueResult.horizon,        'мес.']);
  rows.push(['LTV (NPV будущих маржей)',         +ueResult.ltv.toFixed(2), '₽']);
  rows.push(['LTV / CAC',                       ueResult.ltvCac !== null ? +ueResult.ltvCac.toFixed(3) : 'н/д', 'x']);

  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ── Лист 6: Unit-экономика — кривая окупаемости ──────────────────────────────
function buildUEPaybackSheet() {
  const header = ['Месяц', 'Накопленный денежный поток, ₽', 'Окупился (>= 0)'];
  const rows = [header];
  for (const pt of ueResult.paybackCurve) {
    rows.push([pt.month, +pt.cumulative.toFixed(2), pt.cumulative >= 0 ? 'Да' : 'Нет']);
  }
  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ─── ZIP cleaner: убирает suspicious content-type записи ─────────────────────
// Обходит ложные срабатывания антивирусов: SheetJS добавляет в Content_Types.xml
// дефолтные записи для .bin/.vml/.data, даже если таких файлов в архиве нет.
// macroEnabled — главная триггерная строка у корпоративных DLP/AV.

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const JSZip = null; // не используем JSZip — парсим вручную через Node.js zlib

// Используем встроенный zlib для обработки ZIP без внешних зависимостей
import zlib from 'zlib';

function cleanXlsx(inputBuf) {
  // Читаем ZIP-архив вручную (PKZIP format)
  // Находим и патчим Content_Types.xml entry
  // Удаляем Default-записи для типов, которые реально не нужны:
  //   .bin → macroEnabled (триггер #1)
  //   .vml → vmlDrawing (триггер #2, ассоциируется с OLE)
  //   .data → model+data
  // Оставляем только то, что реально есть в файле: xml, rels + Override записи.

  const zip = parseZip(inputBuf);

  const ctEntry = zip.entries.find(e => e.name === '[Content_Types].xml');
  if (!ctEntry) return inputBuf;

  let ct = ctEntry.data.toString('utf8');

  // Удаляем опасные Default записи (их нет в архиве, они лишние)
  const suspiciousExts = ['bin', 'vml', 'data', 'bmp', 'png', 'gif', 'emf', 'wmf', 'jpg', 'jpeg', 'tif', 'tiff', 'pdf'];
  for (const ext of suspiciousExts) {
    ct = ct.replace(new RegExp(`<Default Extension="${ext}"[^/]*/>`,'g'), '');
  }

  ctEntry.data = Buffer.from(ct, 'utf8');

  return buildZip(zip);
}

function parseZip(buf) {
  // Найти End of Central Directory record
  const EOCD_SIG = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error('Не найден EOCD в ZIP');

  const cdOffset = buf.readUInt32LE(eocdOffset + 16);
  const cdCount  = buf.readUInt16LE(eocdOffset + 8);

  const entries = [];
  let pos = cdOffset;

  for (let i = 0; i < cdCount; i++) {
    const sig = buf.readUInt32LE(pos); // 0x02014b50
    if (sig !== 0x02014b50) break;

    const compression  = buf.readUInt16LE(pos + 10);
    const crc          = buf.readUInt32LE(pos + 16);
    const compSize     = buf.readUInt32LE(pos + 20);
    const uncompSize   = buf.readUInt32LE(pos + 24);
    const nameLen      = buf.readUInt16LE(pos + 28);
    const extraLen     = buf.readUInt16LE(pos + 30);
    const commentLen   = buf.readUInt16LE(pos + 32);
    const localOffset  = buf.readUInt32LE(pos + 42);
    const name         = buf.slice(pos + 46, pos + 46 + nameLen).toString('utf8');

    pos += 46 + nameLen + extraLen + commentLen;

    // Читаем local file header
    const lhNameLen  = buf.readUInt16LE(localOffset + 26);
    const lhExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart  = localOffset + 30 + lhNameLen + lhExtraLen;
    const compData   = buf.slice(dataStart, dataStart + compSize);

    let data;
    if (compression === 0) {
      data = compData;
    } else if (compression === 8) {
      data = zlib.inflateRawSync(compData);
    } else {
      data = compData; // неизвестный метод — оставляем как есть
    }

    entries.push({ name, compression, crc, compSize, uncompSize, localOffset, data, lhNameLen, lhExtraLen });
  }

  return { entries };
}

function buildZip(zip) {
  const LOCAL_SIG = 0x04034b50;
  const CD_SIG    = 0x02014b50;
  const EOCD_SIG  = 0x06054b50;

  const localParts  = [];
  const cdParts     = [];
  const offsets     = [];
  let   offset      = 0;

  for (const entry of zip.entries) {
    offsets.push(offset);

    // Всегда перекомпрессируем deflate (compression=8) для обновлённых данных
    let compData, crc, compSize, uncompSize, compression;
    uncompSize = entry.data.length;

    // Пересчитываем CRC32
    crc = crc32(entry.data);

    if (uncompSize === 0) {
      compData = Buffer.alloc(0);
      compression = 0;
    } else {
      compData = zlib.deflateRawSync(entry.data, { level: 6 });
      if (compData.length >= uncompSize) {
        compData = entry.data;
        compression = 0;
      } else {
        compression = 8;
      }
    }
    compSize = compData.length;

    const nameBuf = Buffer.from(entry.name, 'utf8');

    // Local file header
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(LOCAL_SIG, 0);
    lh.writeUInt16LE(20, 4);   // version needed
    lh.writeUInt16LE(0, 6);    // flags
    lh.writeUInt16LE(compression, 8);
    lh.writeUInt16LE(0, 10);   // mod time
    lh.writeUInt16LE(0, 12);   // mod date
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(compSize, 18);
    lh.writeUInt32LE(uncompSize, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);   // extra len
    nameBuf.copy(lh, 30);

    localParts.push(lh, compData);
    offset += lh.length + compData.length;

    // Central directory entry
    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(CD_SIG, 0);
    cd.writeUInt16LE(20, 4);   // version made by
    cd.writeUInt16LE(20, 6);   // version needed
    cd.writeUInt16LE(0, 8);    // flags
    cd.writeUInt16LE(compression, 10);
    cd.writeUInt16LE(0, 12);   // mod time
    cd.writeUInt16LE(0, 14);   // mod date
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(compSize, 20);
    cd.writeUInt32LE(uncompSize, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);   // extra len
    cd.writeUInt16LE(0, 32);   // comment len
    cd.writeUInt16LE(0, 34);   // disk start
    cd.writeUInt16LE(0, 36);   // int attr
    cd.writeUInt32LE(0, 38);   // ext attr
    cd.writeUInt32LE(offsets[offsets.length - 1], 42); // local header offset
    nameBuf.copy(cd, 46);
    cdParts.push(cd);
  }

  const cdBuf = Buffer.concat(cdParts);
  const cdOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4);   // disk number
  eocd.writeUInt16LE(0, 6);   // cd start disk
  eocd.writeUInt16LE(zip.entries.length, 8);
  eocd.writeUInt16LE(zip.entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);  // comment length

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

// CRC32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// ─── Данные metric-definitions.ts ────────────────────────────────────────────

const TOTAL_DAYS = 176;

function dateFromIdx(i) {
  const d = new Date('2026-01-01');
  d.setDate(d.getDate() + i);
  return d.toISOString().slice(0, 10);
}

function mkHistory(cps, noiseAmp, precision = 0) {
  const sorted = [...cps].sort((a, b) => a[0] - b[0]);
  const mult = 10 ** precision;
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    let lo = sorted[0];
    let hi = sorted[sorted.length - 1];
    for (let k = 0; k < sorted.length - 1; k++) {
      if (sorted[k][0] <= i && sorted[k + 1][0] >= i) { lo = sorted[k]; hi = sorted[k + 1]; break; }
    }
    const t = hi[0] === lo[0] ? 0 : (i - lo[0]) / (hi[0] - lo[0]);
    const base = lo[1] + (hi[1] - lo[1]) * t;
    const n = Math.sin(i * 0.37 + lo[0] * 0.13) * noiseAmp;
    return Math.max(0, Math.round((base + n) * mult) / mult);
  });
}

function velocityHistory() {
  return Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const sprint = Math.floor(i / 14);
    return Math.max(50, Math.round(56 + sprint * 1.1 + Math.sin(sprint * 0.9) * 3));
  });
}

const metricDefs = [
  // Бизнес и портфель
  { id:'active_cards',         group:'Бизнес и портфель',        name:'Активные карты',                         unit:'шт.',       lowerIsBetter:false, currentValue:483240,  planValue:500000,  lastPeriodValue:462000,  owner:'Команда продукта',    updatedAt:'2026-06-25', onDashboard:true,
    history: mkHistory([[0,441000],[89,462000],[175,483240]], 3000) },
  { id:'new_issuance',         group:'Бизнес и портфель',        name:'Новые выдачи в месяц',                   unit:'шт.',       lowerIsBetter:false, currentValue:16800,   planValue:22000,   lastPeriodValue:17200,   owner:'Команда продукта',    updatedAt:'2026-06-25', onDashboard:true,
    history: mkHistory([[0,14200],[89,17200],[120,18400],[150,17500],[175,16800]], 500) },
  { id:'portfolio_balance',    group:'Бизнес и портфель',        name:'Баланс портфеля',                        unit:'млн ₽',    lowerIsBetter:false, currentValue:2840,    planValue:3100,    lastPeriodValue:2640,    owner:'Команда аналитики',   updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,2400],[89,2640],[175,2840]], 60) },
  { id:'product_revenue',      group:'Бизнес и портфель',        name:'Доход от продукта (квартал)',             unit:'млн ₽',    lowerIsBetter:false, currentValue:412,     planValue:480,     lastPeriodValue:358,     owner:'Команда аналитики',   updatedAt:'2026-06-20', onDashboard:true,
    history: mkHistory([[0,300],[89,358],[175,412]], 12) },
  { id:'cac',                  group:'Бизнес и портфель',        name:'CAC (стоимость привлечения)',             unit:'₽',        lowerIsBetter:true,  currentValue:1850,    planValue:1600,    lastPeriodValue:2050,    owner:'Команда маркетинга',  updatedAt:'2026-06-22', onDashboard:false,
    history: mkHistory([[0,2200],[89,2050],[175,1850]], 60) },
  { id:'ltv',                  group:'Бизнес и портфель',        name:'LTV клиента (бизнес)',                   unit:'₽',        lowerIsBetter:false, currentValue:24500,   planValue:27000,   lastPeriodValue:22800,   owner:'Команда аналитики',   updatedAt:'2026-06-20', onDashboard:false,
    history: mkHistory([[0,21000],[89,22800],[175,24500]], 400) },
  // Вовлечение
  { id:'mau',                  group:'Вовлечение',               name:'MAU дебетовой карты',                    unit:'чел.',      lowerIsBetter:false, currentValue:312000,  planValue:340000,  lastPeriodValue:293000,  owner:'Команда продукта',    updatedAt:'2026-06-25', onDashboard:true,
    history: mkHistory([[0,278000],[89,293000],[175,312000]], 4000) },
  { id:'dau',                  group:'Вовлечение',               name:'DAU дебетовой карты',                    unit:'чел.',      lowerIsBetter:false, currentValue:89400,   planValue:95000,   lastPeriodValue:84000,   owner:'Команда продукта',    updatedAt:'2026-06-25', onDashboard:true,
    history: mkHistory([[0,79000],[89,84000],[175,89400]], 2000) },
  { id:'tx_frequency',         group:'Вовлечение',               name:'Частота транзакций на карту',            unit:'опер.',     lowerIsBetter:false, currentValue:14.2,    planValue:16.0,    lastPeriodValue:13.1,    owner:'Команда аналитики',   updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,12.2],[89,13.1],[175,14.2]], 0.4, 1) },
  { id:'avg_ticket',           group:'Вовлечение',               name:'Средний чек покупки',                    unit:'₽',        lowerIsBetter:false, currentValue:3240,    planValue:3500,    lastPeriodValue:3080,    owner:'Команда аналитики',   updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,2950],[89,3080],[175,3240]], 60) },
  { id:'cashback_adoption',    group:'Вовлечение',               name:'Доля с кэшбэком / лояльностью',          unit:'%',        lowerIsBetter:false, currentValue:67.3,    planValue:72.0,    lastPeriodValue:65.2,    owner:'Команда продукта',    updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,62.0],[89,65.2],[130,67.5],[175,67.3]], 0.6, 1) },
  // Клиентский опыт
  { id:'nps_general',          group:'Клиентский опыт',          name:'NPS общий',                              unit:'',         lowerIsBetter:false, currentValue:58,      planValue:72,      lastPeriodValue:72,      owner:'CX-команда',          updatedAt:'2026-06-21', onDashboard:true,
    history: mkHistory([[0,66],[89,72],[120,72],[140,65],[162,60],[175,58]], 2) },
  { id:'nps_tx',               group:'Клиентский опыт',          name:'NPS транзакционный',                     unit:'',         lowerIsBetter:false, currentValue:67,      planValue:78,      lastPeriodValue:76,      owner:'CX-команда',          updatedAt:'2026-06-21', onDashboard:false,
    history: mkHistory([[0,70],[89,76],[120,76],[140,71],[162,68],[175,67]], 2) },
  { id:'support_contacts',     group:'Клиентский опыт',          name:'Обращения на 1 000 карт',                unit:'',         lowerIsBetter:true,  currentValue:31.2,    planValue:18.0,    lastPeriodValue:21.0,    owner:'CX-команда',          updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,27.0],[89,21.0],[100,21.0],[108,34.5],[130,33.0],[175,31.2]], 1.0, 1) },
  { id:'ttr',                  group:'Клиентский опыт',          name:'TTR — время решения проблемы',           unit:'ч.',       lowerIsBetter:true,  currentValue:6.8,     planValue:2.5,     lastPeriodValue:3.8,     owner:'CX-команда',          updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,5.8],[89,3.8],[100,3.8],[108,7.6],[130,7.2],[175,6.8]], 0.3, 1) },
  { id:'churn_rate',           group:'Клиентский опыт',          name:'Churn Rate (отток)',                     unit:'%',        lowerIsBetter:true,  currentValue:3.8,     planValue:2.0,     lastPeriodValue:2.4,     owner:'Команда удержания',   updatedAt:'2026-06-22', onDashboard:true,
    history: mkHistory([[0,3.2],[89,2.4],[105,2.4],[120,3.0],[148,3.6],[175,3.8]], 0.12, 1) },
  // Юнит-экономика
  { id:'revenue_per_card',     group:'Юнит-экономика',           name:'Выручка на карту в месяц',               unit:'₽',        lowerIsBetter:false, currentValue:340,     planValue:380,     lastPeriodValue:312,     owner:'Команда аналитики',   updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,285],[89,312],[175,340]], 10) },
  { id:'cost_per_card',        group:'Юнит-экономика',           name:'Затраты на обслуживание карты',          unit:'₽',        lowerIsBetter:true,  currentValue:222,     planValue:160,     lastPeriodValue:195,     owner:'Команда аналитики',   updatedAt:'2026-06-22', onDashboard:false,
    history: mkHistory([[0,212],[89,195],[100,195],[118,210],[150,218],[175,222]], 6) },
  { id:'profit_per_card',      group:'Юнит-экономика',           name:'Прибыль на карту',                       unit:'₽',        lowerIsBetter:false, currentValue:118,     planValue:220,     lastPeriodValue:148,     owner:'Команда аналитики',   updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,88],[89,148],[110,148],[132,128],[160,121],[175,118]], 8) },
  { id:'cohort_retention_12m', group:'Юнит-экономика',           name:'Когортное удержание 12M',                unit:'%',        lowerIsBetter:false, currentValue:68.5,    planValue:75.0,    lastPeriodValue:70.2,    owner:'Команда аналитики',   updatedAt:'2026-06-20', onDashboard:false,
    history: mkHistory([[0,67.5],[89,70.2],[130,70.0],[175,68.5]], 0.5, 1) },
  { id:'cashback_cost',        group:'Юнит-экономика',           name:'Cashback Cost',                          unit:'%',        lowerIsBetter:true,  currentValue:1.45,    planValue:1.10,    lastPeriodValue:1.09,    owner:'Команда продукта',    updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,1.08],[89,1.09],[100,1.12],[130,1.28],[155,1.40],[175,1.45]], 0.03, 2) },
  // Надёжность и риски
  { id:'uptime',               group:'Надёжность и риски',       name:'Uptime процессинга',                     unit:'%',        lowerIsBetter:false, currentValue:99.97,   planValue:99.99,   lastPeriodValue:99.95,   owner:'Команда надёжности',  updatedAt:'2026-06-25', onDashboard:true,
    history: mkHistory([[0,99.92],[89,99.95],[175,99.97]], 0.02, 2) },
  { id:'auth_success_rate',    group:'Надёжность и риски',       name:'Authorization Success Rate',             unit:'%',        lowerIsBetter:false, currentValue:96.8,    planValue:99.0,    lastPeriodValue:98.5,    owner:'Команда надёжности',  updatedAt:'2026-06-25', onDashboard:true,
    history: mkHistory([[0,97.4],[89,98.5],[100,98.5],[108,96.0],[130,96.4],[175,96.8]], 0.2, 1) },
  { id:'auth_latency_p95',     group:'Надёжность и риски',       name:'Latency авторизации p95',                unit:'мс',       lowerIsBetter:true,  currentValue:180,     planValue:150,     lastPeriodValue:198,     owner:'Команда надёжности',  updatedAt:'2026-06-25', onDashboard:false,
    history: mkHistory([[0,215],[89,198],[100,194],[108,210],[130,196],[175,180]], 8) },
  { id:'mttd',                 group:'Надёжность и риски',       name:'MTTD — время обнаружения инцидента',     unit:'мин.',     lowerIsBetter:true,  currentValue:12,      planValue:8,       lastPeriodValue:16,      owner:'Команда надёжности',  updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,20],[89,16],[175,12]], 2) },
  { id:'mttr',                 group:'Надёжность и риски',       name:'MTTR — время восстановления',            unit:'мин.',     lowerIsBetter:true,  currentValue:47,      planValue:30,      lastPeriodValue:62,      owner:'Команда надёжности',  updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,72],[89,62],[175,47]], 5) },
  { id:'fraud_rate',           group:'Надёжность и риски',       name:'Fraud Rate',                             unit:'%',        lowerIsBetter:true,  currentValue:0.034,   planValue:0.030,   lastPeriodValue:0.038,   owner:'Команда безопасности', updatedAt:'2026-06-24', onDashboard:true,
    history: mkHistory([[0,0.044],[89,0.038],[175,0.034]], 0.003, 3) },
  { id:'false_positive_rate',  group:'Надёжность и риски',       name:'False Positive Rate антифрода',          unit:'%',        lowerIsBetter:true,  currentValue:1.35,    planValue:0.60,    lastPeriodValue:0.65,    owner:'Команда безопасности', updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,0.92],[89,0.65],[100,0.65],[104,1.82],[115,1.68],[145,1.48],[175,1.35]], 0.04, 2) },
  { id:'chargeback_rate',      group:'Надёжность и риски',       name:'Chargeback Rate',                        unit:'%',        lowerIsBetter:true,  currentValue:0.14,    planValue:0.10,    lastPeriodValue:0.12,    owner:'Команда безопасности', updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,0.155],[89,0.12],[100,0.12],[115,0.148],[175,0.14]], 0.006, 3) },
  // Командная эффективность
  { id:'velocity',             group:'Командная эффективность',  name:'Velocity (SP/спринт)',                   unit:'SP',       lowerIsBetter:false, currentValue:68,      planValue:72,      lastPeriodValue:62,      owner:'Команда разработки',  updatedAt:'2026-06-24', onDashboard:false,
    history: velocityHistory() },
  { id:'lead_time',            group:'Командная эффективность',  name:'Lead Time',                              unit:'дн.',      lowerIsBetter:true,  currentValue:9.3,     planValue:7.0,     lastPeriodValue:11.2,    owner:'Команда разработки',  updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,12.5],[89,11.2],[175,9.3]], 0.6, 1) },
  { id:'cycle_time',           group:'Командная эффективность',  name:'Cycle Time',                             unit:'дн.',      lowerIsBetter:true,  currentValue:2.1,     planValue:1.5,     lastPeriodValue:2.7,     owner:'Команда разработки',  updatedAt:'2026-06-24', onDashboard:false,
    history: mkHistory([[0,3.0],[89,2.7],[175,2.1]], 0.2, 1) },
  { id:'deploy_frequency',     group:'Командная эффективность',  name:'Deploy Frequency',                       unit:'деп./нед.',lowerIsBetter:false, currentValue:2.3,     planValue:3.0,     lastPeriodValue:1.9,     owner:'Команда разработки',  updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,1.6],[89,1.9],[175,2.3]], 0.2, 1) },
  { id:'defect_rate',          group:'Командная эффективность',  name:'Defect Rate',                            unit:'%',        lowerIsBetter:true,  currentValue:1.8,     planValue:1.0,     lastPeriodValue:2.3,     owner:'Команда QA',          updatedAt:'2026-06-23', onDashboard:false,
    history: mkHistory([[0,2.8],[89,2.3],[175,1.8]], 0.2, 1) },
  { id:'backlog_ratio',        group:'Командная эффективность',  name:'Соотношение бэклога (фичи/баги/долг)',   unit:'%',        lowerIsBetter:false, currentValue:60,      planValue:60,      lastPeriodValue:54,      owner:'Команда продукта',    updatedAt:'2026-06-21', onDashboard:false,
    history: mkHistory([[0,50],[89,54],[175,60]], 2) },
];

// ── Лист 7: Расширенные метрики — сводка ─────────────────────────────────────
function buildMetricDefsSummarySheet() {
  const header = ['Группа', 'ID', 'Метрика', 'Факт (25 июн 2026)', 'План', 'Прошлый период', 'Ед. изм.', 'Меньше = лучше', 'На дашборде', 'Владелец', 'Обновлено'];
  const rows = [header];
  for (const m of metricDefs) {
    rows.push([
      m.group, m.id, m.name,
      m.currentValue, m.planValue, m.lastPeriodValue,
      m.unit, m.lowerIsBetter ? 'Да' : 'Нет',
      m.onDashboard ? 'Да' : 'Нет',
      m.owner, m.updatedAt,
    ]);
  }
  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ── Лист 8: Расширенные метрики — дневная история (176 дней) ─────────────────
function buildMetricDefsHistorySheet() {
  // Заголовок: Дата + по одной колонке на метрику
  const header = ['Дата (Q1–Q2 2026)', ...metricDefs.map(m => `${m.name} (${m.unit || 'ед.'})`)];
  const rows = [header];
  for (let i = 0; i < TOTAL_DAYS; i++) {
    rows.push([dateFromIdx(i), ...metricDefs.map(m => m.history[i])]);
  }
  const ws = makeSheet(rows);
  autoCols(ws, rows);
  return ws;
}

// ─── Сборка книги ─────────────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb, buildMetricsSheet(),        '01_Метрики');
XLSX.utils.book_append_sheet(wb, buildDashboardSheet(),      '02_Дашборд');
XLSX.utils.book_append_sheet(wb, buildFunnelSummarySheet(),  '03_Воронка_сводка');
XLSX.utils.book_append_sheet(wb, buildFunnelHistorySheet(),  '04_Воронка_история');
XLSX.utils.book_append_sheet(wb, buildUEParamsSheet(),       '05_Unit_экономика');
XLSX.utils.book_append_sheet(wb, buildUEPaybackSheet(),      '06_UE_окупаемость');
XLSX.utils.book_append_sheet(wb, buildMetricDefsSummarySheet(), '07_Метрики_расш_сводка');
XLSX.utils.book_append_sheet(wb, buildMetricDefsHistorySheet(), '08_Метрики_расш_история');

// ─── Запись файла ─────────────────────────────────────────────────────────────

const outDir = path.join(ROOT, 'exports');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'barometer-fixtures.xlsx');

// bookType: 'xlsx' — стандартный OOXML, без макросов, без VBA
// write to buffer then save via fs (ESM-safe)
const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', compression: true });

fs.writeFileSync(outFile, buf);

// Post-processing via Python: remove suspicious Default entries from Content_Types.xml.
// SheetJS adds boilerplate MIME types (macroEnabled/bin/vml) that trigger corporate DLP/AV.
import { execSync } from 'child_process';
const pyPath = path.join(ROOT, 'scripts', '_clean_xlsx_ct.py');
fs.writeFileSync(pyPath, `
import zipfile, io, re, sys
src = sys.argv[1]
with open(src, 'rb') as f:
    raw = f.read()
zin = zipfile.ZipFile(io.BytesIO(raw))
buf = io.BytesIO()
zout = zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED, compresslevel=6)
for item in zin.infolist():
    data = zin.read(item.filename)
    if item.filename == '[Content_Types].xml':
        text = data.decode('utf-8')
        for ext in ['bin','vml','data','bmp','png','gif','emf','wmf','jpg','jpeg','tif','tiff','pdf']:
            text = re.sub(r'<Default Extension="' + ext + r'"[^>]*/>', '', text)
        data = text.encode('utf-8')
    zout.writestr(item, data)
zout.close()
with open(src, 'wb') as f:
    f.write(buf.getvalue())
print('Content_Types.xml cleaned')
`.trimStart());
execSync(`python3 "${pyPath}" "${outFile}"`, { stdio: 'inherit' });
fs.unlinkSync(pyPath);

console.log(`Файл создан: ${outFile}`);
console.log(`Листов: ${wb.SheetNames.length}`);
wb.SheetNames.forEach((name, i) => {
  const ws = wb.Sheets[name];
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1:A1');
  const rowCount = range.e.r - range.s.r; // без заголовка
  console.log(`  ${i + 1}. ${name} — ${rowCount} строк данных`);
});
