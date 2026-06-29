import type { Agent } from '../types';

export const agentFixtures: Agent[] = [
  {
    id: 'ag1',
    name: 'Метрический дозорный',
    category: 'monitoring',
    description: 'Отслеживает пороговые значения метрик продукта и создаёт инциденты при отклонениях.',
    isActive: true,
    lastFired: '2026-06-19T08:15:00Z',
    eventCount24h: 3,
  },
  {
    id: 'ag2',
    name: 'Compliance-инспектор',
    category: 'compliance',
    description: 'Проверяет задачи и PR на соответствие регуляторным требованиям банка.',
    isActive: true,
    lastFired: '2026-06-18T17:42:00Z',
    eventCount24h: 7,
  },
  {
    id: 'ag3',
    name: 'Приоритизатор бэклога',
    category: 'analytics',
    description: 'Автоматически скорит бэклог по ICE/RICE + compliance-риски + стратегия.',
    isActive: false,
    lastFired: '2026-06-15T12:00:00Z',
    eventCount24h: 0,
  },
];
