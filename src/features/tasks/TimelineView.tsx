import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Modal, Select, Segmented, Skeleton, Tag, theme, Typography,
} from 'antd';
import {
  LinkOutlined, DeleteOutlined, PlusOutlined, CalendarOutlined, TeamOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Task } from '../../data/types';

const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewRange = 'sprint' | 'month' | 'quarter' | 'halfyear' | 'year';

interface TimelineTask extends Task {
  start: Date;
  end: Date;
  row: number;
}

interface Dep {
  fromId: string;
  toId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_LABELS: Record<ViewRange, string> = {
  sprint: 'Спринт', month: 'Месяц', quarter: 'Квартал', halfyear: 'Полугодие', year: 'Год',
};

const DAY_PX = 28;
const ROW_H = 40;
const ROW_GAP = 8;
const ROW_STRIDE = ROW_H + ROW_GAP;
const LEFT_COL = 220;
const HEADER_H = 44;
const BAR_RADIUS = 6;
const RESIZE_ZONE = 8;

const TODAY = new Date('2026-07-02');

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseDate(s: string): Date {
  const parts = s.split('-').map(Number);
  return new Date(parts[0]!, (parts[1] ?? 1) - 1, parts[2] ?? 1);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function rangeWindow(range: ViewRange): [Date, Date] {
  const start = new Date(TODAY);
  start.setDate(1);
  switch (range) {
    case 'sprint':
      return [addDays(TODAY, -3), addDays(TODAY, 11)];
    case 'month': {
      const s = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
      const e = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0);
      return [s, e];
    }
    case 'quarter': {
      const q = Math.floor(TODAY.getMonth() / 3);
      return [new Date(TODAY.getFullYear(), q * 3, 1), new Date(TODAY.getFullYear(), q * 3 + 3, 0)];
    }
    case 'halfyear': {
      const half = TODAY.getMonth() < 6 ? 0 : 6;
      return [new Date(TODAY.getFullYear(), half, 1), new Date(TODAY.getFullYear(), half + 6, 0)];
    }
    case 'year':
      return [new Date(TODAY.getFullYear(), 0, 1), new Date(TODAY.getFullYear(), 11, 31)];
  }
}

function buildDayTicks(start: Date, end: Date, range: ViewRange): { date: Date; label: string; isMonthStart: boolean }[] {
  const ticks: { date: Date; label: string; isMonthStart: boolean }[] = [];
  const totalDays = daysBetween(start, end) + 1;

  let step = 1;
  if (range === 'quarter') step = 3;
  else if (range === 'halfyear') step = 7;
  else if (range === 'year') step = 14;
  else if (range === 'month') step = 2;

  for (let i = 0; i < totalDays; i += step) {
    const d = addDays(start, i);
    const isMonthStart = d.getDate() === 1;
    const label = isMonthStart
      ? d.toLocaleDateString('ru', { month: 'short', year: 'numeric' })
      : d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
    ticks.push({ date: d, label, isMonthStart });
  }
  return ticks;
}

// Assign rows so tasks don't visually overlap
function assignRows(tasks: TimelineTask[]): TimelineTask[] {
  const sorted = [...tasks].sort((a, b) => a.start.getTime() - b.start.getTime());
  const rowEnds: Date[] = [];
  return sorted.map((t) => {
    let row = rowEnds.findIndex((end) => end <= t.start);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = addDays(t.end, 1);
    return { ...t, row };
  });
}

// ─── Dependency arrow (SVG) ───────────────────────────────────────────────────

function DepArrow({
  from, to, color,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}) {
  const dx = to.x - from.x;
  const midX = from.x + dx * 0.5;

  const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  return (
    <g>
      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" markerEnd={`url(#arrow-${color.replace('#', '')})`} />
    </g>
  );
}

// ─── Manage dependencies modal ────────────────────────────────────────────────

function ManageDepsModal({
  open, onClose, tasks, deps, onChange,
}: {
  open: boolean;
  onClose: () => void;
  tasks: Task[];
  deps: Dep[];
  onChange: (deps: Dep[]) => void;
}) {
  const { token } = useToken();
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);

  const taskOptions = tasks.map((t) => ({ value: t.id, label: `${t.id} — ${t.title.slice(0, 50)}` }));

  const addDep = () => {
    if (!fromId || !toId || fromId === toId) return;
    if (deps.some((d) => d.fromId === fromId && d.toId === toId)) return;
    onChange([...deps, { fromId, toId }]);
    setFromId(null);
    setToId(null);
  };

  const removeDep = (i: number) => onChange(deps.filter((_, idx) => idx !== i));

