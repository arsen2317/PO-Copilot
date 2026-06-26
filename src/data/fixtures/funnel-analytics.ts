import type { FunnelAnalyticsStep, MetricPoint } from '../types';

function dateStr(offsetFromToday: number): string {
  const d = new Date('2026-06-26');
  d.setDate(d.getDate() - (29 - offsetFromToday));
  return d.toISOString().slice(0, 10);
}

// Generates daily user count: stable for first ~23 days, sharp decline last 7 (Jun 19–26)
function makeHistory(peak: number): MetricPoint[] {
  return Array.from({ length: 30 }, (_, i) => {
    let value: number;
    if (i < 23) {
      // stable with small variation
      const cycle = Math.round(Math.sin(i * 0.6) * (peak * 0.08));
      value = peak + cycle;
    } else {
      // declining Jun 19–26 (matches reference visual)
      const decay = Math.exp(-(i - 22) * 0.5);
      value = Math.round(peak * decay);
    }
    return { date: dateStr(i), value: Math.max(0, value) };
  });
}

export const funnelAnalyticsFixture: FunnelAnalyticsStep[] = [
  {
    id: 'step1',
    name: 'Просмотр предложения карты',
    eventName: 'view_debit_card_offer',
    users: 17,
    change: 0,
    conversionFromFirst: 100,
    history: makeHistory(10),
  },
  {
    id: 'step2',
    name: 'Начало заявки на карту',
    eventName: 'start_card_application',
    users: 8,
    change: 0,
    conversionFromFirst: 47.1,
    history: makeHistory(5),
  },
  {
    id: 'step3',
    name: 'Заявка одобрена',
    eventName: 'card_application_approved',
    users: 4,
    change: 0,
    conversionFromFirst: 23.5,
    history: makeHistory(2),
  },
  {
    id: 'step4',
    name: 'Карта выпущена',
    eventName: 'card_issued',
    users: 4,
    change: 0,
    conversionFromFirst: 23.5,
    history: makeHistory(2),
  },
  {
    id: 'step5',
    name: 'Карта активирована',
    eventName: 'card_activated',
    users: 0,
    change: 0,
    conversionFromFirst: 0,
    history: makeHistory(0),
  },
];
