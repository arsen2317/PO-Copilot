import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Select, Skeleton, Tag, Tooltip, theme } from 'antd';
import { ClockCircleOutlined, DeleteOutlined, FilterOutlined, LinkOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Task, TaskPriority } from '../../data/types';

const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewRange = 'sprint' | 'month' | 'quarter' | 'halfyear' | 'year';

interface TimelineTask extends Task {
  start: Date;
  end: Date;
  row: number;
  isOtherTeam: boolean;
}

interface Dep { fromId: string; toId: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS = [
  { value: 'sprint' as ViewRange, label: 'Спринт (2 нед.)' },
  { value: 'month' as ViewRange, label: 'Месяц' },
  { value: 'quarter' as ViewRange, label: 'Квартал' },
  { value: 'halfyear' as ViewRange, label: 'Полугодие' },
  { value: 'year' as ViewRange, label: 'Год' },
];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#ff4d4f', high: '#fa8c16', medium: '#1668dc', low: '#555',
};
const PRIORITY_LABEL: Record<TaskPriority, string> = {
  critical: 'Критический', high: 'Высокий', medium: 'Средний', low: 'Низкий',
};
const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614', u4: '#722ed1',
  u5: '#eb2f96', u6: '#13c2c2', u7: '#fa8c16', u8: '#c41d7f',
  u9: '#0958d9', u10: '#389e0d', u11: '#08979c',
};

const DAY_PX = 32;
const ROW_H = 36;
const ROW_GAP = 10;
const ROW_STRIDE = ROW_H + ROW_GAP;
const HEADER_H = 60;
const MONTH_ROW_H = 20;
const BAR_R = 6;
const HANDLE_W = 7;
const PORT_R = 7;
const TODAY = new Date('2026-07-02');

// ─── Calendar helpers (business days only) ────────────────────────────────────

function isWeekend(d: Date): boolean { const w = d.getDay(); return w === 0 || w === 6; }

function parseDate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, day ?? 1);
}

function toStr(d: Date): string { return d.toISOString().slice(0, 10); }

function addCal(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function addBiz(d: Date, n: number): Date {
  const r = new Date(d);
  // snap to weekday first
  while (isWeekend(r)) r.setDate(r.getDate() + 1);
  if (n === 0) return r;
  const step = n > 0 ? 1 : -1;
  let rem = Math.abs(n);
  while (rem > 0) { r.setDate(r.getDate() + step); if (!isWeekend(r)) rem--; }
  return r;
}

function buildBizDays(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const d = new Date(start); d.setHours(0, 0, 0, 0);
  const e = new Date(end); e.setHours(0, 0, 0, 0);
  while (d <= e) { if (!isWeekend(d)) out.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return out;
}

function rangeWindow(r: ViewRange): [Date, Date] {
  switch (r) {
    case 'sprint': return [addCal(TODAY, -3), addCal(TODAY, 11)];
    case 'month': return [new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0)];
    case 'quarter': { const q = Math.floor(TODAY.getMonth() / 3); return [new Date(TODAY.getFullYear(), q * 3, 1), new Date(TODAY.getFullYear(), q * 3 + 3, 0)]; }
    case 'halfyear': { const h = TODAY.getMonth() < 6 ? 0 : 6; return [new Date(TODAY.getFullYear(), h, 1), new Date(TODAY.getFullYear(), h + 6, 0)]; }
    case 'year': return [new Date(TODAY.getFullYear(), 0, 1), new Date(TODAY.getFullYear(), 11, 31)];
  }
}

function buildTicks(bizDays: Date[], range: ViewRange) {
  let step = 1;
  if (range === 'quarter') step = 5;
  else if (range === 'halfyear') step = 9;
  else if (range === 'year') step = 14;
  else if (range === 'month') step = 3;
  return bizDays
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % step === 0)
    .map(({ d, i }) => ({
      x: i * DAY_PX,
      label: d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
    }));
}

function buildMonthBands(bizDays: Date[]): { x: number; label: string; width: number }[] {
  const bands: { x: number; label: string; width: number }[] = [];
  let prevMonth = -1;
  bizDays.forEach((d, i) => {
    if (d.getMonth() !== prevMonth) {
      if (bands.length > 0) bands[bands.length - 1]!.width = i * DAY_PX - bands[bands.length - 1]!.x;
      bands.push({ x: i * DAY_PX, label: d.toLocaleDateString('ru', { month: 'long', year: 'numeric' }), width: 0 });
      prevMonth = d.getMonth();
    }
  });
  if (bands.length > 0) bands[bands.length - 1]!.width = bizDays.length * DAY_PX - bands[bands.length - 1]!.x;
  return bands;
}

