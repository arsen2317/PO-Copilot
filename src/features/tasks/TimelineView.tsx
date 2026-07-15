import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Skeleton, Tooltip, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Epic, Task, TaskStatus } from '../../data/types';

const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewRange = 'sprint' | 'month' | 'quarter' | 'halfyear' | 'year';

interface TimelineTask extends Task {
  start: Date;
  end: Date;
}

type Row =
  | { kind: 'group'; epic: Epic; taskCount: number }
  | { kind: 'task'; task: TimelineTask };

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS = [
  { value: 'sprint' as ViewRange, label: 'Спринт (2 нед.)' },
  { value: 'month' as ViewRange, label: 'Месяц' },
  { value: 'quarter' as ViewRange, label: 'Квартал' },
  { value: 'halfyear' as ViewRange, label: 'Полугодие' },
  { value: 'year' as ViewRange, label: 'Год' },
];

const DAY_PX_MAP: Record<ViewRange, number> = {
  sprint: 32,
  month: 26,
  quarter: 18,
  halfyear: 12,
  year: 8,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: '#555',
  todo: '#1668dc',
  in_progress: '#1677ff',
  review: '#d89614',
  done: '#49aa19',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Бэклог',
  todo: 'К выполнению',
  in_progress: 'В работе',
  review: 'На ревью',
  done: 'Готово',
};

const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614', u4: '#722ed1',
  u5: '#eb2f96', u6: '#13c2c2', u7: '#fa8c16', u8: '#c41d7f',
  u9: '#0958d9', u10: '#389e0d', u11: '#08979c',
};

const LEFT_W = 300;
const GROUP_ROW_H = 38;
const TASK_ROW_H = 44;
const BAR_H = 30;
const HEADER_H = 44;
const MONTH_ROW_H = 20;
const BAR_R = 15;
const TODAY = new Date('2026-07-15');

// The Gantt only covers this product's own roadmap (see AppSidebar "Дебетовые карты").
const PRODUCT_TEAM_ID = 'team-debit';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function isWeekend(d: Date): boolean { const w = d.getDay(); return w === 0 || w === 6; }

function parseDate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, day ?? 1);
}

function toStr(d: Date): string { return d.toISOString().slice(0, 10); }

function addCal(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

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

function buildTicks(bizDays: Date[], range: ViewRange, dayPx: number) {
  let step = 1;
  if (range === 'quarter') step = 5;
  else if (range === 'halfyear') step = 9;
  else if (range === 'year') step = 14;
  else if (range === 'month') step = 3;
  return bizDays
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % step === 0)
    .map(({ d, i }) => ({
      x: i * dayPx,
      label: d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
    }));
}

function buildMonthBands(bizDays: Date[], dayPx: number): { x: number; label: string; width: number }[] {
  const bands: { x: number; label: string; width: number }[] = [];
  let prevMonth = -1;
  bizDays.forEach((d, i) => {
    if (d.getMonth() !== prevMonth) {
      if (bands.length > 0) bands[bands.length - 1]!.width = i * dayPx - bands[bands.length - 1]!.x;
      bands.push({ x: i * dayPx, label: d.toLocaleDateString('ru', { month: 'long', year: 'numeric' }), width: 0 });
      prevMonth = d.getMonth();
    }
  });
  if (bands.length > 0) bands[bands.length - 1]!.width = bizDays.length * dayPx - bands[bands.length - 1]!.x;
  return bands;
}

function formatDuration(start: Date, end: Date): string {
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  if (days < 14) return `${days} дн.`;
  if (days < 60) return `~${Math.round(days / 7)} нед.`;
  return `~${Math.round(days / 30)} мес.`;
}

// ─── Small components ─────────────────────────────────────────────────────────

