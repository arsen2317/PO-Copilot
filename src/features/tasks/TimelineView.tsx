import { useMemo, useState, useEffect } from 'react';
import { Gantt, ViewMode } from 'gantt-task-react';
import type { Task as GanttTask } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
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
  low:      '#52c41a',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический',
  high:     'Высокий',
  medium:   'Средний',
  low:      'Низкий',
};

const STATUS_PROGRESS: Record<string, number> = {
  done: 100, review: 75, in_progress: 50, todo: 10, backlog: 0,
};

// ─── Custom left-panel components ────────────────────────────────────────────

function TaskListHeader({
  headerHeight,
  rowWidth,
}: {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}) {
  return (
    <div
      style={{
        height: headerHeight,
        width: rowWidth,
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        background: '#16171a',
        borderRight: '1px solid #2D2E30',
        borderBottom: '1px solid #2D2E30',
        color: 'rgba(255,255,255,0.45)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
      }}
    >
      Задача
    </div>
  );
}

function TaskListTable({
  rowHeight,
  rowWidth,
  tasks,
  selectedTaskId,
  setSelectedTask,
  onExpanderClick,
}: {
  rowHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
  locale: string;
  tasks: GanttTask[];
  selectedTaskId: string;
  setSelectedTask: (id: string) => void;
  onExpanderClick: (task: GanttTask) => void;
}) {
  return (
    <div style={{ background: '#16171a', borderRight: '1px solid #2D2E30' }}>
      {tasks.map(task => (
        <div
          key={task.id}
          style={{
            height: rowHeight,
            width: rowWidth,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            cursor: 'pointer',
            background: task.id === selectedTaskId ? 'rgba(22,104,220,0.15)' : 'transparent',
            borderBottom: '1px solid #2D2E30',
            gap: 6,
          }}
          onClick={() => setSelectedTask(task.id)}
        >
          {task.type === 'project' ? (
            <span
              style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', cursor: 'pointer', flexShrink: 0, width: 12 }}
              onClick={e => { e.stopPropagation(); onExpanderClick(task); }}
            >
              {task.hideChildren ? '▶' : '▼'}
            </span>
          ) : (
            <span style={{ width: 12, flexShrink: 0 }} />
          )}
          <span
            style={{
              fontSize: 12,
              color: task.type === 'project' ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.65)',
              fontWeight: task.type === 'project' ? 600 : 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {task.name}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function TooltipContent({
  task,
}: {
  task: GanttTask;
  fontSize: string;
  fontFamily: string;
}) {
  if (task.type === 'project') return null;

  // Pull domain metadata stored in task.styles (we piggyback a non-standard field)
  const meta = (task as GanttTask & { _meta?: TaskMeta })._meta;

  return (
    <div
      style={{
        background: '#1a1b1e',
        border: '1px solid #2D2E30',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 220,
        maxWidth: 280,
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {meta?.priority && (
          <span
            style={{
              width: 8, height: 8, borderRadius: 2,
              background: PRIORITY_COLOR[meta.priority],
              flexShrink: 0,
            }}
          />
        )}
        <span style={{ fontSize: 10, color: '#8c8c8c', fontFamily: 'monospace' }}>{task.id}</span>
        {meta?.priority && (
          <span style={{ fontSize: 10, color: '#8c8c8c' }}>{PRIORITY_LABEL[meta.priority]}</span>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', lineHeight: 1.4, marginBottom: 8 }}>
        {task.name}
      </div>

      <div style={{ fontSize: 11, color: '#595959' }}>
        {task.start.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
        {' — '}
        {task.end.toLocaleDateString('ru', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>

      {(meta?.storyPoints !== undefined || meta?.assigneeName) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {meta?.storyPoints !== undefined && (
            <span style={{
              fontSize: 11, color: '#8c8c8c',
              background: '#2D2E30', borderRadius: 4, padding: '1px 6px',
            }}>
              {meta.storyPoints} SP
            </span>
          )}
          {meta?.assigneeAvatar && (
            <img
              src={meta.assigneeAvatar}
              alt=""
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Domain metadata stored alongside each GanttTask ─────────────────────────

interface TaskMeta {
  priority?: TaskPriority;
  assigneeName?: string;
  assigneeAvatar?: string;
  storyPoints?: number;
}

type GanttTaskWithMeta = GanttTask & { _meta?: TaskMeta };

// ─── Data mapping ─────────────────────────────────────────────────────────────

function buildGanttTasks(tasks: Task[], epics: Epic[]): GanttTaskWithMeta[] {
  const timedTasks = tasks.filter(t => t.startDate && t.deadline);
  const timedIds = new Set(timedTasks.map(t => t.id));
  const epicMap = Object.fromEntries(epics.map(e => [e.id, e]));

  const byEpic: Record<string, Task[]> = {};
  const noEpic: Task[] = [];

  for (const t of timedTasks) {
    if (t.epicId) (byEpic[t.epicId] ??= []).push(t);
    else noEpic.push(t);
  }

  const result: GanttTaskWithMeta[] = [];

  for (const [epicId, children] of Object.entries(byEpic)) {
    const epic = epicMap[epicId];
    if (!epic || !children.length) continue;

    const starts = children.map(t => new Date(t.startDate!).getTime());
    const ends   = children.map(t => new Date(t.deadline!).getTime());

    result.push({
      id:    epic.id,
      type:  'project',
      name:  epic.name,
      start: new Date(Math.min(...starts)),
      end:   new Date(Math.max(...ends)),
      progress: 0,
      hideChildren: false,
      styles: {
        backgroundColor:         epic.color + '30',
        backgroundSelectedColor: epic.color + '50',
        progressColor:           epic.color,
        progressSelectedColor:   epic.color,
      },
    });

    for (const t of children) {
      const color = PRIORITY_COLOR[t.priority];
      result.push({
        id:           t.id,
        type:         'task',
        name:         t.title,
        start:        new Date(t.startDate!),
        end:          new Date(t.deadline!),
        progress:     STATUS_PROGRESS[t.status] ?? 0,
        project:      epic.id,
        dependencies: (t.dependencies ?? []).filter(id => timedIds.has(id)),
        styles: {
          backgroundColor:         color + 'bb',
          backgroundSelectedColor: color,
          progressColor:           color + 'dd',
          progressSelectedColor:   color,
        },
        _meta: {
          priority:      t.priority,
          assigneeName:  t.assignee?.name,
          assigneeAvatar: t.assignee?.avatar,
          storyPoints:   t.storyPoints,
        },
      } as GanttTaskWithMeta);
    }
  }

  for (const t of noEpic) {
    const color = PRIORITY_COLOR[t.priority];
    result.push({
      id:           t.id,
      type:         'task',
      name:         t.title,
      start:        new Date(t.startDate!),
      end:          new Date(t.deadline!),
      progress:     STATUS_PROGRESS[t.status] ?? 0,
      dependencies: (t.dependencies ?? []).filter(id => timedIds.has(id)),
      styles: {
        backgroundColor:         color + 'bb',
        backgroundSelectedColor: color,
        progressColor:           color + 'dd',
        progressSelectedColor:   color,
      },
      _meta: {
        priority:       t.priority,
        assigneeName:   t.assignee?.name,
        assigneeAvatar: t.assignee?.avatar,
        storyPoints:    t.storyPoints,
      },
    } as GanttTaskWithMeta);
  }

  return result;
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

  const baseTasks = useMemo(() => buildGanttTasks(tasks, epics), [tasks, epics]);
  const [ganttTasks, setGanttTasks] = useState<GanttTaskWithMeta[]>([]);

  useEffect(() => { setGanttTasks(baseTasks); }, [baseTasks]);

  const handleExpanderClick = (task: GanttTask) => {
    setGanttTasks(prev =>
      prev.map(t => t.id === task.id ? { ...t, hideChildren: !t.hideChildren } : t),
    );
  };

  const handleDateChange = (task: GanttTask) => {
    setGanttTasks(prev => prev.map(t => t.id === task.id ? { ...t, ...task } : t));
  };

  if (tLoading || eLoading) {
    return (
      <div style={{ flex: 1, padding: 24 }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!ganttTasks.length) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)' }}>
        Нет задач с датами для отображения
      </div>
    );
  }

  return (
    <div className="gantt-dark-wrap" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Month}
        locale="ru"
        onExpanderClick={handleExpanderClick}
        onDateChange={handleDateChange}
        columnWidth={160}
        rowHeight={42}
        headerHeight={50}
        barCornerRadius={4}
        barFill={62}
        listCellWidth="240px"
        arrowColor="#595959"
        todayColor="rgba(22,104,220,0.15)"
        TooltipContent={TooltipContent}
        TaskListHeader={TaskListHeader}
        TaskListTable={TaskListTable}
      />
    </div>
  );
}
