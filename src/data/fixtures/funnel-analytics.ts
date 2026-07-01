import type { FunnelAnalyticsStep, MetricPoint } from '../types';

function dateStr(offsetFromStart: number): string {
  const d = new Date('2026-05-27');
  d.setDate(d.getDate() + offsetFromStart);
  return d.toISOString().slice(0, 10);
}

// Step 1 — Просмотр предложения карты
// Плавное снижение с низкой волатильностью (сезонный трафик, предсказуем)
function makeHistoryStep1(peak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    const trend = 1 - i * 0.007;
    const osc = Math.sin(i * 0.42) * 0.05;
    return { date: dateStr(i), value: Math.max(0, Math.round(peak * (trend + osc))) };
  });
}

// Step 2 — Начало заявки на карту
// Маркетинговый спайк на 10–14 день, высокая волатильность
function makeHistoryStep2(peak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    const base = i < 11 ? 0.88 + i * 0.016 : 1.05 - (i - 11) * 0.038;
    const osc = Math.sin(i * 1.15) * 0.10;
    return { date: dateStr(i), value: Math.max(0, Math.round(peak * (base + osc))) };
  });
}

// Step 3 — Заявка одобрена
// Очень стабильно (одобрение контролируется внутренним процессом),
// лёгкий аптренд, потом резкое падение в последние 5 дней
function makeHistoryStep3(peak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    let value: number;
    if (i < 25) {
      value = peak * (1.02 + i * 0.002 + Math.sin(i * 0.28) * 0.03);
    } else {
      value = peak * (1.12 - (i - 24) * 0.12);
    }
    return { date: dateStr(i), value: Math.max(0, Math.round(value)) };
  });
}

// Step 4 — Карта выпущена
// Плато → операционный сбой с 18-го дня, крутое падение
function makeHistoryStep4(peak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    let value: number;
    if (i < 18) {
      value = peak * (1 + Math.sin(i * 0.62) * 0.04);
    } else {
      value = peak * Math.exp(-(i - 18) * 0.22);
    }
    return { date: dateStr(i), value: Math.max(0, Math.round(value)) };
  });
}

// Step 5 — Карта активирована
// Растущий тренд (онбординг улучшается), затем небольшая коррекция
function makeHistoryStep5(peak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    let value: number;
    if (i < 20) {
      value = peak * (0.68 + i * 0.018 + Math.sin(i * 0.78) * 0.07);
    } else {
      value = peak * (1.04 - (i - 20) * 0.014 + Math.sin(i * 0.78) * 0.05);
    }
    return { date: dateStr(i), value: Math.max(0, Math.round(value)) };
  });
}

// Funnel anchored to real metric: card_issued = 16,800/month = ~560/day
//   step1 views:      84 000                      100 %
//   step2 started:    28 000  (33 % of views)     33.3 %
//   step3 approved:   22 400  (80 % of started)   26.7 %
//   step4 issued:     16 800  (75 % of approved)  20.0 %
//   step5 activated:  11 760  (70 % of issued)    14.0 %

export const funnelAnalyticsFixture: FunnelAnalyticsStep[] = [
  {
    id: 'step1',
    name: 'Просмотр предложения карты',
    eventName: 'view_debit_card_offer',
    users: 84_000,
    change: -2_400,
    conversionFromFirst: 100,
    history: makeHistoryStep1(2_800),
  },
  {
    id: 'step2',
    name: 'Начало заявки на карту',
    eventName: 'start_card_application',
    users: 28_000,
    change: 800,
    conversionFromFirst: 33.3,
    history: makeHistoryStep2(933),
  },
  {
    id: 'step3',
    name: 'Заявка одобрена',
    eventName: 'card_application_approved',
    users: 22_400,
    change: -200,
    conversionFromFirst: 26.7,
    history: makeHistoryStep3(747),
  },
  {
    id: 'step4',
    name: 'Карта выпущена',
    eventName: 'card_issued',
    users: 16_800,
    change: -400,
    conversionFromFirst: 20.0,
    history: makeHistoryStep4(560),
  },
  {
    id: 'step5',
    name: 'Карта активирована',
    eventName: 'card_activated',
    users: 11_760,
    change: 360,
    conversionFromFirst: 14.0,
    history: makeHistoryStep5(392),
  },
];
