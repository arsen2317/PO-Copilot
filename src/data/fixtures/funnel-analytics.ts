import type { FunnelAnalyticsStep, MetricPoint } from '../types';

// Q2 финансовый квартал: 1 апреля — 30 июня 2026 (91 день)
function dateStr(offset: number): string {
  const d = new Date('2026-04-01');
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Детерминированный LCG-генератор шума — не меняется при каждом рендере
function lcg(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// 1 апреля 2026 = среда (0=пн…6=вс, среда=2)
function isWeekend(i: number): boolean {
  return (i + 2) % 7 >= 5;
}

// Шаг 1 — Просмотр предложения карты (~84 000 за квартал)
// Сезонный спад апрель→июнь −16%; выходные −18% (листают меньше)
function makeHistoryStep1(): MetricPoint[] {
  const rng = lcg(1001);
  return Array.from({ length: 91 }, (_, i) => {
    const trend = 1.08 - i * 0.0018;
    const dow = isWeekend(i) ? 0.82 : 1.0;
    const noise = (rng() - 0.5) * 0.12;
    return { date: dateStr(i), value: Math.max(0, Math.round(1_000 * trend * dow * (1 + noise))) };
  });
}

// Шаг 2 — Начало заявки на карту (~28 000 за квартал)
// Маркетинговый спайк 8–21 апреля; заявки почти не подают в выходные
function makeHistoryStep2(): MetricPoint[] {
  const rng = lcg(1002);
  return Array.from({ length: 91 }, (_, i) => {
    let trend: number;
    if (i < 7)       trend = 0.90 + i * 0.014;
    else if (i < 21) trend = 1.75;
    else             trend = 1.02 - (i - 21) * 0.003;
    const dow = isWeekend(i) ? 0.42 : 1.0;
    const noise = (rng() - 0.5) * 0.14;
    return { date: dateStr(i), value: Math.max(0, Math.round(340 * trend * dow * (1 + noise))) };
  });
}

// Шаг 3 — Заявка одобрена (~22 400 за квартал)
// Стабильный автоматизированный процесс; батч-задания реже запускают в выходные
function makeHistoryStep3(): MetricPoint[] {
  const rng = lcg(1003);
  return Array.from({ length: 91 }, (_, i) => {
    const trend = 1.0 + i * 0.0008;
    const dow = isWeekend(i) ? 0.58 : 1.0;
    const noise = (rng() - 0.5) * 0.10;
    return { date: dateStr(i), value: Math.max(0, Math.round(280 * trend * dow * (1 + noise))) };
  });
}

// Шаг 4 — Карта выпущена (~16 800 за квартал)
// Стабильное плато → операционный сбой с 15 июня (день 75), постепенный спад
// Выпуск карт — только в рабочие дни
function makeHistoryStep4(): MetricPoint[] {
  const rng = lcg(1004);
  const INCIDENT_DAY = 75;
  return Array.from({ length: 91 }, (_, i) => {
    const incident = i < INCIDENT_DAY ? 1.0 : Math.exp(-(i - INCIDENT_DAY) * 0.10);
    const dow = isWeekend(i) ? 0.12 : 1.0;
    const noise = (rng() - 0.5) * 0.10;
    return { date: dateStr(i), value: Math.max(0, Math.round(240 * incident * dow * (1 + noise))) };
  });
}

// Шаг 5 — Карта активирована (~11 760 за квартал)
// Рост онбординга весь квартал; активируют чаще вечером и в выходные
function makeHistoryStep5(): MetricPoint[] {
  const rng = lcg(1005);
  return Array.from({ length: 91 }, (_, i) => {
    const trend = 0.88 + i * 0.0024;
    const dow = isWeekend(i) ? 1.22 : 1.0;
    const noise = (rng() - 0.5) * 0.13;
    return { date: dateStr(i), value: Math.max(0, Math.round(145 * trend * dow * (1 + noise))) };
  });
}

export const funnelAnalyticsFixture: FunnelAnalyticsStep[] = [
  {
    id: 'step1',
    name: 'Просмотр предложения карты',
    eventName: 'view_debit_card_offer',
    users: 84_000,
    change: -2_400,
    conversionFromFirst: 100,
    history: makeHistoryStep1(),
  },
  {
    id: 'step2',
    name: 'Начало заявки на карту',
    eventName: 'start_card_application',
    users: 28_000,
    change: 1_400,
    conversionFromFirst: 33.3,
    history: makeHistoryStep2(),
  },
  {
    id: 'step3',
    name: 'Заявка одобрена',
    eventName: 'card_application_approved',
    users: 22_400,
    change: -800,
    conversionFromFirst: 26.7,
    history: makeHistoryStep3(),
  },
  {
    id: 'step4',
    name: 'Карта выпущена',
    eventName: 'card_issued',
    users: 16_800,
    change: -5_200,
    conversionFromFirst: 20.0,
    history: makeHistoryStep4(),
  },
  {
    id: 'step5',
    name: 'Карта активирована',
    eventName: 'card_activated',
    users: 11_760,
    change: 560,
    conversionFromFirst: 14.0,
    history: makeHistoryStep5(),
  },
];
