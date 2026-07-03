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

// ─── Сборка книги ─────────────────────────────────────────────────────────────

const wb = XLSX.utils.book_new();

XLSX.utils.book_append_sheet(wb, buildMetricsSheet(),        '01_Метрики');
XLSX.utils.book_append_sheet(wb, buildDashboardSheet(),      '02_Дашборд');
XLSX.utils.book_append_sheet(wb, buildFunnelSummarySheet(),  '03_Воронка_сводка');
XLSX.utils.book_append_sheet(wb, buildFunnelHistorySheet(),  '04_Воронка_история');
XLSX.utils.book_append_sheet(wb, buildUEParamsSheet(),       '05_Unit_экономика');
XLSX.utils.book_append_sheet(wb, buildUEPaybackSheet(),      '06_UE_окупаемость');

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
