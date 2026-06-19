import type { Task } from '../types';

export const taskFixtures: Task[] = [
  {
    id: 'TASK-001',
    title: 'Исправить падение конверсии на шаге «Ввод паспорта»',
    status: 'in_progress',
    priority: 'critical',
    riskLevel: 'critical',
    deadline: '2026-06-25',
    description: 'Конверсия упала на 10% после PR #4521.',
    assignee: { id: 'u1', name: 'Анна Смирнова', role: 'developer' },
  },
  {
    id: 'TASK-002',
    title: 'Провести груминг бэклога Q3',
    status: 'todo',
    priority: 'high',
    riskLevel: 'warning',
    deadline: '2026-06-30',
    assignee: { id: 'u2', name: 'Иван Петров', role: 'product_manager' },
  },
  {
    id: 'TASK-003',
    title: 'Обновить дизайн-систему до antd v6-beta',
    status: 'backlog',
    priority: 'medium',
    riskLevel: 'ok',
    assignee: { id: 'u3', name: 'Мария Ковалёва', role: 'designer' },
  },
  {
    id: 'TASK-004',
    title: 'Написать тест-кейсы для онбординга',
    status: 'done',
    priority: 'low',
    riskLevel: 'ok',
    assignee: { id: 'u1', name: 'Анна Смирнова', role: 'developer' },
  },
];
