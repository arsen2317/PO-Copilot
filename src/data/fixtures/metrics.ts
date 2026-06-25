import type { MetricGroup } from '../types';

export const metricGroupsFixture: MetricGroup[] = [
  {
    id: 'acquisition',
    name: 'Привлечение',
    metrics: [
      { id: 'acq1', name: 'Новые карты (выдано)', currentQuarter: 18300, plan: 22000, fulfillment: 83, lastQuarter: 15200, unit: 'шт.' },
      { id: 'acq2', name: 'Заявок на карту', currentQuarter: 31500, plan: 38000, fulfillment: 83, lastQuarter: 27100, unit: 'шт.' },
      { id: 'acq3', name: 'Конверсия заявка → карта', currentQuarter: 58, plan: 65, fulfillment: 89, lastQuarter: 56, unit: '%' },
    ],
  },
  {
    id: 'activation',
    name: 'Активация',
    metrics: [
      { id: 'act1', name: 'Активированных карт (первая транзакция)', currentQuarter: 14200, plan: 17000, fulfillment: 84, lastQuarter: 11800, unit: 'шт.' },
      { id: 'act2', name: 'Время до первой транзакции (медиана)', currentQuarter: 3, plan: 2, fulfillment: 67, lastQuarter: 4, unit: 'дня' },
    ],
  },
  {
    id: 'transactions',
    name: 'Транзакции',
    metrics: [
      { id: 'trx1', name: 'Оборот по картам', currentQuarter: 4820000, plan: 5500000, fulfillment: 88, lastQuarter: 4100000, unit: '₽' },
      { id: 'trx2', name: 'Средний чек', currentQuarter: 3240, plan: 3500, fulfillment: 93, lastQuarter: 3080, unit: '₽' },
      { id: 'trx3', name: 'Транзакций на активную карту (месяц)', currentQuarter: 11, plan: 14, fulfillment: 79, lastQuarter: 10, unit: 'шт.' },
    ],
  },
  {
    id: 'retention',
    name: 'Удержание',
    metrics: [
      { id: 'ret1', name: 'MAU (активные держатели карт)', currentQuarter: 49200, plan: 55000, fulfillment: 89, lastQuarter: 43500, unit: 'чел.' },
      { id: 'ret2', name: 'Отток карт (закрыто / выдано)', currentQuarter: 4.2, plan: 3.0, fulfillment: 71, lastQuarter: 4.8, unit: '%' },
      { id: 'ret3', name: 'NPS держателей карт', currentQuarter: 68, plan: 72, fulfillment: 94, lastQuarter: 64, unit: '' },
    ],
  },
];
