import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button, Modal, Select, Skeleton, Tag, Tooltip, theme,
} from 'antd';
import {
  DeleteOutlined, FilterOutlined, LinkOutlined, PlusOutlined,
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
  isOtherTeam: boolean;
}

interface Dep {
  fromId: string;
  toId: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS: { value: ViewRange; label: string }[] = [
  { value: 'sprint', label: 'Спринт (2 нед.)' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'halfyear', label: 'Полугодие' },
  { value: 'year', label: 'Год' },
];

const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614',
  u4: '#722ed1', u5: '#eb2f96', u6: '#13c2c2',
  u7: '#fa8c16', u8: '#c41d7f', u9: '#0958d9', u10: '#389e0d',
};

const DAY_PX = 28;
const ROW_H = 40;
const ROW_GAP = 12;
const ROW_STRIDE = ROW_H + ROW_GAP;
const HEADER_H = 44;
const BAR_RADIUS = 6;
const RESIZE_ZONE = 8;
const PORT_R = 6;
const TODAY = new Date('2026-07-02');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseDate(s: string): Date {
  const p = s.split('-').map(Number);
  return new Date(p[0]!, (p[1] ?? 1) - 1, p[2] ?? 1);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function rangeWindow(range: ViewRange): [Date, Date] {
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

function buildDayTicks(start: Date, end: Date, range: ViewRange) {
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

// ─── Mini avatar (inside bar) ─────────────────────────────────────────────────

function MiniAvatar({ user, size = 22 }: { user: { id: string; name: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: AVATAR_COLORS[user.id] ?? '#555',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.38), fontWeight: 700, color: '#fff',
      flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.2)',
    }}>
      {initials}
    </div>
  );
}

// ─── Manage deps modal ────────────────────────────────────────────────────────

