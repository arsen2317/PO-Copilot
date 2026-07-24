import type { Task, TaskPriority, TaskStatus } from '../../data/types';

// ─── Shared task constants ──────────────────────────────────────────────────────

export const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Бэклог' },
  { id: 'todo', label: 'К выполнению' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'review', label: 'На ревью' },
  { id: 'done', label: 'Готово' },
];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Бэклог', todo: 'К выполнению', in_progress: 'В работе', review: 'На ревью', done: 'Готово',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: 'default', todo: 'geekblue', in_progress: 'blue', review: 'gold', done: 'success',
};

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий',
};

export const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614',
  u4: '#722ed1', u5: '#eb2f96', u6: '#13c2c2', u7: '#fa8c16',
};

export const PRIORITY_LEVEL: Record<TaskPriority, number> = {
  critical: 3,
  high:     2,
  medium:   1,
  low:      1,
};

export const PRIORITY_COLOR: Record<TaskPriority, string> = {
  critical: '#F5633A',
  high:     '#F5633A',
  medium:   '#F08040',
  low:      '#666',
};

export const BAR_HEIGHTS = [4, 7, 10];

// ICE score for backlog prioritization
export function calcICE(task: Task): number {
  const impactMap: Record<TaskPriority, number> = { critical: 10, high: 7, medium: 4, low: 2 };
  const impact = impactMap[task.priority];
  const riskBonus = task.riskLevel === 'critical' ? 1 : task.riskLevel === 'warning' ? 0.5 : 0;
  const totalCompliance = (task.compliance ?? []).length;
  const failedCompliance = (task.compliance ?? []).filter((c) => !c.passed).length;
  const confidence = totalCompliance === 0 ? 7 : failedCompliance === 0 ? 9 : Math.max(3, 9 - failedCompliance * 2);
  const sp = task.storyPoints;
  const ease = !sp ? 6 : sp <= 2 ? 9 : sp <= 3 ? 8 : sp <= 5 ? 7 : sp <= 8 ? 5 : 3;
  return Math.round(((impact + riskBonus) * confidence * ease) / 10);
}
