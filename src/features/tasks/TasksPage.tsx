import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Select, Skeleton, Tag, theme, Tooltip, Typography } from 'antd';
import {
  ClockCircleOutlined,
  FilterOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../../data/api/tasks';
import type { Task, TaskStatus, TaskPriority } from '../../data/types';

const { useToken } = theme;

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Бэклог' },
  { id: 'todo', label: 'К выполнению' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'review', label: 'На ревью' },
  { id: 'done', label: 'Готово' },
];

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический',
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

// ─── Priority dot ─────────────────────────────────────────────────────────────

function PriorityDot({ priority, token }: { priority: TaskPriority; token: ReturnType<typeof useToken>['token'] }) {
  const color =
    priority === 'critical' ? token.colorError
    : priority === 'high' ? token.colorWarning
    : priority === 'medium' ? token.colorPrimary
    : token.colorTextQuaternary;
  return (
    <Tooltip title={PRIORITY_LABEL[priority]}>
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
        }}
      />
    </Tooltip>
  );
}

// ─── Avatar initials ──────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614',
  u4: '#722ed1', u5: '#eb2f96', u6: '#13c2c2', u7: '#fa8c16',
};

function UserAvatar({ user, size = 22 }: { user: { id: string; name: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Tooltip title={user.name}>
      <Avatar
        size={size}
        style={{ background: AVATAR_COLORS[user.id] ?? '#1668dc', fontSize: size * 0.45, fontWeight: 600, flexShrink: 0 }}
      >
        {initials}
      </Avatar>
    </Tooltip>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  isDragging = false,
  overlay = false,
}: {
  task: Task;
  isDragging?: boolean;
  overlay?: boolean;
}) {
  const { token } = useToken();
  const navigate = useNavigate();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id, disabled: overlay });

  const riskBorder =
    task.riskLevel === 'critical'
      ? `2px solid ${token.colorError}`
      : task.riskLevel === 'warning'
      ? `2px solid ${token.colorWarning}`
      : `1px solid #2D2E30`;

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]')) return;
    navigate(`/tasks/${task.id}`);
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div
        onClick={handleClick}
        style={{
          background: overlay ? '#1e1f22' : '#1a1b1e',
          border: riskBorder,
          borderRadius: 8,
          padding: '10px 12px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: overlay ? '0 8px 24px rgba(0,0,0,0.5)' : undefined,
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            data-drag-handle
            {...listeners}
            style={{
              cursor: 'grab',
              color: token.colorTextQuaternary,
              fontSize: 13,
              lineHeight: 1,
              flexShrink: 0,
              userSelect: 'none',
            }}
          >
            ⠿
          </span>
          <PriorityDot priority={task.priority} token={token} />
          <span style={{ fontSize: 11, color: token.colorTextTertiary, fontFamily: 'monospace' }}>{task.id}</span>
          {task.labels?.slice(0, 2).map((l) => (
            <Tag key={l} style={{ fontSize: 10, padding: '0 5px', margin: 0, lineHeight: '16px', border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>
              {l}
            </Tag>
          ))}
        </div>

        {/* Title */}
        <div style={{ fontSize: 13, fontWeight: 500, color: token.colorText, lineHeight: 1.4 }}>
          {task.title}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {task.storyPoints !== undefined && (
              <span style={{ fontSize: 11, color: token.colorTextTertiary, background: '#2D2E30', borderRadius: 4, padding: '1px 6px' }}>
                {task.storyPoints} SP
              </span>
            )}
            {task.deadline && (
              <span style={{ fontSize: 11, color: isOverdue ? token.colorError : token.colorTextTertiary, display: 'flex', alignItems: 'center', gap: 3 }}>
                <ClockCircleOutlined style={{ fontSize: 10 }} />
                {new Date(task.deadline).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
          {task.assignee && <UserAvatar user={task.assignee} />}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  label,
  tasks,
  bdr,
}: {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  bdr: string;
}) {
  const { token } = useToken();
  const dot =
    status === 'in_progress' ? token.colorPrimary
    : status === 'review' ? token.colorWarning
    : status === 'done' ? token.colorSuccess
    : token.colorTextQuaternary;

  return (
    <div
      style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        background: '#16171a',
        borderRadius: 10,
        border: bdr,
        overflow: 'hidden',
        maxHeight: '100%',
      }}
    >
      {/* Column header */}
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: bdr,
          flexShrink: 0,
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, display: 'inline-block' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{label}</span>
        <Badge
          count={tasks.length}
          style={{ background: '#2D2E30', color: token.colorTextSecondary, boxShadow: 'none', fontSize: 11 }}
        />
      </div>

      {/* Cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary, fontSize: 12, padding: '20px 0' }}>
            Нет задач
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { token } = useToken();
  const BDR = `1px solid ${token.colorBorderSecondary}`;
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);

  const { data: fetchedTasks, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: getTasks,
  });

  const tasks = localTasks ?? fetchedTasks ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const filtered = tasks.filter((t) => {
    if (assigneeFilter && t.assignee?.id !== assigneeFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const byStatus = (status: TaskStatus) => filtered.filter((t) => t.status === status);

  // Gather unique assignees for filter
  const assignees = Array.from(
    new Map(tasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!])).values(),
  );

  const handleDragStart = (e: DragStartEvent) => {
    const task = tasks.find((t) => t.id === e.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;

    const draggedId = String(active.id);
    const overId = String(over.id);

    // Determine target column
    const targetColumn = COLUMNS.find((c) => c.id === overId);
    if (targetColumn) {
      setLocalTasks(
        (tasks).map((t) => t.id === draggedId ? { ...t, status: targetColumn.id } : t),
      );
      return;
    }

    // Dropped over another card
    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;
    if (overTask.status !== tasks.find((t) => t.id === draggedId)?.status) {
      setLocalTasks(
        tasks.map((t) => t.id === draggedId ? { ...t, status: overTask.status } : t),
      );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
            Задачи
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            Спринт 14 · {tasks.length} задач
          </Typography.Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip title="Помощь">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary }}>
              <QuestionCircleOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <Tooltip title="Копировать ссылку">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary }}>
              <LinkOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <Button
            icon={<PlusOutlined />}
            type="primary"
            size="small"
            style={{ fontSize: 13, height: 30 }}
          >
            Создать задачу
          </Button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexShrink: 0 }}>
        <FilterOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
        <Select
          placeholder={<><UserOutlined /> Исполнитель</>}
          allowClear
          size="small"
          style={{ width: 160 }}
          value={assigneeFilter}
          onChange={setAssigneeFilter}
          options={assignees.map((u) => ({ value: u.id, label: u.name }))}
        />
        <Select
          placeholder="Приоритет"
          allowClear
          size="small"
          style={{ width: 140 }}
          value={priorityFilter}
          onChange={setPriorityFilter}
          options={[
            { value: 'critical', label: '● Критический' },
            { value: 'high', label: '● Высокий' },
            { value: 'medium', label: '● Средний' },
            { value: 'low', label: '● Низкий' },
          ]}
        />
        {(assigneeFilter || priorityFilter) && (
          <Button
            size="small"
            type="text"
            style={{ color: token.colorTextTertiary, fontSize: 12 }}
            onClick={() => { setAssigneeFilter(null); setPriorityFilter(null); }}
          >
            Сбросить
          </Button>
        )}
      </div>

      {/* ── Kanban board ── */}
      {isLoading ? (
        <div style={{ display: 'flex', gap: 12 }}>
          {COLUMNS.map((c) => (
            <Skeleton key={c.id} active style={{ width: 260 }} />
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              flex: 1,
              minHeight: 0,
              overflowX: 'auto',
              overflowY: 'hidden',
              paddingBottom: 4,
            }}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                status={col.id}
                label={col.label}
                tasks={byStatus(col.id)}
                bdr={BDR}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} overlay />}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
