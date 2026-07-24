import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { message, Skeleton, Tag, theme, Tooltip } from 'antd';
import { SortAscendingOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../../../data/types';
import { calcICE } from '../taskConstants';
import { PriorityChevrons, UserAvatar } from '../TaskWidgets';

const { useToken } = theme;

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

export function BacklogView({ tasks, isLoading, bdr }: { tasks: Task[]; isLoading: boolean; bdr: string }) {
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
