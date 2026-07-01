import type { FunnelAnalyticsStep, MetricPoint } from '../types';

// Q2 финансовый квартал: 1 апреля — 30 июня 2026 (91 день)
// users = квартальный итог; дневная история суммируется ≈ users
function dateStr(offset: number): string {
  const d = new Date('2026-04-01');
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

// Шаг 1 — Просмотр предложения карты
// Сезонный спад: пик в начале апреля, –16% к концу июня
// peak=1000/день → сумма ≈ 84 000 за квартал
function makeHistoryStep1(): MetricPoint[] {
  return Array.from({ length: 91 }, (_, i) => {
    const trend = 1 - i * 0.0018;
    const osc = Math.sin(i * 0.42) * 0.05;
    return { date: dateStr(i), value: Math.max(0, Math.round(1_000 * (trend + osc))) };
  });
}

// Шаг 2 — Начало заявки на карту
// Маркетинговый спайк 7–20 апреля (+25%), затем нормализация к базе
// base=388/день → сумма ≈ 28 000 за квартал
function makeHistoryStep2(): MetricPoint[] {
  return Array.from({ length: 91 }, (_, i) => {
    let mult: number;
    if (i < 7) {
      mult = 0.85 + i * 0.015;
    } else if (i < 21) {
      mult = 0.95 + Math.sin((i - 7) * 0.45) * 0.25;
    } else {
      mult = 0.75 + Math.sin(i * 0.32) * 0.12;
    }
    return { date: dateStr(i), value: Math.max(0, Math.round(388 * mult)) };
  });
}

// Шаг 3 — Заявка одобрена
// Стабильно (внутренний процесс одобрения), лёгкий восходящий тренд
// peak=236/день → сумма ≈ 22 400 за квартал
function makeHistoryStep3(): MetricPoint[] {
  return Array.from({ length: 91 }, (_, i) => {
    const value = 236 * (1.0 + i * 0.001 + Math.sin(i * 0.28) * 0.03);
    return { date: dateStr(i), value: Math.max(0, Math.round(value)) };
  });
}

// Шаг 4 — Карта выпущена
// Стабильное плато апрель–14 июня → операционный сбой с 15 июня (день 75),
// постепенный спад ~3–4 недели (rate 0.10/день → за неделю –50%).
// peak=200/день × 75 дней плато + ~1 677 с decay ≈ 16 800 за квартал
function makeHistoryStep4(): MetricPoint[] {
  const INCIDENT_DAY = 75; // 15 июня
  return Array.from({ length: 91 }, (_, i) => {
    const value = i < INCIDENT_DAY
      ? 200 * (1 + Math.sin(i * 0.62) * 0.04)
      : 200 * Math.exp(-(i - INCIDENT_DAY) * 0.10);
    return { date: dateStr(i), value: Math.max(0, Math.round(value)) };
  });
}

// Шаг 5 — Карта активирована
// Рост онбординга весь квартал: апрель +0% → июнь +18%
// base=132/день → сумма ≈ 11 760 за квартал
function makeHistoryStep5(): MetricPoint[] {
  return Array.from({ length: 91 }, (_, i) => {
    const value = i < 60
      ? 132 * (0.88 + i * 0.002 + Math.sin(i * 0.78) * 0.07)
      : 132 * (1.0 + (i - 60) * 0.003 + Math.sin(i * 0.78) * 0.05);
    return { date: dateStr(i), value: Math.max(0, Math.round(value)) };
  });
}

// Квартальные итоги Q2 и дельты vs Q1
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