// ─── Row assignment: 1 task per row, dep-connected tasks grouped ──────────────

function assignRows(tasks: TimelineTask[], deps: Dep[]): TimelineTask[] {
  if (!tasks.length) return [];
  const tmap = new Map(tasks.map((t) => [t.id, t]));
  const adj = new Map<string, Set<string>>();
  tasks.forEach((t) => adj.set(t.id, new Set()));
  deps.forEach((d) => {
    if (adj.has(d.fromId) && adj.has(d.toId)) {
      adj.get(d.fromId)!.add(d.toId);
      adj.get(d.toId)!.add(d.fromId);
    }
  });
  const visited = new Set<string>();
  const comps: string[][] = [];
  for (const t of tasks) {
    if (visited.has(t.id)) continue;
    const comp: string[] = [];
    const q = [t.id];
    while (q.length) {
      const id = q.shift()!;
      if (visited.has(id)) continue;
      visited.add(id); comp.push(id);
      adj.get(id)?.forEach((nid) => { if (!visited.has(nid)) q.push(nid); });
    }
    comp.sort((a, b) => (tmap.get(a)?.start.getTime() ?? 0) - (tmap.get(b)?.start.getTime() ?? 0));
    comps.push(comp);
  }
  comps.sort((a, b) => (tmap.get(a[0]!)?.start.getTime() ?? 0) - (tmap.get(b[0]!)?.start.getTime() ?? 0));
  let row = 0;
  const rmap = new Map<string, number>();
  for (const comp of comps) for (const id of comp) rmap.set(id, row++);
  return tasks.map((t) => ({ ...t, row: rmap.get(t.id) ?? 0 }));
}

// ─── Small components ─────────────────────────────────────────────────────────

