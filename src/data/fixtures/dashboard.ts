import type { FunnelStep, Incident, MetricPoint, NpsPoint, Product, SprintMetric } from '../types';

export const productFixtures: Product[] = [
  { id: 'p1', name: 'Мобильное приложение', team: 'Team Alpha' },
  { id: 'p2', name: 'Интернет-банк', team: 'Team Beta' },
  { id: 'p3', name: 'API платформа', team: 'Team Gamma' },
];

export const funnelFixtures: FunnelStep[] = [
  { id: 'f1', name: 'Открыл форму', value: 10_000, percent: 100, riskLevel: 'ok' },
  { id: 'f2', name: 'Ввёл личные данные', value: 8_500, percent: 85, riskLevel: 'ok' },
  { id: 'f3', name: 'Ввод паспорта', value: 5_610, percent: 66, riskLevel: 'critical' },
  { id: 'f4', name: 'Подтверждение', value: 5_200, percent: 93, riskLevel: 'ok' },
  { id: 'f5', name: 'Решение выдано', value: 4_800, percent: 92, riskLevel: 'ok' },
];

function daysAgo(n: number): string {
  const d = new Date('2026-06-19');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const npsFixtures: NpsPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: daysAgo(29 - i),
  nps: 62 + Math.round(Math.sin(i * 0.4) * 6) + Math.round(i * 0.2),
  tickets: 140 - Math.round(i * 1.5) + Math.round(Math.cos(i * 0.5) * 10),
}));

export const sprintFixture: SprintMetric = {
  sprintName: 'Sprint 47',
  totalPoints: 80,
  completedPoints: 52,
  daysTotal: 14,
  daysElapsed: 10,
  forecastDate: '2026-06-24',
};

function daysAgoFrom(base: string, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const activeUsersFixture: MetricPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: daysAgoFrom('2026-06-25', 29 - i),
  value: 22 + Math.round(Math.sin(i * 0.35) * 8) + Math.round(i * 0.55),
}));

export const newUsersFixture: MetricPoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: daysAgoFrom('2026-06-25', 29 - i),
  value: 10 + Math.round(Math.sin(i * 0.4 + 1) * 4) + Math.round(i * 0.25),
}));

export const incidentFixtures: Incident[] = [
  {
    id: 'inc1',
    title: 'Падение конверсии: шаг «Ввод паспорта» −10%',
    description: 'Зафиксировано агентом «Метрический дозорный». Подозрительный PR #4521.',
    severity: 'critical',
    time: '2026-06-19T08:15:00Z',
  },
  {
    id: 'inc2',
    title: 'Задержка ответа API авторизации ×3',
    description: 'P95 latency выросла с 120ms до 380ms после деплоя 18.06.',
    severity: 'warning',
    time: '2026-06-18T23:40:00Z',
  },
  {
    id: 'inc3',
    title: 'Compliance: истекает срок пересмотра политики хранения данных',
    description: 'Дедлайн 25.06. Задача не взята в работу.',
    severity: 'warning',
    time: '2026-06-17T09:00:00Z',
  },
];
