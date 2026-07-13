import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Badge, Button, message, Select, Skeleton, Table, Tag, theme, Tooltip, Typography,
} from 'antd';
import {
  AppstoreOutlined,
  BarsOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  FilterOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RobotOutlined,
  ScheduleOutlined,
  SortAscendingOutlined,
  UserOutlined,
} from '../../components/icons';
import TimelineView from './TimelineView';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { getTasks } from '../../data/api/tasks';
import { useUIStore } from '../../store/uiStore';
import type { Task, TaskPriority, TaskStatus } from '../../data/types';

const { useToken } = theme;

// ─── Shared constants ─────────────────────────────────────────────────────────

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'backlog', label: 'Бэклог' },
  { id: 'todo', label: 'К выполнению' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'review', label: 'На ревью' },
  { id: 'done', label: 'Готово' },
];

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Бэклог', todo: 'К выполнению', in_progress: 'В работе', review: 'На ревью', done: 'Готово',
};

const STATUS_COLOR: Record<TaskStatus, string> = {
  backlog: 'default', todo: 'geekblue', in_progress: 'blue', review: 'gold', done: 'success',
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий',
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614',
  u4: '#722ed1', u5: '#eb2f96', u6: '#13c2c2', u7: '#fa8c16',
};

function UserAvatar({ user, size = 22 }: { user: { id: string; name: string; avatar?: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <Tooltip title={user.name}>
      {user.avatar
        ? <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />
        : <div style={{ width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[user.id] ?? '#1668dc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.42, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
      }
    </Tooltip>
  );
}

const PRIORITY_CHEVRON: Record<TaskPriority, { count: number; color: string }> = {
  critical: { count: 3, color: '#F5633A' },
  high:     { count: 2, color: '#F5633A' },
  medium:   { count: 1, color: '#F08040' },
  low:      { count: 1, color: '#666' },
};

function PriorityChevrons({ priority }: { priority: TaskPriority }) {
  const { count, color } = PRIORITY_CHEVRON[priority];
  return (
    <Tooltip title={PRIORITY_LABEL[priority]}>
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, flexShrink: 0, lineHeight: 1 }}>
        {Array.from({ length: count }).map((_, i) => (
          <svg key={i} width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 5L5 1L9 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ))}
      </span>
    </Tooltip>
  );
}

// ICE score for backlog prioritization
function calcICE(task: Task): number {
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

// ─── Kanban card ──────────────────────────────────────────────────────────────

function KanbanCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { token } = useToken();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id, disabled: overlay,
  });
  const riskBorder = task.riskLevel === 'critical' ? `2px solid ${token.colorError}`
    : task.riskLevel === 'warning' ? `2px solid ${token.colorWarning}`
    : `1px solid #2D2E30`;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done';

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: overlay ? 1 : 1 }} {...attributes}>
      <div
        onClick={(e) => { if ((e.target as HTMLElement).closest('[data-drag]')) return; navigate(`/tasks/${task.id}`); }}
        style={{
          background: overlay ? '#1e1f22' : '#1a1b1e', border: riskBorder, borderRadius: 8,
          padding: '10px 12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
          boxShadow: overlay ? '0 8px 24px rgba(0,0,0,0.5)' : undefined,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span data-drag {...listeners} style={{ cursor: 'grab', color: token.colorTextQuaternary, fontSize: 13, userSelect: 'none' }}>⠿</span>
          <PriorityChevrons priority={task.priority} />
          <span style={{ fontSize: 11, color: token.colorTextTertiary, fontFamily: 'monospace' }}>{task.id}</span>
          {task.labels?.slice(0, 1).map((l) => (
            <Tag key={l} style={{ fontSize: 10, padding: '0 5px', margin: 0, lineHeight: '16px', border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>
              {l}
            </Tag>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: token.colorText, lineHeight: 1.4 }}>{task.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {task.storyPoints !== undefined && (
              <span style={{ fontSize: 11, color: token.colorTextTertiary, background: '#2D2E30', borderRadius: 4, padding: '1px 6px' }}>{task.storyPoints} SP</span>
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

const COLUMN_STYLE: Record<TaskStatus, { bg: string; borderColor: string }> = {
  backlog:     { bg: '#16171a', borderColor: '' },
  todo:        { bg: '#0d1629', borderColor: 'rgba(56, 100, 220, 0.4)' },
  in_progress: { bg: '#091d3a', borderColor: 'rgba(22, 119, 255, 0.35)' },
  review:      { bg: '#170d2c', borderColor: 'rgba(114, 46, 209, 0.4)' },
  done:        { bg: '#0c1f14', borderColor: 'rgba(82, 196, 26, 0.3)' },
};

function KanbanColumn({ status, label, tasks, bdr }: { status: TaskStatus; label: string; tasks: Task[]; bdr: string }) {
  const { token } = useToken();
  const { bg, borderColor } = COLUMN_STYLE[status];
  const colBorder = borderColor ? `1px solid ${borderColor}` : bdr;

  return (
    <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', background: bg, borderRadius: 10, border: colBorder, overflow: 'hidden', maxHeight: '100%' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: colBorder, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{label}</span>
        <Badge count={tasks.length} style={{ background: '#2D2E30', color: token.colorTextSecondary, boxShadow: 'none', fontSize: 11 }} />
      </div>
      <div className="content-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <KanbanCard key={task.id} task={task} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary, fontSize: 12, padding: '20px 0' }}>Нет задач</div>
        )}
      </div>
    </div>
  );
}

// ─── Kanban view ──────────────────────────────────────────────────────────────

function KanbanView({ tasks, isLoading, bdr }: { tasks: Task[]; isLoading: boolean; bdr: string }) {
  const [localTasks, setLocalTasks] = useState<Task[] | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const all = localTasks ?? tasks;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const byStatus = (s: TaskStatus) => all.filter((t) => t.status === s);

  const handleDragStart = (e: DragStartEvent) => setActiveTask(all.find((t) => t.id === e.active.id) ?? null);
  const handleDragEnd = (e: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = e;
    if (!over) return;
    const targetCol = COLUMNS.find((c) => c.id === over.id);
    const overTask = all.find((t) => t.id === over.id);
    const newStatus = targetCol?.id ?? overTask?.status;
    if (newStatus) setLocalTasks(all.map((t) => t.id === active.id ? { ...t, status: newStatus } : t));
  };

  if (isLoading) return <div style={{ display: 'flex', gap: 10 }}>{COLUMNS.map((c) => <Skeleton key={c.id} active style={{ flex: 1 }} />)}</div>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} status={col.id} label={col.label} tasks={byStatus(col.id)} bdr={bdr} />
        ))}
      </div>
      <DragOverlay>{activeTask && <KanbanCard task={activeTask} overlay />}</DragOverlay>
    </DndContext>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────

function ListView({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
  const { token } = useToken();
  const navigate = useNavigate();

  type Col = { title: React.ReactNode; key: string; width?: number; sorter?: (a: Task, b: Task) => number; render: (_: unknown, t: Task) => React.ReactNode };

  const columns: Col[] = [
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ID</span>,
      key: 'id', width: 90,
      sorter: (a, b) => a.id.localeCompare(b.id),
      render: (_, t) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: token.colorPrimary, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>{t.id}</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ЗАГОЛОВОК</span>,
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (_, t) => <span style={{ fontSize: 13, color: token.colorText, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${t.id}`)}>{t.title}</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>СТАТУС</span>,
      key: 'status', width: 130,
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_, t) => <Tag color={STATUS_COLOR[t.status]} style={{ fontSize: 11 }}>{STATUS_LABEL[t.status]}</Tag>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ИСПОЛНИТЕЛЬ</span>,
      key: 'assignee', width: 150,
      render: (_, t) => t.assignee
        ? <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><UserAvatar user={t.assignee} size={20} /><span style={{ fontSize: 12, color: token.colorText }}>{t.assignee.name.split(' ')[0]}</span></div>
        : <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ПРИОРИТЕТ</span>,
      key: 'priority', width: 120,
      sorter: (a, b) => { const o: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }; return o[a.priority] - o[b.priority]; },
      render: (_, t) => <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority={t.priority} /><span style={{ fontSize: 12, color: token.colorText }}>{PRIORITY_LABEL[t.priority]}</span></div>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>МЕТРИКИ</span>,
      key: 'metrics', width: 150,
      render: (_, t) => t.relatedMetricIds?.length
        ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {t.relatedMetricIds.slice(0, 2).map((m) => <Tag key={m} style={{ fontSize: 10, padding: '0 5px', margin: 0, border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>{m}</Tag>)}
            {t.relatedMetricIds.length > 2 && <span style={{ fontSize: 11, color: token.colorTextTertiary }}>+{t.relatedMetricIds.length - 2}</span>}
          </div>
        : <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>,
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ВЛИЯНИЕ</span>,
      key: 'risk', width: 110,
      sorter: (a, b) => { const o: Record<string, number> = { critical: 0, warning: 1, ok: 2 }; return (o[a.riskLevel] ?? 3) - (o[b.riskLevel] ?? 3); },
      render: (_, t) => {
        const rc = t.riskLevel === 'critical' ? token.colorError : t.riskLevel === 'warning' ? token.colorWarning : token.colorSuccess;
        const label = t.riskLevel === 'critical' ? 'Критично' : t.riskLevel === 'warning' ? 'Высокое' : 'Низкое';
        return <span style={{ fontSize: 12, color: rc, border: t.riskLevel !== 'ok' ? `1px solid ${rc}` : undefined, borderRadius: 4, padding: t.riskLevel !== 'ok' ? '1px 7px' : undefined }}>{label}</span>;
      },
    },
    {
      title: <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ДЕДЛАЙН</span>,
      key: 'deadline', width: 110,
      sorter: (a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''),
      render: (_, t) => {
        if (!t.deadline) return <span style={{ color: token.colorTextQuaternary, fontSize: 12 }}>—</span>;
        const overdue = new Date(t.deadline) < new Date() && t.status !== 'done';
        return <span style={{ fontSize: 12, color: overdue ? token.colorError : token.colorText, display: 'flex', alignItems: 'center', gap: 4 }}><ClockCircleOutlined style={{ fontSize: 11 }} />{new Date(t.deadline).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>;
      },
    },
  ];

  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
      <Table
        dataSource={tasks}
        columns={columns}
        rowKey="id"
        size="small"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 'max-content', y: 'calc(100vh - 260px)' }}
        style={{ minWidth: 700 }}
      />
    </div>
  );
}

// ─── Backlog view ─────────────────────────────────────────────────────────────

function BacklogRow({ task, rank, isDragging }: { task: Task; rank: number; isDragging?: boolean }) {
  const { token } = useToken();
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const ice = calcICE(task);
  const iceColor = ice >= 60 ? token.colorSuccess : ice >= 30 ? token.colorWarning : token.colorError;
  const failedCompliance = (task.compliance ?? []).filter((c) => !c.passed).length;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          background: isDragging ? '#1e1f22' : 'transparent',
          cursor: 'pointer',
        }}
        onClick={(e) => { if ((e.target as HTMLElement).closest('[data-drag]')) return; navigate(`/tasks/${task.id}`); }}
      >
        <span style={{ fontSize: 13, color: token.colorTextQuaternary, width: 20, textAlign: 'center', flexShrink: 0 }}>{rank}</span>
        <span data-drag {...listeners} style={{ cursor: 'grab', color: token.colorTextQuaternary, fontSize: 14, flexShrink: 0, userSelect: 'none' }}>⠿</span>

        {/* ICE score */}
        <div style={{ width: 42, flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: iceColor, lineHeight: 1 }}>{ice}</div>
          <div style={{ fontSize: 10, color: token.colorTextQuaternary }}>ICE</div>
        </div>

        {/* Priority + title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <PriorityChevrons priority={task.priority} />
            <span style={{ fontSize: 11, color: token.colorTextTertiary, fontFamily: 'monospace' }}>{task.id}</span>
            {task.labels?.slice(0, 2).map((l) => (
              <Tag key={l} style={{ fontSize: 10, padding: '0 5px', margin: 0, lineHeight: '16px', border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>{l}</Tag>
            ))}
          </div>
          <div style={{ fontSize: 13, color: token.colorText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
        </div>

        {/* Compliance warning */}
        {failedCompliance > 0 && (
          <Tooltip title={`${failedCompliance} нерешённых compliance-требований`}>
            <Tag color="warning" style={{ fontSize: 11, flexShrink: 0 }}>Compliance ⚠</Tag>
          </Tooltip>
        )}

        {/* Assignee + SP */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {task.storyPoints !== undefined && (
            <span style={{ fontSize: 11, color: token.colorTextTertiary, background: '#2D2E30', borderRadius: 4, padding: '1px 6px' }}>{task.storyPoints} SP</span>
          )}
          {task.assignee && <UserAvatar user={task.assignee} size={22} />}
        </div>
      </div>
    </div>
  );
}

function BacklogView({ tasks, isLoading, bdr }: { tasks: Task[]; isLoading: boolean; bdr: string }) {
  const { token } = useToken();
  const backlogTasks = tasks.filter((t) => t.status === 'backlog' || t.status === 'todo');
  const [ordered, setOrdered] = useState<string[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgApi, contextHolder] = message.useMessage();

  const ids = ordered ?? [...backlogTasks].sort((a, b) => calcICE(b) - calcICE(a)).map((t) => t.id);
  const sorted = ids.map((id) => backlogTasks.find((t) => t.id === id)).filter(Boolean) as Task[];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ids.indexOf(String(active.id));
    const newIdx = ids.indexOf(String(over.id));
    const newIds = arrayMove(ids, oldIdx, newIdx);

    // Compliance warning: moving a task with unresolved compliance higher
    const moved = backlogTasks.find((t) => t.id === active.id);
    const failedCompliance = (moved?.compliance ?? []).filter((c) => !c.passed).length;
    if (failedCompliance > 0 && newIdx < oldIdx) {
      msgApi.warning({
        content: `Ассистент: задача ${moved?.id} содержит ${failedCompliance} нерешённых compliance-требований. Убедитесь, что риски учтены перед повышением приоритета.`,
        duration: 5,
      });
    }
    setOrdered(newIds);
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  return (
    <>
      {contextHolder}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SortAscendingOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
            Отсортировано по ICE-скору (Impact × Confidence × Ease). Перетащите для ручной расстановки.
          </span>
        </div>
      </div>

      {/* Table header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 14px', borderBottom: bdr }}>
        <span style={{ width: 20, fontSize: 11, color: token.colorTextQuaternary }}>#</span>
        <span style={{ width: 14, display: 'inline-block' }} />
        <span style={{ width: 42, fontSize: 11, color: token.colorTextTertiary, textAlign: 'center' }}>ICE</span>
        <span style={{ flex: 1, fontSize: 11, color: token.colorTextTertiary }}>ЗАДАЧА</span>
        <span style={{ fontSize: 11, color: token.colorTextTertiary }}>ИСПОЛНИТЕЛЬ</span>
      </div>

      <div style={{ background: '#16171a', borderRadius: 10, border: bdr, overflow: 'hidden' }}>
        <DndContext sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {sorted.map((task, i) => (
              <BacklogRow key={task.id} task={task} rank={i + 1} isDragging={task.id === activeId} />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId && (() => {
              const t = sorted.find((x) => x.id === activeId);
              return t ? <BacklogRow task={t} rank={0} isDragging /> : null;
            })()}
          </DragOverlay>
        </DndContext>
        {sorted.length === 0 && (
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary, fontSize: 13, padding: 32 }}>
            Нет задач в бэклоге или очереди
          </div>
        )}
      </div>
    </>
  );
}

// ─── Drafts view ──────────────────────────────────────────────────────────────

function DraftsView({ bdr, highlightId }: { bdr: string; highlightId?: string }) {
  const { token } = useToken();
  const drafts = useUIStore((s) => s.taskDrafts);
  const removeTaskDraft = useUIStore((s) => s.removeTaskDraft);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  if (drafts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: token.colorTextTertiary }}>
        <RobotOutlined style={{ fontSize: 32, marginBottom: 12, display: 'block' }} />
        <div style={{ fontSize: 14, marginBottom: 6 }}>Черновиков пока нет</div>
        <div style={{ fontSize: 12 }}>
          Попроси агента «Постановщик задач» создать задачу — она появится здесь
        </div>
      </div>
    );
  }

  const priorityColor = (p: string) => {
    const m: Record<string, string> = { P0: 'error', P1: 'warning', P2: 'processing', P3: 'default' };
    return m[p] ?? 'default';
  };

  const typeColor = (t: string) => {
    const m: Record<string, string> = { Story: '#49aa19', Bug: '#dc4446', Task: '#1668dc', Spike: '#722ed1' };
    return m[t] ?? '#9B9C9E';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {drafts.map((draft) => {
        const isHighlighted = draft.id === highlightId;
        return (
        <div
          key={draft.id}
          ref={isHighlighted ? highlightRef : null}
          style={{ background: '#16171a', border: isHighlighted ? '1px solid rgba(74,130,247,0.6)' : bdr, borderRadius: 10, padding: '16px 18px', transition: 'border-color 0.3s', boxShadow: isHighlighted ? '0 0 0 3px rgba(74,130,247,0.15)' : 'none' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Tag color={priorityColor(draft.priority)} style={{ fontSize: 11, margin: 0 }}>{draft.priority}</Tag>
                <span style={{ fontSize: 12, fontWeight: 600, color: typeColor(draft.type), border: `1px solid ${typeColor(draft.type)}40`, borderRadius: 4, padding: '0 6px', lineHeight: '18px' }}>
                  {draft.type}
                </span>
                {draft.storyPoints && (
                  <span style={{ fontSize: 11, color: token.colorTextTertiary, background: '#2D2E30', borderRadius: 4, padding: '0 6px' }}>{draft.storyPoints} SP</span>
                )}
                {draft.labels?.map((l) => (
                  <Tag key={l} style={{ fontSize: 10, padding: '0 5px', margin: 0, border: '1px solid #2D2E30', background: 'transparent', color: token.colorTextSecondary }}>{l}</Tag>
                ))}
                <span style={{ fontSize: 11, color: token.colorTextQuaternary, marginLeft: 'auto' }}>
                  {new Date(draft.createdAt).toLocaleDateString('ru', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: token.colorText }}>{draft.title}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <Tooltip title="Принять как задачу">
                <Button size="small" type="primary" icon={<CheckOutlined />} style={{ fontSize: 12 }}>
                  Принять
                </Button>
              </Tooltip>
              <Tooltip title="Удалить черновик">
                <Button size="small" danger icon={<DeleteOutlined />} type="text" onClick={() => removeTaskDraft(draft.id)} />
              </Tooltip>
            </div>
          </div>

          {/* Description */}
          {draft.description && (
            <div style={{ fontSize: 13, color: token.colorTextSecondary, lineHeight: 1.6, marginBottom: 12 }}>{draft.description}</div>
          )}

          {/* Criteria */}
          {draft.criteria.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>
                Критерии приёмки
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {draft.criteria.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: token.colorText, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: token.colorTextQuaternary, flexShrink: 0 }}>◻</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance notes */}
          {draft.complianceNotes && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: `${token.colorWarning}18`, border: `1px solid ${token.colorWarning}40`, borderRadius: 6, fontSize: 12, color: token.colorText }}>
              <span style={{ fontWeight: 600, color: token.colorWarning }}>Compliance: </span>
              {draft.complianceNotes}
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = 'kanban' | 'list' | 'backlog' | 'timeline' | 'drafts';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'kanban', label: 'Канбан', icon: <AppstoreOutlined /> },
  { id: 'list', label: 'Список', icon: <BarsOutlined /> },
  { id: 'backlog', label: 'Бэклог', icon: <SortAscendingOutlined /> },
  { id: 'timeline', label: 'Таймлайн', icon: <ScheduleOutlined /> },
  { id: 'drafts', label: 'Черновики', icon: <RobotOutlined /> },
];

export default function TasksPage() {
  const { token } = useToken();
  const BDR = `1px solid ${token.colorBorderSecondary}`;
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const tab = searchParams.get('tab');
    return (['drafts', 'kanban', 'list', 'backlog', 'timeline'] as const).includes(tab as TabId) ? tab as TabId : 'kanban';
  });
  const [highlightDraftId] = useState<string | null>(() => searchParams.get('draft'));
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const draftsCount = useUIStore((s) => s.taskDrafts.length);

  const { data: fetchedTasks = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });

  const filtered = fetchedTasks.filter((t) => {
    if (assigneeFilter && t.assignee?.id !== assigneeFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    return true;
  });

  const assignees = Array.from(
    new Map(fetchedTasks.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!])).values(),
  );

  const showFilters = activeTab !== 'drafts' && activeTab !== 'timeline';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}>
            Задачи
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            Спринт 14 · {fetchedTasks.length} задач
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
          <Button icon={<PlusOutlined />} type="primary" size="small" style={{ fontSize: 13, height: 30 }}>
            Создать задачу
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: BDR, marginBottom: 14, flexShrink: 0, gap: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'none', border: 'none',
                borderBottom: isActive ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                padding: '8px 16px', cursor: 'pointer',
                color: isActive ? token.colorPrimary : token.colorTextTertiary,
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                marginBottom: -1, transition: 'color 0.15s',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'drafts' && draftsCount > 0 && (
                <Badge count={draftsCount} size="small" style={{ background: token.colorPrimary, boxShadow: 'none' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Filters (hidden on Drafts tab) ── */}
      {showFilters && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
          <FilterOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
          <Select
            placeholder={<><UserOutlined /> Исполнитель</>}
            allowClear style={{ width: 170 }}
            value={assigneeFilter} onChange={setAssigneeFilter}
            options={assignees.map((u) => ({ value: u.id, label: u.name }))}
          />
          <Select
            placeholder="Приоритет"
            allowClear style={{ width: 155 }}
            value={priorityFilter} onChange={setPriorityFilter}
            options={[
              { value: 'critical', label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="critical" />{PRIORITY_LABEL.critical}</span> },
              { value: 'high',     label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="high" />{PRIORITY_LABEL.high}</span> },
              { value: 'medium',   label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="medium" />{PRIORITY_LABEL.medium}</span> },
              { value: 'low',      label: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><PriorityChevrons priority="low" />{PRIORITY_LABEL.low}</span> },
            ]}
          />
          {(assigneeFilter || priorityFilter) && (
            <Button size="small" type="text" icon={<CloseOutlined />}
              style={{ color: token.colorTextTertiary, fontSize: 12 }}
              onClick={() => { setAssigneeFilter(null); setPriorityFilter(null); }}
            >
              Сбросить
            </Button>
          )}
        </div>
      )}

      {/* ── Tab content ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'kanban' && <KanbanView tasks={filtered} isLoading={isLoading} bdr={BDR} />}
        {activeTab === 'list' && <ListView tasks={filtered} isLoading={isLoading} />}
        {activeTab === 'backlog' && <BacklogView tasks={filtered} isLoading={isLoading} bdr={BDR} />}
        {activeTab === 'timeline' && <TimelineView bdr={BDR} />}
        {activeTab === 'drafts' && <div className="content-scroll" style={{ flex: 1, overflowY: 'auto' }}>{highlightDraftId ? <DraftsView bdr={BDR} highlightId={highlightDraftId} /> : <DraftsView bdr={BDR} />}</div>}
      </div>
    </div>
  );
}