function MiniAvatar({ user, size = 22 }: { user: { id: string; name: string; avatar?: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block' }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[user.id] ?? '#555',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.floor(size * 0.38), fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

function TooltipCard({ task }: { task: TimelineTask }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 200, maxWidth: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: PRIORITY_COLORS[task.priority], flexShrink: 0 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{task.id}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{PRIORITY_LABEL[task.priority]}</span>
      </div>
      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
      {task.assignee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <MiniAvatar user={task.assignee} size={16} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{task.assignee.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, color: 'rgba(255,255,255,0.45)', fontSize: 11, alignItems: 'center' }}>
        <ClockCircleOutlined style={{ fontSize: 10 }} />
        <span>{task.start.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
        <span>→</span>
        <span>{task.end.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
        {task.storyPoints !== undefined && <span style={{ marginLeft: 'auto' }}>{task.storyPoints} SP</span>}
      </div>
      {task.isOtherTeam && <div style={{ marginTop: 4, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Другая команда</div>}
    </div>
  );
}

function ManageDepsModal({ open, onClose, tasks, deps, onChange }: {
  open: boolean; onClose: () => void; tasks: Task[]; deps: Dep[]; onChange: (d: Dep[]) => void;
}) {
  const { token } = useToken();
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const opts = tasks.map((t) => ({ value: t.id, label: `${t.id} — ${t.title.slice(0, 50)}` }));
  const add = () => {
    if (!fromId || !toId || fromId === toId) return;
    if (deps.some((d) => d.fromId === fromId && d.toId === toId)) return;
    onChange([...deps, { fromId, toId }]);
    setFromId(null); setToId(null);
  };
  return (
    <Modal open={open} title="Управление зависимостями" onCancel={onClose} footer={null} width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select placeholder="Блокирующая (FROM)" showSearch optionFilterProp="label" style={{ flex: 1 }} options={opts} value={fromId} onChange={setFromId} />
          <span style={{ color: token.colorTextTertiary }}>→</span>
          <Select placeholder="Зависимая (TO)" showSearch optionFilterProp="label" style={{ flex: 1 }} options={opts} value={toId} onChange={setToId} />
          <Button icon={<PlusOutlined />} type="primary" onClick={add} disabled={!fromId || !toId} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {deps.length === 0 && (
            <div style={{ color: token.colorTextTertiary, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Зависимостей нет</div>
          )}
          {deps.map((dep, i) => {
            const fr = tasks.find((t) => t.id === dep.fromId);
            const to = tasks.find((t) => t.id === dep.toId);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: token.colorFillSecondary, borderRadius: 6 }}>
                <Tag style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{dep.fromId}</Tag>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fr?.title.slice(0, 30)}</span>
                <span style={{ color: token.colorTextTertiary }}>→</span>
                <Tag style={{ margin: 0, fontFamily: 'monospace', fontSize: 11 }}>{dep.toId}</Tag>
                <span style={{ fontSize: 12, color: token.colorTextSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{to?.title.slice(0, 30)}</span>
                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onChange(deps.filter((_, j) => j !== i))} />
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const navigate = useNavigate();

  const [range, setRange] = useState<ViewRange>('quarter');
  const [selectedEpicId, setSelectedEpicId] = useState('EPIC-6');
  const [extraDeps, setExtraDeps] = useState<Dep[]>([]);
  const [removedDeps, setRemovedDeps] = useState<Set<string>>(new Set());
  const [depsModalOpen, setDepsModalOpen] = useState(false);
  const [taskDates, setTaskDates] = useState<Record<string, { start?: string; end?: string }>>({});
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<{ taskId: string; x: number; y: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Snapshot of taskDates at resize mousedown (to always compute from original)
  const snapRef = useRef<Record<string, { start?: string; end?: string }>>({});

  const { data: allTasks = [], isLoading: tl } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: epics = [], isLoading: el } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tl || el;

  // ── Deps ────────────────────────────────────────────────────────────────────

  const fixturedDeps = useMemo<Dep[]>(() => {
    const r: Dep[] = [];
    allTasks.forEach((t) => (t.dependencies ?? []).forEach((fid) => r.push({ fromId: fid, toId: t.id })));
    return r;
  }, [allTasks]);

  const deps = useMemo<Dep[]>(() => {
    const key = (d: Dep) => `${d.fromId}→${d.toId}`;
    const combined = [...fixturedDeps, ...extraDeps].filter((d) => !removedDeps.has(key(d)));
    const seen = new Set<string>();
    return combined.filter((d) => { const k = key(d); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [fixturedDeps, extraDeps, removedDeps]);

  const setDeps = useCallback((nd: Dep[]) => {
    const fk = new Set(fixturedDeps.map((d) => `${d.fromId}→${d.toId}`));
    setExtraDeps(nd.filter((d) => !fk.has(`${d.fromId}→${d.toId}`)));
    setRemovedDeps(new Set(
      fixturedDeps.filter((d) => !nd.some((x) => x.fromId === d.fromId && x.toId === d.toId))
        .map((d) => `${d.fromId}→${d.toId}`),
    ));
  }, [fixturedDeps]);

  const addDep = useCallback((dep: Dep) => {
    if (deps.some((d) => d.fromId === dep.fromId && d.toId === dep.toId)) return;
    setExtraDeps((prev) => [...prev, dep]);
  }, [deps]);

  // ── Calendar ────────────────────────────────────────────────────────────────

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);
  const epicTeamId = selectedEpic?.teamId ?? 'team-debit';
  const epicColor = selectedEpic?.color ?? token.colorPrimary;

  const [rangeStart, rangeEnd] = useMemo(() => rangeWindow(range), [range]);
  const bizDays = useMemo(() => buildBizDays(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const totalW = Math.max(bizDays.length * DAY_PX, 400);
  const ticks = useMemo(() => buildTicks(bizDays, range), [bizDays, range]);
  const monthBands = useMemo(() => buildMonthBands(bizDays), [bizDays]);

  // Maps date → pixel x (left edge of that business day column)
  const xOf = useCallback((d: Date): number => {
    const s = toStr(d);
    const idx = bizDays.findIndex((bd) => toStr(bd) >= s);
    return (idx === -1 ? bizDays.length : idx) * DAY_PX;
  }, [bizDays]);

  const todayX = xOf(TODAY);

  // ── Data derivation ─────────────────────────────────────────────────────────

  const epicTasks = useMemo(() => allTasks.filter((t) => t.epicId === selectedEpicId), [allTasks, selectedEpicId]);
  const epicTaskIds = useMemo(() => new Set(epicTasks.map((t) => t.id)), [epicTasks]);

  const crossTeamTasks = useMemo(() => {
    const ids = new Set<string>();
    deps.forEach((d) => {
      if (epicTaskIds.has(d.toId) && !epicTaskIds.has(d.fromId)) ids.add(d.fromId);
      if (epicTaskIds.has(d.fromId) && !epicTaskIds.has(d.toId)) ids.add(d.toId);
    });
    return allTasks.filter((t) => ids.has(t.id));
  }, [allTasks, deps, epicTaskIds]);

  const resolveTask = useCallback((t: Task): TimelineTask => {
    const ov = taskDates[t.id];
    const startStr = ov?.start ?? t.startDate ?? t.createdAt ?? '2026-07-01';
    const endStr = ov?.end ?? t.deadline ?? toStr(addCal(parseDate(startStr), 7));
    const s = parseDate(startStr), e = parseDate(endStr);
    return { ...t, start: s <= e ? s : e, end: s <= e ? e : s, row: 0, isOtherTeam: t.teamId !== epicTeamId };
  }, [taskDates, epicTeamId]);

  const allUnranked = useMemo(
    () => [...epicTasks, ...crossTeamTasks].map(resolveTask),
    [epicTasks, crossTeamTasks, resolveTask],
  );

  const allVisible = useMemo(() => assignRows(allUnranked, deps), [allUnranked, deps]);
  const allVisibleIds = useMemo(() => new Set(allVisible.map((t) => t.id)), [allVisible]);
  const visibleDeps = useMemo(() => deps.filter((d) => allVisibleIds.has(d.fromId) && allVisibleIds.has(d.toId)), [deps, allVisibleIds]);

  const numRows = allVisible.length > 0 ? Math.max(...allVisible.map((t) => t.row)) + 1 : 1;
  const canvasH = numRows * ROW_STRIDE + ROW_GAP * 2;

  // ── Parent end constraint for child start ───────────────────────────────────

  const getParentConstraint = useCallback((taskId: string): Date | null => {
    let max: Date | null = null;
    deps.forEach((d) => {
      if (d.toId !== taskId) return;
      const p = allVisible.find((t) => t.id === d.fromId);
      if (p && (!max || p.end > max)) max = p.end;
    });
    return max;
  }, [deps, allVisible]);

  // ── Hit test ────────────────────────────────────────────────────────────────

  const findTaskAt = useCallback((x: number, y: number): string | null => {
    for (const t of allVisible) {
      const tx = xOf(t.start);
      const tw = Math.max(DAY_PX, xOf(t.end) - tx + DAY_PX);
      const ty = t.row * ROW_STRIDE;
      if (x >= tx && x <= tx + tw && y >= ty && y <= ty + ROW_STRIDE) return t.id;
    }
    return null;
  }, [allVisible, xOf]);

  // ── Resize (start or end edge) ──────────────────────────────────────────────

  const handleResizeDown = useCallback((
    e: React.MouseEvent,
    taskId: string,
    edge: 'start' | 'end',
    origStart: Date,
    origEnd: Date,
  ) => {
    e.stopPropagation(); e.preventDefault();
    const startClientX = e.clientX;
    const parentCons = edge === 'start' ? getParentConstraint(taskId) : null;
    // Capture snapshot of all dates at this moment
    snapRef.current = { ...taskDates };

    const cascade = (
      next: Record<string, { start?: string; end?: string }>,
      fromId: string,
      bizDelta: number,
    ) => {
      deps.forEach((dep) => {
        if (dep.fromId !== fromId) return;
        const child = allTasks.find((t) => t.id === dep.toId);
        if (!child) return;
        const base = snapRef.current;
        const cs = base[dep.toId]?.start ?? child.startDate ?? child.createdAt ?? '2026-07-01';
        const ce = base[dep.toId]?.end ?? child.deadline ?? toStr(addCal(parseDate(cs), 7));
        next[dep.toId] = {
          start: toStr(addBiz(parseDate(cs), bizDelta)),
          end: toStr(addBiz(parseDate(ce), bizDelta)),
        };
        cascade(next, dep.toId, bizDelta);
      });
    };

    const onMove = (me: MouseEvent) => {
      const bizDelta = Math.round((me.clientX - startClientX) / DAY_PX);
      setTaskDates(() => {
        const next = { ...snapRef.current };
        const orig = allTasks.find((t) => t.id === taskId);
        const baseStart = snapRef.current[taskId]?.start ?? orig?.startDate ?? orig?.createdAt ?? '2026-07-01';
        const baseEnd = snapRef.current[taskId]?.end ?? orig?.deadline ?? toStr(addCal(parseDate(baseStart), 7));

        if (edge === 'end') {
          const newEnd = addBiz(origEnd, bizDelta);
          if (newEnd <= parseDate(baseStart)) return snapRef.current;
          next[taskId] = { start: baseStart, end: toStr(newEnd) };
          cascade(next, taskId, bizDelta);
        } else {
          let newStart = addBiz(origStart, bizDelta);
          if (parentCons && newStart < parentCons) newStart = new Date(parentCons);
          if (newStart >= parseDate(baseEnd)) return snapRef.current;
          next[taskId] = { start: toStr(newStart), end: baseEnd };
        }
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [allTasks, deps, getParentConstraint, taskDates]);

  // ── Connection drag ─────────────────────────────────────────────────────────

  const handlePortDown = useCallback((e: React.MouseEvent, taskId: string, px: number, py: number) => {
    e.stopPropagation(); e.preventDefault();
    setConnectingFrom({ taskId, x: px, y: py });
    setCursorPos({ x: px, y: py });
  }, []);

  const handleCanvasMove = useCallback((e: React.MouseEvent) => {
    if (!connectingFrom || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    setCursorPos({ x, y });
    setDragTargetId(findTaskAt(x, y));
  }, [connectingFrom, findTaskAt]);

  const handleCanvasUp = useCallback((e: React.MouseEvent) => {
    if (!connectingFrom || !canvasRef.current) return;
    const r = canvasRef.current.getBoundingClientRect();
    const tid = findTaskAt(e.clientX - r.left, e.clientY - r.top);
    if (tid && tid !== connectingFrom.taskId) addDep({ fromId: connectingFrom.taskId, toId: tid });
    setConnectingFrom(null); setCursorPos(null); setDragTargetId(null);
  }, [connectingFrom, findTaskAt, addDep]);

  useEffect(() => {
    if (!connectingFrom) return;
    const cancel = () => { setConnectingFrom(null); setCursorPos(null); setDragTargetId(null); };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cancel(); };
    window.addEventListener('mouseup', cancel);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mouseup', cancel); window.removeEventListener('keydown', onKey); };
  }, [connectingFrom]);

  // Scroll to today
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - 120);
  }, [todayX, rangeStart]);

  // ── Style helpers ───────────────────────────────────────────────────────────

  const barBg = (t: TimelineTask) => {
    if (t.isOtherTeam) return 'rgba(150,150,170,0.05)';
    if (t.status === 'done') return 'rgba(73,170,25,0.09)';
    if (t.status === 'in_progress') return 'rgba(22,104,220,0.13)';
    if (t.status === 'review') return 'rgba(216,150,20,0.11)';
    return 'rgba(255,255,255,0.04)';
  };

  const barBorder = (t: TimelineTask, isTarget: boolean) => {
    if (isTarget) return `2px solid ${token.colorPrimary}`;
    if (t.isOtherTeam) return '1px dashed rgba(255,255,255,0.08)';
    if (t.riskLevel === 'critical' && t.status !== 'done') return `1.5px solid ${token.colorError}55`;
    if (t.status === 'done') return '1px solid rgba(73,170,25,0.20)';
    return '1px solid rgba(255,255,255,0.08)';
  };

  const arrowColor = 'rgba(180,180,220,0.32)';

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  const epicOptions = epics.map((e) => ({
    value: e.id,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, display: 'inline-block', flexShrink: 0 }} />
        {e.name}
      </div>
    ),
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
        <FilterOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
        <Select value={selectedEpicId} onChange={setSelectedEpicId} style={{ width: 260 }} size="small" options={epicOptions} />
        <Select value={range} onChange={(v) => setRange(v as ViewRange)} style={{ width: 160 }} size="small" options={VIEW_OPTIONS} />
        <div style={{ flex: 1 }} />
        <Button size="small" icon={<LinkOutlined />} onClick={() => setDepsModalOpen(true)} style={{ fontSize: 12 }}>
          Зависимости
        </Button>
      </div>

      {/* Epic pill */}
      {selectedEpic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '5px 12px', background: `${epicColor}10`, borderRadius: 8, border: `1px solid ${epicColor}25`, flexShrink: 0 }}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: epicColor, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{selectedEpic.name}</span>
          <span style={{ fontSize: 12, color: token.colorTextTertiary, marginLeft: 'auto' }}>
            {epicTasks.length} задач{crossTeamTasks.length > 0 ? ` · ${crossTeamTasks.length} из других команд` : ''}
          </span>
        </div>
      )}

      {epicTasks.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: token.colorTextTertiary }}>В этом эпике нет задач с датами</div>
      )}

      {/* Scroll container */}
      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', borderRadius: 10, border: bdr, background: '#13141a', minHeight: 0 }}>
        <div style={{ width: totalW, minWidth: totalW, position: 'relative' }}>

          {/* Sticky header */}
          <div style={{ height: HEADER_H, position: 'sticky', top: 0, zIndex: 10, background: '#13141a', borderBottom: bdr, pointerEvents: 'none' }}>
            {/* Month band (upper row) */}
            {monthBands.map((band, i) => (
              <div key={i} style={{
                position: 'absolute', left: band.x, top: 0, width: band.width, height: MONTH_ROW_H,
                borderRight: `1px solid rgba(255,255,255,0.07)`,
                borderBottom: `1px solid rgba(255,255,255,0.07)`,
                display: 'flex', alignItems: 'center', paddingLeft: 8,
                fontSize: 11, fontWeight: 600, color: token.colorTextSecondary,
                overflow: 'hidden', whiteSpace: 'nowrap',
              }}>
                {band.label}
              </div>
            ))}
            {/* Day/week ticks (lower row) */}
            {ticks.map((tick, i) => (
              <div key={i} style={{
                position: 'absolute', left: tick.x + 4, top: MONTH_ROW_H + 4,
                fontSize: 10, fontWeight: 400, color: token.colorTextQuaternary, whiteSpace: 'nowrap',
              }}>
                {tick.label}
              </div>
            ))}
            <div style={{ position: 'absolute', left: todayX + 4, top: MONTH_ROW_H + 4, fontSize: 10, fontWeight: 700, color: token.colorPrimary, whiteSpace: 'nowrap' }}>
              Сегодня
            </div>
          </div>

          {/* Canvas */}
          <div
            ref={canvasRef}
            style={{ position: 'relative', height: canvasH, userSelect: 'none', cursor: connectingFrom ? 'crosshair' : 'default' }}
            onMouseMove={handleCanvasMove}
            onMouseUp={handleCanvasUp}
            onMouseLeave={() => { if (!connectingFrom) setHoveredBarId(null); }}
          >
            {/* Today line */}
            <div style={{ position: 'absolute', top: 0, left: todayX, width: 1, height: canvasH, background: token.colorPrimary, opacity: 0.5, zIndex: 3, pointerEvents: 'none' }} />

            {/* Row stripes */}
            {Array.from({ length: numRows }, (_, r) => (
              <div key={r} style={{
                position: 'absolute', top: r * ROW_STRIDE, left: 0, right: 0, height: ROW_STRIDE,
                background: r % 2 === 0 ? 'rgba(255,255,255,0.010)' : 'transparent',
              }} />
            ))}

            {/* SVG: dep arrows + live line */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: totalW, height: canvasH, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}>
              <defs>
                <marker id="tl-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill={arrowColor} />
                </marker>
                <marker id="tl-arr-live" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7 Z" fill={token.colorPrimary} />
                </marker>
              </defs>

              {visibleDeps.map((dep, i) => {
                const fr = allVisible.find((t) => t.id === dep.fromId);
                const to = allVisible.find((t) => t.id === dep.toId);
                if (!fr || !to) return null;
                // exit from right edge of from-bar, enter left edge of to-bar
                const fx = xOf(fr.end) + DAY_PX;
                const fy = fr.row * ROW_STRIDE + ROW_GAP / 2 + ROW_H / 2;
                const tx = xOf(to.start);
                const ty = to.row * ROW_STRIDE + ROW_GAP / 2 + ROW_H / 2;
                let d: string;
                if (tx >= fx + 4) {
                  // forward: simple L-elbow
                  const mx = fx + (tx - fx) / 2;
                  d = `M ${fx} ${fy} H ${mx} V ${ty} H ${tx}`;
                } else {
                  // backward dep: route above both bars so arrow still arrives left→right
                  const gap = 14;
                  const routeY = Math.min(fy, ty) - ROW_H / 2 - 6;
                  d = `M ${fx} ${fy} H ${fx + gap} V ${routeY} H ${tx - gap} V ${ty} H ${tx}`;
                }
                return (
                  <path key={i} d={d}
                    fill="none" stroke={arrowColor} strokeWidth={1.5}
                    markerEnd="url(#tl-arr)"
                  />
                );
              })}

              {connectingFrom && cursorPos && (
                <path
                  d={`M ${connectingFrom.x} ${connectingFrom.y} C ${connectingFrom.x + 60},${connectingFrom.y} ${cursorPos.x - 60},${cursorPos.y} ${cursorPos.x},${cursorPos.y}`}
                  fill="none" stroke={token.colorPrimary} strokeWidth={2} strokeDasharray="5 3"
                  markerEnd="url(#tl-arr-live)"
                />
              )}
            </svg>

            {/* Task bars */}
            {allVisible.map((t) => {
              const bx = xOf(t.start);
              const bw = Math.max(DAY_PX, xOf(t.end) - bx + DAY_PX);
              const by = t.row * ROW_STRIDE + ROW_GAP / 2;
              const isTarget = !!(dragTargetId === t.id && connectingFrom && t.id !== connectingFrom.taskId);
              const isHov = hoveredBarId === t.id;

              return (
                <Tooltip
                  key={t.id}
                  title={<TooltipCard task={t} />}
                  placement="top"
                  open={connectingFrom ? false : undefined}
                  mouseEnterDelay={0.5}
                >
                  <div
                    onMouseEnter={() => { if (!connectingFrom) setHoveredBarId(t.id); }}
                    onMouseLeave={() => setHoveredBarId(null)}
                    onClick={() => { if (!connectingFrom) navigate(`/tasks/${t.id}`); }}
                    style={{
                      position: 'absolute', left: bx, top: by, width: bw, height: ROW_H,
                      background: barBg(t), borderRadius: BAR_R, border: barBorder(t, isTarget),
                      cursor: connectingFrom ? 'crosshair' : 'pointer',
                      zIndex: 4, display: 'flex', alignItems: 'center',
                      // overflow:visible so the port dot can stick out to the right
                      overflow: 'visible',
                      outline: isHov && !isTarget ? '1px solid rgba(255,255,255,0.12)' : 'none',
                      outlineOffset: 1,
                    }}
                  >
                    {/* Left handle (resize start) */}
                    <div
                      onMouseDown={(e) => handleResizeDown(e, t.id, 'start', t.start, t.end)}
                      style={{
                        width: HANDLE_W, height: '100%', cursor: 'ew-resize', flexShrink: 0,
                        background: isHov ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                        borderRadius: `${BAR_R}px 0 0 ${BAR_R}px`,
                      }}
                    />

                    {/* Bar content — inner overflow:hidden clips text */}
                    <div style={{ flex: 1, overflow: 'hidden', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: PRIORITY_COLORS[t.priority], flexShrink: 0,
                      }} />
                      {bw > 52 && (
                        <span style={{
                          fontSize: 11, fontWeight: 500,
                          color: t.isOtherTeam ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.82)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                        }}>
                          {t.title}
                        </span>
                      )}
                    </div>

                    {/* Assignee avatar */}
                    {bw > 72 && t.assignee && (
                      <div style={{ paddingRight: 5, flexShrink: 0 }}>
                        <MiniAvatar user={t.assignee} size={22} />
                      </div>
                    )}

                    {/* Right handle (resize end) */}
                    <div
                      onMouseDown={(e) => handleResizeDown(e, t.id, 'end', t.start, t.end)}
                      style={{
                        width: HANDLE_W, height: '100%', cursor: 'ew-resize', flexShrink: 0,
                        background: isHov ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.03)',
                        borderRadius: `0 ${BAR_R}px ${BAR_R}px 0`,
                      }}
                    />

                    {/* Port dot — child of bar so onMouseLeave doesn't fire when hovering it */}
                    {isHov && !connectingFrom && (
                      <div
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handlePortDown(e, t.id, bx + bw, by + ROW_H / 2);
                        }}
                        style={{
                          position: 'absolute',
                          right: -PORT_R,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: PORT_R * 2,
                          height: PORT_R * 2,
                          borderRadius: '50%',
                          background: '#0e0f14',
                          border: `2.5px solid ${token.colorPrimary}`,
                          cursor: 'crosshair',
                          zIndex: 15,
                          boxShadow: `0 0 10px ${token.colorPrimary}88`,
                          pointerEvents: 'all',
                        }}
                      />
                    )}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>

      {connectingFrom && (
        <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextTertiary, flexShrink: 0 }}>
          Отпустите на задаче, чтобы создать связь · Esc для отмены
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
