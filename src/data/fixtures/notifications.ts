import type { Notification } from '../types';

export const notificationFixtures: Notification[] = [
  {
    id: 'n1',
    type: 'incident',
    title: 'Критическое падение конверсии: −10% на шаге «Паспорт»',
    time: '2026-06-19T08:15:00Z',
    isRead: false,
  },
  {
    id: 'n2',
    type: 'agent',
    title: 'Агент «Метрический дозорный» создал задачу TASK-001',
    time: '2026-06-19T08:17:00Z',
    isRead: false,
  },
  {
    id: 'n3',
    type: 'mention',
    title: '@вы упомянуты в диалоге «Разбор инцидента с конверсией»',
    time: '2026-06-19T09:00:00Z',
    isRead: true,
  },
  {
    id: 'n4',
    type: 'service-result',
    title: 'ChatGPT завершил генерацию User Story для TASK-002',
    time: '2026-06-19T10:30:00Z',
    isRead: true,
  },
];
