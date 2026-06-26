import type { FunnelAnalyticsStep, MetricPoint } from '../types';

function dateStr(offsetFromStart: number): string {
  const d = new Date('2026-05-27');
  d.setDate(d.getDate() + offsetFromStart);
  return d.toISOString().slice(0, 10);
}

// 30 days: stable for first 23 days, declining Jun 19–26 (last 7)
function makeHistory(dailyPeak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    let value: number;
    if (i < 23) {
      const cycle = Math.round(Math.sin(i * 0.55) * (dailyPeak * 0.07));
      value = dailyPeak + cycle;
    } else {
      const decay = Math.exp(-(i - 22) * 0.28);
      value = Math.round(dailyPeak * decay);
    }
    return { date: dateStr(i), value: Math.max(0, value) };
  });
}

// Funnel anchored to real metric: card_issued = 16,800/month = ~560/day
// Backwards:
//   step5 activated:  11 760  (70 % of issued)   14.0 % of first
//   step4 issued:     16 800  (75 % of approved)  20.0 %
//   step3 approved:   22 400  (80 % of started)   26.7 %
//   step2 started:    28 000  (33 % of views)     33.3 %
//   step1 views:      84 000                      100 %

export const funnelAnalyticsFixture: FunnelAnalyticsStep[] = [
  {
    id: 'step1',
    name: 'Просмотр предложения карты',
    eventName: 'view_debit_card_offer',
    users: 84_000,
    change: -2_400,
    conversionFromFirst: 100,
    history: makeHistory(2_800),
  },
  {
    id: 'step2',
    name: 'Начало заявки на карту',
    eventName: 'start_card_application',
    users: 28_000,
    change: 800,
    conversionFromFirst: 33.3,
    history: makeHistory(933),
  },
  {
    id: 'step3',
    name: 'Заявка одобрена',
    eventName: 'card_application_approved',
    users: 22_400,
    change: -200,
    conversionFromFirst: 26.7,
    history: makeHistory(747),
  },
  {
    id: 'step4',
    name: 'Карта выпущена',
    eventName: 'card_issued',
    users: 16_800,
    change: -400,
    conversionFromFirst: 20.0,
    history: makeHistory(560),
  },
  {
    id: 'step5',
    name: 'Карта активирована',
    eventName: 'card_activated',
    users: 11_760,
    change: 360,
    conversionFromFirst: 14.0,
    history: makeHistory(392),
  },
];
