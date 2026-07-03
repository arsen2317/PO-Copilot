import { useMemo } from 'react';
import { Gantt } from 'wx-react-gantt';
import 'wx-react-gantt/dist/gantt.css';
import './timeline.css';
import { Skeleton } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Epic, Task, TaskPriority } from '../../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  critical: '#f5222d',
  high:     '#fa8c16',
  medium:   '#722ed1',
  low:      '#8c8c8c',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический',
  high:     'Высокий',
  medium:   'Средний',
  low:      'Низкий',
};

// Only task-name column; action col auto-added by lib with "expand" behaviour
const GANTT_COLUMNS = [
  { id: 'text', header: 'Задача', flexgrow: 1 },
];

const GANTT_SCALES = [
  { unit: 'month', step: 1, format: 'MMM yyyy' },
  { unit: 'week',  step: 1, format: "'Н'w" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

/** Gantt task extended with our domain fields that survive normalizeTask spread */
interface GTask {
  id: string;
  text: string;
  start: Date;
  end: Date;
  parent: string | number;
  type: 'task' | 'summary';
  progress: number;
  // domain extras — preserved by the lib's spread in normalizeTask
  _assigneeAvatar?: string | undefined;
  _assigneeName?: string | undefined;
  _priority?: TaskPriority | undefined;
  _storyPoints?: number | undefined;
  _deadline?: string | undefined;
  _epicColor?: string | undefined;
}

interface GLink {
  id: number;
  source: string;
  target: string;
  type: string;
}

// ─── Custom task bar ──────────────────────────────────────────────────────────

/** Rendered inside each task bar by wx-react-gantt via a Svelte bridge.
 *  Must be hook-free (no antd components, no useState/useEffect) — the bridge
 *  mounts this outside the main React fiber tree. */
function TaskBar({ data }: { data: GTask }) {
  if (data.type === 'summary') return null;

  const tooltipLines = [
    data.text,
    data._priority ? PRIORITY_LABEL[data._priority] : null,
    data._assigneeName ?? null,
    data._storyPoints !== undefined ? `${data._storyPoints} SP` : null,
    data._deadline
      ? new Date(data._deadline).toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })
      : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      title={tooltipLines}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        height: '100%',
        padding: '0 8px',
        overflow: 'hidden',
        cursor: 'grab',
      }}
    >
      {data._assigneeAvatar && (
        <img
          src={data._assigneeAvatar}
          alt=""
          style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
        />
      )}
      {data._priority && (
        <span style={{
          width: 7,
          height: 7,
          borderRadius: 2,
          background: PRIORITY_COLOR[data._priority],
          flexShrink: 0,
        }} />
      )}
      <span style={{
        fontSize: 11,
        color: '#fff',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        minWidth: 0,
      }}>
        {data.text}
      </span>
    </div>
  );
}

// ─── Data mapping ─────────────────────────────────────────────────────────────

function buildGanttData(tasks: Task[], epics: Epic[]) {
  const timedTasks = tasks.filter((t) => t.startDate && t.deadline);
  const timedIds = new Set(timedTasks.map((t) => t.id));

  const byEpic: Record<string, Task[]> = {};
  const noEpic: Task[] = [];

  for (const t of timedTasks) {
    if (t.epicId) {
      (byEpic[t.epicId] ??= []).push(t);
    } else {
      noEpic.push(t);
    }
  }

  const epicMap = Object.fromEntries(epics.map((e) => [e.id, e]));

  const gTasks: GTask[] = [];

  const statusProgress: Record<string, number> = {
    done: 100, review: 75, in_progress: 50, todo: 10, backlog: 0,
  };

  // Epic summary rows
  for (const [epicId, children] of Object.entries(byEpic)) {
    const epic = epicMap[epicId];
    if (!epic || !children.length) continue;

    const starts = children.map((t) => new Date(t.startDate!).getTime());
    const ends   = children.map((t) => new Date(t.deadline!).getTime());

    gTasks.push({
      id:       epic.id,
      text:     epic.name,
      start:    new Date(Math.min(...starts)),
      end:      new Date(Math.max(...ends)),
      parent:   0,
      type:     'summary',
      progress: 0,
      _epicColor: epic.color,
    });

    for (const t of children) {
      gTasks.push({
        id:              t.id,
        text:            t.title,
        start:           new Date(t.startDate!),
        end:             new Date(t.deadline!),
        parent:          epic.id,
        type:            'task',
        progress:        statusProgress[t.status] ?? 0,
        _assigneeAvatar: t.assignee?.avatar,
        _assigneeName:   t.assignee?.name,
        _priority:       t.priority,
        _storyPoints:    t.storyPoints,
        _deadline:       t.deadline,
        _epicColor:      epic.color,
      });
    }
  }

  // Tasks without epics
  for (const t of noEpic) {
    gTasks.push({
      id:              t.id,
      text:            t.title,
      start:           new Date(t.startDate!),
      end:             new Date(t.deadline!),
      parent:          0,
      type:            'task',
      progress:        statusProgress[t.status] ?? 0,
      _assigneeAvatar: t.assignee?.avatar,
      _assigneeName:   t.assignee?.name,
      _priority:       t.priority,
      _storyPoints:    t.storyPoints,
      _deadline:       t.deadline,
    });
  }

  // Links: task.dependencies means those must finish before this task starts
  const gLinks: GLink[] = [];
  let lid = 1;
  for (const t of timedTasks) {
    for (const depId of t.dependencies ?? []) {
      if (timedIds.has(depId)) {
        gLinks.push({ id: lid++, source: depId, target: t.id, type: 'e2s' });
      }
    }
  }

  return { gTasks, gLinks };
}

// ─── Main component ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function TimelineView({ bdr: _bdr }: { bdr: string }) {
  const { data: tasks = [], isLoading: tLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });
  const { data: epics = [], isLoading: eLoading } = useQuery({
    queryKey: ['epics'],
    queryFn: getEpics,
  });

  const { gTasks, gLinks } = useMemo(
    () => buildGanttData(tasks, epics),
    [tasks, epics],
  );

  if (tLoading || eLoading) {
    return (
      <div style={{ flex: 1, padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  return (
    // wx-willow-dark-theme activates the built-in dark CSS variable set;
    // gantt-dark-wrap overrides palette to match antd dark theme
    <div className="wx-willow-dark-theme gantt-dark-wrap" style={{ flex: 1, minHeight: 0 }}>
      <Gantt
        tasks={gTasks}
        links={gLinks}
        scales={GANTT_SCALES}
        columns={GANTT_COLUMNS}
        taskTemplate={TaskBar}
        cellHeight={42}
      />
    </div>
  );
}