  return (
    <Modal
      open={open}
      title="Управление зависимостями"
      onCancel={onClose}
      footer={null}
      width={640}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select
            placeholder="Блокирующая задача (FROM)"
            showSearch optionFilterProp="label"
            style={{ flex: 1 }} options={taskOptions}
            value={fromId} onChange={setFromId}
          />
          <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>→</span>
          <Select
            placeholder="Зависимая задача (TO)"
            showSearch optionFilterProp="label"
            style={{ flex: 1 }} options={taskOptions}
            value={toId} onChange={setToId}
          />
          <Button icon={<PlusOutlined />} type="primary" onClick={addDep} disabled={!fromId || !toId} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {deps.length === 0 && (
            <div style={{ color: token.colorTextTertiary, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Зависимостей нет. Добавьте выше.
            </div>
          )}
          {deps.map((dep, i) => {
            const from = tasks.find((t) => t.id === dep.fromId);
            const to = tasks.find((t) => t.id === dep.toId);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: token.colorFillSecondary, borderRadius: 6 }}>
                <Tag style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{dep.fromId}</Tag>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {from?.title.slice(0, 35)}
                </span>
                <span style={{ color: token.colorTextTertiary, fontSize: 13 }}>→</span>
                <Tag style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{dep.toId}</Tag>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {to?.title.slice(0, 35)}
                </span>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeDep(i)} />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ─── Timeline canvas ──────────────────────────────────────────────────────────

function TimelineCanvas({
  tasks, deps, epicColor, rangeStart, rangeEnd, onTaskResize,
}: {
  tasks: TimelineTask[];
  deps: Dep[];
  epicColor: string;
  rangeStart: Date;
  rangeEnd: Date;
  onTaskResize: (taskId: string, newEnd: Date) => void;
}) {
  const { token } = useToken();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ taskId: string; startX: number; origEnd: Date } | null>(null);

  const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
  const totalW = totalDays * DAY_PX;
  const numRows = tasks.length > 0 ? Math.max(...tasks.map((t) => t.row)) + 1 : 1;
  const canvasH = numRows * ROW_STRIDE + ROW_GAP;

  const xOf = (d: Date): number => {
    const days = daysBetween(rangeStart, d);
    return Math.max(0, Math.min(days * DAY_PX, totalW));
  };

  const todayX = xOf(TODAY);

  const statusColor = (t: Task): string => {
    if (t.status === 'done') return token.colorSuccess;
    if (t.riskLevel === 'critical') return token.colorError;
    if (t.riskLevel === 'warning') return token.colorWarning;
    if (t.status === 'in_progress') return token.colorPrimary;
    if (t.status === 'review') return '#d89614';
    return token.colorFillSecondary;
  };

  const onMouseDown = useCallback((e: React.MouseEvent, taskId: string, origEnd: Date) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { taskId, startX: e.clientX, origEnd };

    const onMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaDays = Math.round((me.clientX - resizeRef.current.startX) / DAY_PX);
      if (deltaDays === 0) return;
      const newEnd = addDays(resizeRef.current.origEnd, deltaDays);
      if (newEnd <= addDays(resizeRef.current.origEnd, -29)) return;
      onTaskResize(resizeRef.current.taskId, newEnd);
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [onTaskResize]);

  // Build dep arrows
  const arrows = useMemo(() => {
    return deps.map((dep) => {
      const from = tasks.find((t) => t.id === dep.fromId);
      const to = tasks.find((t) => t.id === dep.toId);
      if (!from || !to) return null;

      const fromX = xOf(from.end) + DAY_PX;
      const fromY = from.row * ROW_STRIDE + ROW_H / 2;
      const toX = xOf(to.start);
      const toY = to.row * ROW_STRIDE + ROW_H / 2;

      return { dep, from, to, fromX, fromY, toX, toY };
    }).filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, deps, rangeStart]);

  const arrowColor = token.colorTextQuaternary;

  return (
    <div ref={canvasRef} style={{ position: 'relative', width: totalW, height: canvasH, userSelect: 'none' }}>
      {/* Today line */}
      <div style={{ position: 'absolute', top: 0, left: todayX, width: 2, height: canvasH, background: token.colorPrimary, opacity: 0.7, zIndex: 3, pointerEvents: 'none' }} />

      {/* Row backgrounds */}
      {Array.from({ length: numRows }, (_, r) => (
        <div key={r} style={{ position: 'absolute', top: r * ROW_STRIDE, left: 0, right: 0, height: ROW_H, background: r % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: 4 }} />
      ))}

      {/* SVG dep arrows */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: totalW, height: canvasH, pointerEvents: 'none', zIndex: 2 }}>
        <defs>
          <marker id={`arrow-${arrowColor.replace('#', '')}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={arrowColor} />
          </marker>
        </defs>
        {arrows.map((a, i) => a && (
          <DepArrow
            key={i}
            from={{ x: a.fromX, y: a.fromY }}
            to={{ x: a.toX, y: a.toY }}
            color={arrowColor}
          />
        ))}
      </svg>

      {/* Task bars */}
      {tasks.map((t) => {
        const x = xOf(t.start);
        const w = Math.max(DAY_PX, xOf(t.end) - x + DAY_PX);
        const y = t.row * ROW_STRIDE;
        const color = epicColor;
        const isDone = t.status === 'done';
        const barBg = isDone ? `${color}55` : color;
        const isOverdue = t.end < TODAY && !isDone;
        const border = isOverdue ? `1.5px solid ${token.colorError}` : isDone ? '1.5px solid transparent' : '1.5px solid transparent';

        return (
          <div
            key={t.id}
            title={`${t.id}: ${t.title}\n${formatDate(t.start)} → ${formatDate(t.end)}`}
            onClick={() => navigate(`/tasks/${t.id}`)}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: ROW_H,
              background: barBg,
              borderRadius: BAR_RADIUS,
              border,
              cursor: 'pointer',
              zIndex: 4,
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Status dot */}
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(t), flexShrink: 0 }} />
              {w > 80 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.title.length > Math.floor(w / 7) ? t.title.slice(0, Math.floor(w / 7)) + '…' : t.title}
                </span>
              )}
            </div>
            {/* Resize handle */}
            <div
              onMouseDown={(e) => onMouseDown(e, t.id, t.end)}
              style={{
                width: RESIZE_ZONE,
                height: '100%',
                cursor: 'ew-resize',
                background: 'rgba(255,255,255,0.15)',
                borderRadius: `0 ${BAR_RADIUS}px ${BAR_RADIUS}px 0`,
                flexShrink: 0,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main timeline view ───────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const [range, setRange] = useState<ViewRange>('quarter');
  const [selectedEpicId, setSelectedEpicId] = useState<string>('EPIC-1');
  const [extraDeps, setExtraDeps] = useState<Dep[]>([]);
  const [removedDeps, setRemovedDeps] = useState<Set<string>>(new Set());
  const [depsModalOpen, setDepsModalOpen] = useState(false);
  const [taskDates, setTaskDates] = useState<Record<string, { start?: string; end?: string }>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: epics = [], isLoading: epicsLoading } = useQuery({ queryKey: ['epics'], queryFn: getEpics });

  const isLoading = tasksLoading || epicsLoading;

  // Derive deps from task fixtures + user additions - user removals
  const fixturedDeps = useMemo<Dep[]>(() => {
    const result: Dep[] = [];
    allTasks.forEach((t) => {
      (t.dependencies ?? []).forEach((fromId) => {
        result.push({ fromId, toId: t.id });
      });
    });
    return result;
  }, [allTasks]);

  const deps = useMemo<Dep[]>(() => {
    const key = (d: Dep) => `${d.fromId}→${d.toId}`;
    const combined = [...fixturedDeps, ...extraDeps].filter((d) => !removedDeps.has(key(d)));
    const seen = new Set<string>();
    return combined.filter((d) => {
      const k = key(d);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [fixturedDeps, extraDeps, removedDeps]);

  const setDeps = useCallback((newDeps: Dep[]) => {
    const fixtureKeys = new Set(fixturedDeps.map((d) => `${d.fromId}→${d.toId}`));
    const extras = newDeps.filter((d) => !fixtureKeys.has(`${d.fromId}→${d.toId}`));
    const removedKeys = fixturedDeps
      .filter((d) => !newDeps.some((nd) => nd.fromId === d.fromId && nd.toId === d.toId))
      .map((d) => `${d.fromId}→${d.toId}`);
    setExtraDeps(extras);
    setRemovedDeps(new Set(removedKeys));
  }, [fixturedDeps]);

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);

  const [rangeStart, rangeEnd] = useMemo(() => rangeWindow(range), [range]);
  const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
  const totalW = totalDays * DAY_PX;

  const dayTicks = useMemo(() => buildDayTicks(rangeStart, rangeEnd, range), [rangeStart, rangeEnd, range]);

  // Tasks for selected epic
  const epicTasks = useMemo(
    () => allTasks.filter((t) => t.epicId === selectedEpicId),
    [allTasks, selectedEpicId],
  );

  // Resolve task dates (fixture + overrides)
  const resolveTask = useCallback((t: Task): TimelineTask => {
    const override = taskDates[t.id];
    const startStr = override?.start ?? t.startDate ?? t.createdAt ?? '2026-07-01';
    const endStr = override?.end ?? t.deadline ?? addDays(parseDate(startStr), 7).toISOString().slice(0, 10);
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    return { ...t, start: start < end ? start : end, end: start < end ? end : start, row: 0 };
  }, [taskDates]);

  // Dep-connected tasks (tasks that have dependencies linking to selected epic tasks)
  const epicTaskIds = new Set(epicTasks.map((t) => t.id));
  const connectedTaskIds = new Set<string>();
  deps.forEach((d) => {
    if (epicTaskIds.has(d.toId) && !epicTaskIds.has(d.fromId)) connectedTaskIds.add(d.fromId);
    if (epicTaskIds.has(d.fromId) && !epicTaskIds.has(d.toId)) connectedTaskIds.add(d.toId);
  });
  const connectedTasks = allTasks.filter((t) => connectedTaskIds.has(t.id));

  // Tasks with dependencies (linked tasks)
  const linkedTaskIds = new Set<string>();
  epicTasks.forEach((t) => {
    const hasDep = deps.some((d) => d.fromId === t.id || d.toId === t.id);
    if (hasDep) linkedTaskIds.add(t.id);
  });

  const withDeps = epicTasks.filter((t) => linkedTaskIds.has(t.id));
  const withoutDeps = epicTasks.filter((t) => !linkedTaskIds.has(t.id));

  const resolvedWithDeps = useMemo(() => assignRows(withDeps.map(resolveTask)), [withDeps, resolveTask]);
  const resolvedWithoutDeps = useMemo(() => assignRows(withoutDeps.map(resolveTask)), [withoutDeps, resolveTask]);
  const resolvedConnected = useMemo(() => assignRows(connectedTasks.map(resolveTask)), [connectedTasks, resolveTask]);

  // Visible deps for this epic
  const allVisibleIds = new Set([...epicTasks.map((t) => t.id), ...connectedTasks.map((t) => t.id)]);
  const visibleDeps = deps.filter((d) => allVisibleIds.has(d.fromId) && allVisibleIds.has(d.toId));

  const handleResize = useCallback((taskId: string, newEnd: Date) => {
    setTaskDates((prev) => {
      const next = { ...prev };
      const orig = allTasks.find((t) => t.id === taskId);
      const startStr = prev[taskId]?.start ?? orig?.startDate ?? orig?.createdAt ?? '2026-07-01';
      next[taskId] = { ...prev[taskId], start: startStr, end: newEnd.toISOString().slice(0, 10) };

      // Cascade: shift tasks that depend on this one
      const delta = daysBetween(parseDate(next[taskId].end!), newEnd);
      if (Math.abs(delta) > 0) {
        const cascade = (fromId: string, shift: number) => {
          deps.forEach((dep) => {
            if (dep.fromId !== fromId) return;
            const dependent = allTasks.find((t) => t.id === dep.toId);
            if (!dependent) return;
            const depStart = prev[dep.toId]?.start ?? dependent.startDate ?? dependent.createdAt ?? '2026-07-01';
            const depEnd = prev[dep.toId]?.end ?? dependent.deadline ?? addDays(parseDate(depStart), 7).toISOString().slice(0, 10);
            next[dep.toId] = {
              start: addDays(parseDate(depStart), shift).toISOString().slice(0, 10),
              end: addDays(parseDate(depEnd), shift).toISOString().slice(0, 10),
            };
            cascade(dep.toId, shift);
          });
        };
        cascade(taskId, delta);
      }

      return next;
    });
  }, [allTasks, deps]);

  // Scroll to today on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const todayOffset = daysBetween(rangeStart, TODAY) * DAY_PX - 100;
    scrollRef.current.scrollLeft = Math.max(0, todayOffset);
  }, [rangeStart, range]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  const epicOptions = epics.map((e) => ({
    value: e.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, flexShrink: 0, display: 'inline-block' }} />
        <span>{e.name}</span>
        {e.teamId !== 'team-debit' && (
          <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px' }} color="default">другая команда</Tag>
        )}
      </div>
    ),
  }));

  const epicColor = selectedEpic?.color ?? token.colorPrimary;

  const renderSection = (
    label: string,
    tasks: TimelineTask[],
    deps: Dep[],
    isExternal?: boolean,
  ) => {
    if (tasks.length === 0) return null;
    const numRows = tasks.length > 0 ? Math.max(...tasks.map((t) => t.row)) + 1 : 1;
    const sectionH = numRows * ROW_STRIDE + ROW_GAP;

    return (
      <div style={{ marginBottom: 24 }}>
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {isExternal && <TeamOutlined style={{ color: token.colorTextTertiary, fontSize: 12 }} />}
          <span style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: token.colorTextQuaternary }}>({tasks.length})</span>
        </div>

        {/* Timeline row */}
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: bdr }}>
          {/* Left names column */}
          <div style={{ width: LEFT_COL, flexShrink: 0, background: '#16171a', borderRight: bdr }}>
            <div style={{ height: HEADER_H, borderBottom: bdr }} />
            {tasks.map((t) => (
              <div
                key={t.id}
                style={{
                  height: ROW_H,
                  marginTop: t.row > 0 ? ROW_GAP : ROW_GAP,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 10px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                }}
                onClick={() => window.location.pathname.includes('/tasks') && (window.location.href = `/tasks/${t.id}`)}
              >
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: token.colorTextTertiary, flexShrink: 0 }}>{t.id}</span>
                <span style={{ fontSize: 12, color: token.colorText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
              </div>
            ))}
          </div>

          {/* Scroll area */}
          <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', background: '#13141a', position: 'relative' }}>
            <div style={{ width: totalW, minWidth: totalW }}>
              {/* Header: day ticks */}
              <div style={{ height: HEADER_H, borderBottom: bdr, display: 'flex', alignItems: 'flex-end', position: 'sticky', top: 0, zIndex: 10, background: '#13141a' }}>
                {dayTicks.map((tick, i) => {
                  const x = daysBetween(rangeStart, tick.date) * DAY_PX;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: x,
                        bottom: 6,
                        fontSize: tick.isMonthStart ? 11 : 10,
                        fontWeight: tick.isMonthStart ? 600 : 400,
                        color: tick.isMonthStart ? token.colorTextSecondary : token.colorTextQuaternary,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {tick.label}
                    </div>
                  );
                })}
                {/* Today marker label */}
                <div style={{ position: 'absolute', left: daysBetween(rangeStart, TODAY) * DAY_PX + 3, bottom: 6, fontSize: 10, fontWeight: 700, color: token.colorPrimary, whiteSpace: 'nowrap' }}>
                  Сегодня
                </div>
              </div>

              {/* Canvas */}
              <div style={{ position: 'relative', height: sectionH }}>
                <TimelineCanvas
                  tasks={tasks}
                  deps={deps}
                  epicColor={isExternal ? token.colorTextQuaternary : epicColor}
                  rangeStart={rangeStart}
                  rangeEnd={rangeEnd}
                  onTaskResize={handleResize}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Controls bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Epic selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
          <Select
            value={selectedEpicId}
            onChange={setSelectedEpicId}
            style={{ width: 280 }}
            options={epicOptions}
            showSearch={false}
          />
        </div>

        {/* Range selector */}
        <Segmented
          value={range}
          onChange={(v) => setRange(v as ViewRange)}
          options={Object.entries(VIEW_LABELS).map(([value, label]) => ({ value, label }))}
          size="small"
        />

        <div style={{ flex: 1 }} />

        {/* Manage deps button */}
        <Button
          size="small"
          icon={<LinkOutlined />}
          onClick={() => setDepsModalOpen(true)}
          style={{ fontSize: 12 }}
        >
          Зависимости
        </Button>
      </div>

      {/* Epic info */}
      {selectedEpic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '8px 12px', background: `${epicColor}18`, borderRadius: 8, border: `1px solid ${epicColor}35` }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: epicColor, flexShrink: 0 }} />
          <Typography.Text style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>
            {selectedEpic.name}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {selectedEpic.description}
          </Typography.Text>
          {selectedEpic.teamId !== 'team-debit' && (
            <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>Другая команда</Tag>
          )}
        </div>
      )}

      {/* No tasks placeholder */}
      {epicTasks.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: token.colorTextTertiary, fontSize: 14 }}>
          В этом эпике нет задач с датами
        </div>
      )}

      {/* Section: linked tasks (with dependencies) */}
      {renderSection('Связанные задачи', resolvedWithDeps, visibleDeps)}

      {/* Section: independent tasks */}
      {renderSection('Независимые задачи', resolvedWithoutDeps, [])}

      {/* Section: tasks from other teams (connected via deps) */}
      {resolvedConnected.length > 0 &&
        renderSection('Задачи других команд', resolvedConnected, visibleDeps, true)}

      {/* Manage deps modal */}
      <ManageDepsModal
        open={depsModalOpen}
        onClose={() => setDepsModalOpen(false)}
        tasks={allTasks}
        deps={deps}
        onChange={setDeps}
      />
    </div>
  );
}