function MiniAvatar({ user, size = 22 }: { user: { id: string; name: string; avatar?: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', border: '1.5px solid #13141a' }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[user.id] ?? '#555',
      display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #13141a',
      fontSize: Math.floor(size * 0.38), fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  );
}

// Same "task summary" pattern used on the task detail page (status/priority/assignee/dates),
// reused here as the Gantt bar tooltip instead of building a separate card.
function TooltipCard({ task }: { task: TimelineTask }) {
  return (
    <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 200, maxWidth: 280 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[task.status], flexShrink: 0 }} />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{task.id}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>{STATUS_LABEL[task.status]}</span>
      </div>
      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6, lineHeight: 1.4 }}>{task.title}</div>
      {task.assignee && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <MiniAvatar user={task.assignee} size={16} />
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>{task.assignee.name}</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, color: 'rgba(255,255,255,0.45)', fontSize: 11, alignItems: 'center' }}>
        <span>{task.start.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
        <span>→</span>
        <span>{task.end.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
        {task.storyPoints !== undefined && <span style={{ marginLeft: 'auto' }}>{task.storyPoints} SP</span>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const navigate = useNavigate();

  const [range, setRange] = useState<ViewRange>('quarter');
  const scrollRef = useRef<HTMLDivElement>(null);

  const DAY_PX = DAY_PX_MAP[range];

  const { data: allTasks = [], isLoading: tl } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: allEpics = [], isLoading: el } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tl || el;

  const [rangeStart, rangeEnd] = useMemo(() => rangeWindow(range), [range]);
  const bizDays = useMemo(() => buildBizDays(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const totalW = Math.max(bizDays.length * DAY_PX, 400);
  const ticks = useMemo(() => buildTicks(bizDays, range, DAY_PX), [bizDays, range, DAY_PX]);
  const monthBands = useMemo(() => buildMonthBands(bizDays, DAY_PX), [bizDays, DAY_PX]);

  const xOf = useMemo(() => (d: Date): number => {
    const s = toStr(d);
    const idx = bizDays.findIndex((bd) => toStr(bd) >= s);
    return (idx === -1 ? bizDays.length : idx) * DAY_PX;
  }, [bizDays, DAY_PX]);

  const todayX = xOf(TODAY);

  // ── Feature groups: epic → its tasks, product-scoped ───────────────────────

  const epics = useMemo(() => allEpics.filter((e) => e.teamId === PRODUCT_TEAM_ID), [allEpics]);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    epics.forEach((epic) => {
      const tasks = allTasks
        .filter((t) => t.epicId === epic.id)
        .map((t): TimelineTask => {
          const startStr = t.startDate ?? t.createdAt ?? '2026-07-01';
          const endStr = t.deadline ?? toStr(addCal(parseDate(startStr), 7));
          let start = parseDate(startStr), end = parseDate(endStr);
          if (start > end) { const tmp = start; start = end; end = tmp; }
          return { ...t, start, end };
        })
        .sort((a, b) => a.start.getTime() - b.start.getTime());
      if (tasks.length === 0) return;
      out.push({ kind: 'group', epic, taskCount: tasks.length });
      tasks.forEach((task) => out.push({ kind: 'task', task }));
    });
    return out;
  }, [epics, allTasks]);

  const rowOffsets = useMemo(() => {
    let y = 0;
    return rows.map((row) => {
      const h = row.kind === 'group' ? GROUP_ROW_H : TASK_ROW_H;
      const top = y;
      y += h;
      return top;
    });
  }, [rows]);

  const totalRowsH = rowOffsets.length > 0
    ? rowOffsets[rowOffsets.length - 1]! + (rows[rows.length - 1]!.kind === 'group' ? GROUP_ROW_H : TASK_ROW_H)
    : 0;

  const totalTaskCount = allTasks.filter((t) => epics.some((e) => e.id === t.epicId)).length;

  // Scroll to today
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, todayX - 120);
  }, [todayX, rangeStart]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
          {epics.length} фич · {totalTaskCount} задач
        </span>
        <div style={{ flex: 1 }} />
        <Select value={range} onChange={(v) => setRange(v as ViewRange)} style={{ width: 160 }} size="small" options={VIEW_OPTIONS} />
      </div>

      {rows.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: token.colorTextTertiary }}>Нет задач с датами</div>
      )}

      {/* Gantt */}
      <div
        ref={scrollRef}
        className="content-scroll"
        style={{ flex: 1, overflow: 'auto', borderRadius: 10, border: bdr, background: '#13141a', minHeight: 0 }}
      >
        <div style={{ width: LEFT_W + totalW, position: 'relative' }}>

          {/* Header row: sticky top, corner cell sticky left */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, height: HEADER_H }}>
            <div style={{
              position: 'sticky', left: 0, zIndex: 21, width: LEFT_W, flexShrink: 0, height: HEADER_H,
              background: '#181920', borderRight: bdr, borderBottom: bdr,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Задачи</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Срок</span>
            </div>
            <div style={{ width: totalW, position: 'relative', height: HEADER_H, background: '#181920', borderBottom: bdr }}>
              {monthBands.map((band, i) => (
                <div key={i} style={{
                  position: 'absolute', left: band.x, top: 0, width: band.width, height: MONTH_ROW_H,
                  borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  fontSize: 11, fontWeight: 600, color: token.colorTextSecondary,
                  overflow: 'hidden', whiteSpace: 'nowrap',
                }}>
                  {band.label}
                </div>
              ))}
              {ticks.map((tick, i) => (
                <div key={i} style={{
                  position: 'absolute', left: tick.x + 4, top: MONTH_ROW_H + 4,
                  fontSize: 10, fontWeight: 400, color: token.colorTextQuaternary, whiteSpace: 'nowrap',
                }}>
                  {tick.label}
                </div>
              ))}
              <div style={{
                position: 'absolute', left: todayX + 4, top: MONTH_ROW_H + 3, fontSize: 10, fontWeight: 700,
                color: token.colorPrimary, background: `${token.colorPrimary}22`, borderRadius: 4, padding: '1px 6px',
                whiteSpace: 'nowrap',
              }}>
                Сегодня
              </div>
            </div>
          </div>

          {/* Today vertical line, spans all rows */}
          <div style={{
            position: 'absolute', top: HEADER_H, left: LEFT_W + todayX, width: 1, height: totalRowsH,
            background: token.colorPrimary, opacity: 0.45, zIndex: 3, pointerEvents: 'none',
          }} />

          {/* Rows */}
          {rows.map((row) => {
            const rowH = row.kind === 'group' ? GROUP_ROW_H : TASK_ROW_H;

            if (row.kind === 'group') {
              return (
                <div key={`g-${row.epic.id}`} style={{ display: 'flex', height: rowH }}>
                  <div style={{
                    position: 'sticky', left: 0, zIndex: 5, width: LEFT_W, flexShrink: 0, height: rowH,
                    background: '#181920', borderBottom: bdr,
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: row.epic.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.epic.name}
                    </span>
                    <span style={{ fontSize: 11, color: token.colorTextQuaternary, marginLeft: 'auto', flexShrink: 0 }}>{row.taskCount}</span>
                  </div>
                  <div style={{ width: totalW, height: rowH, background: '#15161b', borderBottom: bdr }} />
                </div>
              );
            }

            const t = row.task;
            const bx = xOf(t.start);
            const bw = Math.max(DAY_PX * 2, xOf(t.end) - bx + DAY_PX);
            const displayTitle = t.title.replace(/^\[.*?\]\s*/, '');

            return (
              <div key={t.id} style={{ display: 'flex', height: rowH }}>
                <div style={{
                  position: 'sticky', left: 0, zIndex: 5, width: LEFT_W, flexShrink: 0, height: rowH,
                  background: '#13141a', borderBottom: bdr,
                  display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 0 28px',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_COLORS[t.status], flexShrink: 0 }} />
                  <span
                    style={{ fontSize: 12.5, color: token.colorText, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  >
                    {displayTitle}
                  </span>
                  <span style={{ fontSize: 11, color: token.colorTextQuaternary, marginLeft: 'auto', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {formatDuration(t.start, t.end)}
                  </span>
                </div>

                <div style={{ width: totalW, height: rowH, position: 'relative', borderBottom: bdr }}>
                  <Tooltip title={<TooltipCard task={t} />} placement="top" mouseEnterDelay={0.4}>
                    <div
                      onClick={() => navigate(`/tasks/${t.id}`)}
                      style={{
                        position: 'absolute', left: bx, top: (rowH - BAR_H) / 2, width: bw, height: BAR_H,
                        borderRadius: BAR_R, background: '#1e1f22',
                        border: `1px solid ${STATUS_COLORS[t.status]}55`,
                        cursor: 'pointer', zIndex: 4, display: 'flex', alignItems: 'center',
                        padding: '0 4px 0 12px', gap: 6, overflow: 'hidden',
                        boxShadow: t.riskLevel === 'critical' && t.status !== 'done' ? `0 0 0 1px ${token.colorError}66` : undefined,
                      }}
                    >
                      <span style={{
                        fontSize: 11.5, fontWeight: 500, color: 'rgba(255,255,255,0.85)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0,
                      }}>
                        {displayTitle}
                      </span>
                      {t.assignee && (
                        <div style={{ flexShrink: 0, marginRight: -4 }}>
                          <MiniAvatar user={t.assignee} size={24} />
                        </div>
                      )}
                    </div>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