function ManageDepsModal({ open, onClose, tasks, deps, onChange }: {
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
    setFromId(null); setToId(null);
  };

  return (
    <Modal open={open} title="Управление зависимостями" onCancel={onClose} footer={null} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select
            placeholder="Блокирующая задача (FROM)" showSearch optionFilterProp="label"
            style={{ flex: 1 }} options={taskOptions} value={fromId} onChange={setFromId}
          />
          <span style={{ color: token.colorTextTertiary, fontSize: 16 }}>→</span>
          <Select
            placeholder="Зависимая задача (TO)" showSearch optionFilterProp="label"
            style={{ flex: 1 }} options={taskOptions} value={toId} onChange={setToId}
          />
          <Button icon={<PlusOutlined />} type="primary" onClick={addDep} disabled={!fromId || !toId} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {deps.length === 0 && (
            <div style={{ color: token.colorTextTertiary, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              Зависимостей нет. Добавьте выше или протяните связь между задачами на таймлайне.
            </div>
          )}
          {deps.map((dep, i) => {
            const from = tasks.find((t) => t.id === dep.fromId);
            const to = tasks.find((t) => t.id === dep.toId);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: token.colorFillSecondary, borderRadius: 6 }}>
                <Tag style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{dep.fromId}</Tag>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {from?.title.slice(0, 30)}
                </span>
                <span style={{ color: token.colorTextTertiary }}>→</span>
                <Tag style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{dep.toId}</Tag>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {to?.title.slice(0, 30)}
                </span>
                <Button size="small" type="text" danger icon={<DeleteOutlined />}
                  onClick={() => onChange(deps.filter((_, j) => j !== i))} />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main timeline view ───────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const navigate = useNavigate();

  const [range, setRange] = useState<ViewRange>('quarter');
  const [selectedEpicId, setSelectedEpicId] = useState<string>('EPIC-1');
  const [extraDeps, setExtraDeps] = useState<Dep[]>([]);
  const [removedDeps, setRemovedDeps] = useState<Set<string>>(new Set());
  const [depsModalOpen, setDepsModalOpen] = useState(false);
  const [taskDates, setTaskDates] = useState<Record<string, { start?: string; end?: string }>>({});

  // Node-style connection drag state
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ taskId: string; x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ taskId: string; startX: number; origEnd: Date } | null>(null);

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: epics = [], isLoading: epicsLoading } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tasksLoading || epicsLoading;

  // ── Deps state ──────────────────────────────────────────────────────────────

  const fixturedDeps = useMemo<Dep[]>(() => {
    const result: Dep[] = [];
    allTasks.forEach((t) => {
      (t.dependencies ?? []).forEach((fromId) => result.push({ fromId, toId: t.id }));
    });
    return result;
  }, [allTasks]);

  const deps = useMemo<Dep[]>(() => {
    const key = (d: Dep) => `${d.fromId}→${d.toId}`;
    const combined = [...fixturedDeps, ...extraDeps].filter((d) => !removedDeps.has(key(d)));
    const seen = new Set<string>();
    return combined.filter((d) => { const k = key(d); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [fixturedDeps, extraDeps, removedDeps]);

  const setDeps = useCallback((newDeps: Dep[]) => {
    const fk = new Set(fixturedDeps.map((d) => `${d.fromId}→${d.toId}`));
    setExtraDeps(newDeps.filter((d) => !fk.has(`${d.fromId}→${d.toId}`)));
    setRemovedDeps(new Set(
      fixturedDeps
        .filter((d) => !newDeps.some((nd) => nd.fromId === d.fromId && nd.toId === d.toId))
        .map((d) => `${d.fromId}→${d.toId}`),
    ));
  }, [fixturedDeps]);

  const addDep = useCallback((dep: Dep) => {
    if (deps.some((d) => d.fromId === dep.fromId && d.toId === dep.toId)) return;
    setExtraDeps((prev) => [...prev, dep]);
  }, [deps]);

  // ── Data derivation ─────────────────────────────────────────────────────────

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);
  const epicTeamId = selectedEpic?.teamId ?? 'team-debit';
  const epicColor = selectedEpic?.color ?? token.colorPrimary;

  const [rangeStart, rangeEnd] = useMemo(() => rangeWindow(range), [range]);
  const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
  const totalW = totalDays * DAY_PX;
  const dayTicks = useMemo(() => buildDayTicks(rangeStart, rangeEnd, range), [rangeStart, rangeEnd, range]);

  const epicTasks = useMemo(() => allTasks.filter((t) => t.epicId === selectedEpicId), [allTasks, selectedEpicId]);
  const epicTaskIds = useMemo(() => new Set(epicTasks.map((t) => t.id)), [epicTasks]);

  const crossTeamTasks = useMemo(() => {
    const crossIds = new Set<string>();
    deps.forEach((d) => {
      if (epicTaskIds.has(d.toId) && !epicTaskIds.has(d.fromId)) crossIds.add(d.fromId);
      if (epicTaskIds.has(d.fromId) && !epicTaskIds.has(d.toId)) crossIds.add(d.toId);
    });
    return allTasks.filter((t) => crossIds.has(t.id));
  }, [allTasks, deps, epicTaskIds]);

  const resolveTask = useCallback((t: Task): TimelineTask => {
    const override = taskDates[t.id];
    const startStr = override?.start ?? t.startDate ?? t.createdAt ?? '2026-07-01';
    const endStr = override?.end ?? t.deadline ?? addDays(parseDate(startStr), 7).toISOString().slice(0, 10);
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    return { ...t, start: start <= end ? start : end, end: start <= end ? end : start, row: 0, isOtherTeam: t.teamId !== epicTeamId };
  }, [taskDates, epicTeamId]);

  const allVisible = useMemo(
    () => assignRows([...epicTasks, ...crossTeamTasks].map(resolveTask)),
    [epicTasks, crossTeamTasks, resolveTask],
  );

  const allVisibleIds = useMemo(() => new Set(allVisible.map((t) => t.id)), [allVisible]);
  const visibleDeps = useMemo(
    () => deps.filter((d) => allVisibleIds.has(d.fromId) && allVisibleIds.has(d.toId)),
    [deps, allVisibleIds],
  );

  const numRows = allVisible.length > 0 ? Math.max(...allVisible.map((t) => t.row)) + 1 : 1;
  const canvasH = numRows * ROW_STRIDE + ROW_GAP * 3;

  // ── Position helpers ────────────────────────────────────────────────────────

  const xOf = useCallback((d: Date): number => {
    return Math.max(0, Math.min(daysBetween(rangeStart, d) * DAY_PX, totalW));
  }, [rangeStart, totalW]);

  const todayX = xOf(TODAY);

  const findTaskAtPos = useCallback((x: number, y: number): string | null => {
    for (const t of allVisible) {
      const tx = xOf(t.start);
      const tw = Math.max(DAY_PX, xOf(t.end) - tx + DAY_PX);
      const ty = t.row * ROW_STRIDE;
      if (x >= tx && x <= tx + tw && y >= ty && y <= ty + ROW_H) return t.id;
    }
    return null;
  }, [allVisible, xOf]);

  // ── Cascade resize ──────────────────────────────────────────────────────────

  const handleResize = useCallback((taskId: string, newEnd: Date) => {
    setTaskDates((prev) => {
      const next = { ...prev };
      const orig = allTasks.find((t) => t.id === taskId);
      const startStr = prev[taskId]?.start ?? orig?.startDate ?? orig?.createdAt ?? '2026-07-01';
      const oldEndStr = prev[taskId]?.end ?? orig?.deadline ?? addDays(parseDate(startStr), 7).toISOString().slice(0, 10);
      const delta = daysBetween(parseDate(oldEndStr), newEnd);
      next[taskId] = { ...prev[taskId], start: startStr, end: newEnd.toISOString().slice(0, 10) };
      if (Math.abs(delta) > 0) {
        const cascade = (fromId: string, shift: number) => {
          deps.forEach((dep) => {
            if (dep.fromId !== fromId) return;
            const dep_ = allTasks.find((t) => t.id === dep.toId);
            if (!dep_) return;
            const ds = prev[dep.toId]?.start ?? dep_.startDate ?? dep_.createdAt ?? '2026-07-01';
            const de = prev[dep.toId]?.end ?? dep_.deadline ?? addDays(parseDate(ds), 7).toISOString().slice(0, 10);
            next[dep.toId] = {
              start: addDays(parseDate(ds), shift).toISOString().slice(0, 10),
              end: addDays(parseDate(de), shift).toISOString().slice(0, 10),
            };
            cascade(dep.toId, shift);
          });
        };
        cascade(taskId, delta);
      }
      return next;
    });
  }, [allTasks, deps]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, taskId: string, origEnd: Date) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { taskId, startX: e.clientX, origEnd };
    const onMove = (me: MouseEvent) => {
      if (!resizeRef.current) return;
      const deltaDays = Math.round((me.clientX - resizeRef.current.startX) / DAY_PX);
      if (deltaDays === 0) return;
      handleResize(resizeRef.current.taskId, addDays(resizeRef.current.origEnd, deltaDays));
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [handleResize]);

  // ── Node-style connection events ────────────────────────────────────────────

  const handlePortMouseDown = useCallback((e: React.MouseEvent, taskId: string, px: number, py: number) => {
    e.stopPropagation();
    e.preventDefault();
    setConnectingFrom({ taskId, x: px, y: py });
    setCursorPos({ x: px, y: py });
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!connectingFrom || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCursorPos({ x, y });
    setDragTargetId(findTaskAtPos(x, y));
  }, [connectingFrom, findTaskAtPos]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    if (!connectingFrom || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const targetId = findTaskAtPos(e.clientX - rect.left, e.clientY - rect.top);
    if (targetId && targetId !== connectingFrom.taskId) {
      addDep({ fromId: connectingFrom.taskId, toId: targetId });
    }
    setConnectingFrom(null);
    setCursorPos(null);
    setDragTargetId(null);
  }, [connectingFrom, findTaskAtPos, addDep]);

  useEffect(() => {
    if (!connectingFrom) return;
    const cancel = () => { setConnectingFrom(null); setCursorPos(null); setDragTargetId(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancel(); };
    window.addEventListener('mouseup', cancel);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mouseup', cancel); window.removeEventListener('keydown', onKey); };
  }, [connectingFrom]);

  // Scroll to today on mount / range change
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = Math.max(0, daysBetween(rangeStart, TODAY) * DAY_PX - 120);
  }, [rangeStart]);

  // ── Style helpers ───────────────────────────────────────────────────────────

  const barBg = (t: TimelineTask): string => {
    if (t.isOtherTeam) return 'rgba(140,140,160,0.08)';
    if (t.status === 'done') return 'rgba(73,170,25,0.10)';
    if (t.status === 'in_progress') return 'rgba(22,104,220,0.15)';
    if (t.status === 'review') return 'rgba(216,150,20,0.13)';
    return 'rgba(255,255,255,0.05)';
  };

  const barBorder = (t: TimelineTask, isTarget: boolean): string => {
    if (isTarget) return `2px solid ${token.colorPrimary}`;
    if (t.isOtherTeam) return '1px dashed rgba(255,255,255,0.10)';
    if (t.riskLevel === 'critical' && t.status !== 'done') return `1.5px solid ${token.colorError}50`;
    if (t.status === 'done') return '1px solid rgba(73,170,25,0.25)';
    return '1px solid rgba(255,255,255,0.07)';
  };

  const statusDotColor = (t: Task): string => {
    if (t.status === 'done') return token.colorSuccess;
    if (t.riskLevel === 'critical') return token.colorError;
    if (t.riskLevel === 'warning') return token.colorWarning;
    if (t.status === 'in_progress') return token.colorPrimary;
    if (t.status === 'review') return '#d89614';
    return token.colorTextQuaternary;
  };

  // ── Port for hovered bar ────────────────────────────────────────────────────

  const hoveredTask = !connectingFrom && hoveredBarId ? allVisible.find((t) => t.id === hoveredBarId) : null;
  const portPos = hoveredTask
    ? { x: xOf(hoveredTask.end) + DAY_PX, y: hoveredTask.row * ROW_STRIDE + ROW_H / 2 }
    : null;

  const arrowColor = 'rgba(180,180,210,0.4)';

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  const epicOptions = epics.map((e) => ({
    value: e.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0, display: 'inline-block' }} />
        <span>{e.name}</span>
        {e.teamId !== 'team-debit' && (
          <Tag style={{ margin: 0, fontSize: 10, padding: '0 4px' }} color="default">другая команда</Tag>
        )}
      </div>
    ),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* ── Filter bar (consistent with Kanban/Backlog) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
        <FilterOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
        <Select
          value={selectedEpicId}
          onChange={setSelectedEpicId}
          style={{ width: 260 }}
          size="small"
          options={epicOptions}
          placeholder="Эпик"
        />
        <Select
          value={range}
          onChange={(v) => setRange(v as ViewRange)}
          style={{ width: 160 }}
          size="small"
          options={VIEW_OPTIONS}
        />
        <div style={{ flex: 1 }} />
        <Button size="small" icon={<LinkOutlined />} onClick={() => setDepsModalOpen(true)} style={{ fontSize: 12 }}>
          Зависимости
        </Button>
      </div>

      {/* ── Epic info bar ── */}
      {selectedEpic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '6px 12px', background: `${epicColor}10`, borderRadius: 8, border: `1px solid ${epicColor}28`, flexShrink: 0 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: epicColor, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{selectedEpic.name}</span>
          {selectedEpic.description && (
            <span style={{ fontSize: 12, color: token.colorTextSecondary }}>{selectedEpic.description}</span>
          )}
          <span style={{ fontSize: 12, color: token.colorTextTertiary, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {epicTasks.length} задач{crossTeamTasks.length > 0 ? ` · ${crossTeamTasks.length} из других команд` : ''}
          </span>
        </div>
      )}

      {epicTasks.length === 0 && !isLoading && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: token.colorTextTertiary, fontSize: 14 }}>
          В этом эпике нет задач с датами
        </div>
      )}

      {/* ── Timeline canvas (unified, handles both scroll axes) ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflow: 'auto', borderRadius: 10, border: bdr, background: '#13141a', minHeight: 0 }}
      >
        <div style={{ width: totalW, minWidth: totalW, position: 'relative' }}>

          {/* Sticky header with day ticks */}
          <div style={{
            height: HEADER_H,
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#13141a',
            borderBottom: bdr,
            pointerEvents: 'none',
          }}>
            {dayTicks.map((tick, i) => {
              const x = daysBetween(rangeStart, tick.date) * DAY_PX;
              return (
                <div key={i} style={{
                  position: 'absolute', left: x, bottom: 6,
                  fontSize: tick.isMonthStart ? 11 : 10,
                  fontWeight: tick.isMonthStart ? 600 : 400,
                  color: tick.isMonthStart ? token.colorTextSecondary : token.colorTextQuaternary,
                  whiteSpace: 'nowrap',
                }}>
                  {tick.label}
                </div>
              );
            })}
            <div style={{ position: 'absolute', left: todayX + 3, bottom: 6, fontSize: 10, fontWeight: 700, color: token.colorPrimary, whiteSpace: 'nowrap' }}>
              Сегодня
            </div>
          </div>

          {/* Canvas: bars + SVG arrows */}
          <div
            ref={canvasRef}
            style={{
              position: 'relative',
              height: canvasH,
              userSelect: 'none',
              cursor: connectingFrom ? 'crosshair' : 'default',
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => { if (!connectingFrom) setHoveredBarId(null); }}
          >
            {/* Today line */}
            <div style={{ position: 'absolute', top: 0, left: todayX, width: 2, height: canvasH, background: token.colorPrimary, opacity: 0.45, zIndex: 3, pointerEvents: 'none' }} />

            {/* Alternating row backgrounds */}
            {Array.from({ length: numRows }, (_, r) => (
              <div key={r} style={{ position: 'absolute', top: r * ROW_STRIDE + ROW_GAP, left: 0, right: 0, height: ROW_H, background: r % 2 === 0 ? 'rgba(255,255,255,0.012)' : 'transparent' }} />
            ))}

            {/* SVG: dep arrows + in-progress connection line */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: totalW, height: canvasH, pointerEvents: 'none', zIndex: 5 }}>
              <defs>
                <marker id="tl-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill={arrowColor} />
                </marker>
                <marker id="tl-arrow-active" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill={token.colorPrimary} />
                </marker>
              </defs>

              {visibleDeps.map((dep, i) => {
                const from = allVisible.find((t) => t.id === dep.fromId);
                const to = allVisible.find((t) => t.id === dep.toId);
                if (!from || !to) return null;
                const fx = xOf(from.end) + DAY_PX;
                const fy = from.row * ROW_STRIDE + ROW_GAP + ROW_H / 2;
                const tx = xOf(to.start);
                const ty = to.row * ROW_STRIDE + ROW_GAP + ROW_H / 2;
                const mid = (fx + tx) / 2;
                return (
                  <path key={i}
                    d={`M ${fx} ${fy} C ${mid} ${fy}, ${mid} ${ty}, ${tx} ${ty}`}
                    fill="none" stroke={arrowColor} strokeWidth={1.5} strokeDasharray="4 3"
                    markerEnd="url(#tl-arrow)"
                  />
                );
              })}

              {connectingFrom && cursorPos && (
                <path
                  d={`M ${connectingFrom.x} ${connectingFrom.y} C ${(connectingFrom.x + cursorPos.x) / 2} ${connectingFrom.y}, ${(connectingFrom.x + cursorPos.x) / 2} ${cursorPos.y}, ${cursorPos.x} ${cursorPos.y}`}
                  fill="none" stroke={token.colorPrimary} strokeWidth={2} strokeDasharray="4 3"
                  markerEnd="url(#tl-arrow-active)"
                />
              )}
            </svg>

            {/* Connection port DOM element (shown on bar hover) */}
            {portPos && hoveredTask && (
              <div
                onMouseDown={(e) => handlePortMouseDown(e, hoveredTask.id, portPos.x, portPos.y)}
                style={{
                  position: 'absolute',
                  left: portPos.x - PORT_R,
                  top: portPos.y - PORT_R,
                  width: PORT_R * 2,
                  height: PORT_R * 2,
                  borderRadius: '50%',
                  background: '#1a1b22',
                  border: `2px solid ${token.colorPrimary}`,
                  cursor: 'crosshair',
                  zIndex: 8,
                  boxShadow: `0 0 6px ${token.colorPrimary}80`,
                }}
              />
            )}

            {/* Task bars */}
            {allVisible.map((t) => {
              const x = xOf(t.start);
              const w = Math.max(DAY_PX, xOf(t.end) - x + DAY_PX);
              const y = t.row * ROW_STRIDE + ROW_GAP;
              const isTarget = !!(dragTargetId === t.id && connectingFrom && t.id !== connectingFrom.taskId);
              const isHovered = hoveredBarId === t.id;
              const tooltipContent = (
                <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{t.id}: {t.title}</div>
                  <div style={{ color: 'rgba(255,255,255,0.65)' }}>
                    {formatDate(t.start)} → {formatDate(t.end)}
                  </div>
                  {t.assignee && <div style={{ color: 'rgba(255,255,255,0.65)' }}>{t.assignee.name}</div>}
                  {t.isOtherTeam && <div style={{ color: token.colorTextQuaternary, fontSize: 11, marginTop: 2 }}>Другая команда</div>}
                </div>
              );

              return (
                <Tooltip key={t.id} title={tooltipContent} placement="top" open={connectingFrom ? false : undefined}>
                  <div
                    onMouseEnter={() => { if (!connectingFrom) setHoveredBarId(t.id); }}
                    onMouseLeave={() => setHoveredBarId(null)}
                    onClick={() => { if (!connectingFrom) navigate(`/tasks/${t.id}`); }}
                    style={{
                      position: 'absolute',
                      left: x,
                      top: y,
                      width: w,
                      height: ROW_H,
                      background: barBg(t),
                      borderRadius: BAR_RADIUS,
                      border: barBorder(t, isTarget),
                      cursor: connectingFrom ? 'crosshair' : 'pointer',
                      zIndex: 4,
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                      outline: isTarget ? `2px solid ${token.colorPrimary}40` : isHovered ? '1px solid rgba(255,255,255,0.15)' : 'none',
                      outlineOffset: isTarget ? 2 : 0,
                      transition: 'outline 0.1s, border-color 0.1s',
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden', padding: '0 8px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      {/* Status dot */}
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDotColor(t), flexShrink: 0 }} />
                      {/* Title */}
                      {w > 48 && (
                        <span style={{
                          fontSize: 11, fontWeight: 500,
                          color: t.isOtherTeam ? token.colorTextTertiary : 'rgba(255,255,255,0.80)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                        }}>
                          {t.title}
                        </span>
                      )}
                    </div>
                    {/* Assignee avatar */}
                    {w > 72 && t.assignee && (
                      <div style={{ paddingRight: 6, flexShrink: 0 }}>
                        <MiniAvatar user={t.assignee} size={24} />
                      </div>
                    )}
                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(e, t.id, t.end)}
                      title="Потяните, чтобы изменить срок"
                      style={{
                        width: RESIZE_ZONE,
                        height: '100%',
                        cursor: 'ew-resize',
                        background: isHovered ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                        borderRadius: `0 ${BAR_RADIUS}px ${BAR_RADIUS}px 0`,
                        flexShrink: 0,
                        transition: 'background 0.1s',
                      }}
                    />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hint when connecting */}
      {connectingFrom && (
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary, flexShrink: 0 }}>
          Отпустите над задачей, чтобы создать зависимость · Нажмите Esc для отмены
        </div>
      )}

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
