import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Skeleton, Tag, theme } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
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
import type { Task, TaskStatus } from '../../../data/types';
import ScrollArea from '../../../components/ScrollArea';
import { COLUMNS } from '../taskConstants';
import { PriorityChevrons, UserAvatar } from '../TaskWidgets';

const { useToken } = theme;

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
  todo:        { bg: '#16171a', borderColor: 'rgba(90, 130, 220, 0.18)' },
  in_progress: { bg: '#16171a', borderColor: 'rgba(60, 140, 255, 0.18)' },
  review:      { bg: '#16171a', borderColor: 'rgba(140, 100, 220, 0.18)' },
  done:        { bg: '#16171a', borderColor: 'rgba(100, 190, 100, 0.16)' },
};

function KanbanColumn({ status, label, tasks, bdr }: { status: TaskStatus; label: string; tasks: Task[]; bdr: string }) {
  const { token } = useToken();
  const { bg, borderColor } = COLUMN_STYLE[status];
  const colBorder = borderColor ? `1px solid ${borderColor}` : bdr;

  return (
    <div style={{ flex: '1 1 218px', minWidth: 218, display: 'flex', flexDirection: 'column', background: bg, borderRadius: 10, border: colBorder, overflow: 'hidden', maxHeight: '100%' }}>
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: colBorder, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{label}</span>
        <Badge count={tasks.length} style={{ background: '#2D2E30', color: token.colorTextSecondary, boxShadow: 'none', fontSize: 11 }} />
      </div>
      <ScrollArea style={{ flex: 1 }} contentStyle={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => <KanbanCard key={task.id} task={task} />)}
        </SortableContext>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: token.colorTextQuaternary, fontSize: 12, padding: '20px 0' }}>Нет задач</div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Kanban view ──────────────────────────────────────────────────────────────

export function KanbanView({ tasks, isLoading, bdr }: { tasks: Task[]; isLoading: boolean; bdr: string }) {
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
      <div className="content-scroll" style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden' }}>
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} status={col.id} label={col.label} tasks={byStatus(col.id)} bdr={bdr} />
        ))}
      </div>
      <DragOverlay>{activeTask && <KanbanCard task={activeTask} overlay />}</DragOverlay>
    </DndContext>
  );
}
