import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Select, Skeleton, Tooltip, theme } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Epic, Task, TaskStatus } from '../../data/types';

const { useToken } = theme;

// ─── Types ────────────────────────────────────────────────────────────────────

// Scale = column unit, not a fixed date window — the timeline itself scrolls
// infinitely (in both directions) at whatever zoom the user picks.
type Scale = 'week' | 'sprint' | 'month';

interface TimelineTask extends Task {
  start: Date;
  end: Date;
}

type Row =
  | { kind: 'group'; epic: Epic; taskCount: number }
  | { kind: 'task'; task: TimelineTask };

// ─── Constants ────────────────────────────────────────────────────────────────

const SCALE_OPTIONS: { value: Scale; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'sprint', label: 'Спринт (2 нед.)' },
  { value: 'month', label: 'Месяц' },
];

// px per calendar day at each zoom level (drives both bar width and column grid).
const SCALE_PX_PER_DAY: Record<Scale, number> = {
  week: 18,
  sprint: 10,
  month: 6.5,
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
const YEAR_ROW_H = 16;
const MONTH_ROW_H = 22;
const TICK_ROW_H = 18;
const HEADER_H = YEAR_ROW_H + MONTH_ROW_H + TICK_ROW_H;
const BAR_R = 15;
const TODAY = new Date('2026-07-15');

// A fixed Monday anchor so sprint/week grid boundaries stay stable no matter
// how far the timeline gets scrolled/expanded in either direction.
const ANCHOR_MONDAY = new Date(2026, 0, 5);

// Contrast between the issues panel and the timeline itself.
const LEFT_BG = '#1a1b20';
const LEFT_BG_GROUP = '#212228';
const RIGHT_BG = '#0f1013';
const RIGHT_BG_GROUP = '#181922';

// Infinite horizontal scroll: grow the rendered window as the user nears an edge.
const EXPAND_CHUNK_DAYS = 90;
const EXPAND_THRESHOLD_PX = 400;
const MAX_SPAN_DAYS = 365 * 20;

// The Gantt only covers this product's own roadmap (see AppSidebar "Дебетовые карты").
const PRODUCT_TEAM_ID = 'team-debit';

// ─── Calendar helpers ─────────────────────────────────────────────────────────

function parseDate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, day ?? 1);
}

function toStr(d: Date): string { return d.toISOString().slice(0, 10); }

function addCal(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function daysBetween(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000); }

function formatDuration(start: Date, end: Date): string {
  const days = Math.max(1, daysBetween(start, end) + 1);
  if (days < 14) return `${days} дн.`;
  if (days < 60) return `~${Math.round(days / 7)} нед.`;
  return `~${Math.round(days / 30)} мес.`;
}

// ─── Small components ─────────────────────────────────────────────────────────

function MiniAvatar({ user, size = 22 }: { user: { id: string; name: string; avatar?: string }; size?: number }) {
  const initials = user.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  if (user.avatar) {
    return <img src={user.avatar} alt={user.name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, display: 'block', border: `1.5px solid ${RIGHT_BG}` }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: AVATAR_COLORS[user.id] ?? '#555',
      display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${RIGHT_BG}`,
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

  const [scale, setScale] = useState<Scale>('month');
  // The rendered window — grows outward as the user scrolls near either edge;
  // it is not a "filter", just how much of the infinite calendar is materialized.
  const [rangeStart, setRangeStart] = useState<Date>(() => addCal(TODAY, -90));
  const [rangeEnd, setRangeEnd] = useState<Date>(() => addCal(TODAY, 270));

  const [visibleYear, setVisibleYear] = useState<number>(TODAY.getFullYear());

  const scrollRef = useRef<HTMLDivElement>(null);
  const pendingLeftExpandPx = useRef(0);
  const didInitScroll = useRef(false);

  const pxPerDay = SCALE_PX_PER_DAY[scale];

  const { data: allTasks = [], isLoading: tl } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: allEpics = [], isLoading: el } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tl || el;

  const totalDays = daysBetween(rangeStart, rangeEnd);
  const totalW = Math.max(totalDays * pxPerDay, 400);

  const xOf = useCallback((d: Date): number => daysBetween(rangeStart, d) * pxPerDay, [rangeStart, pxPerDay]);
  const todayX = xOf(TODAY);

  // ── Header grid: years / months / (week|sprint ticks) ───────────────────────

  const monthBands = useMemo(() => {
    const bands: { x: number; width: number; label: string }[] = [];
    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor <= rangeEnd) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const bandStart = cursor < rangeStart ? rangeStart : cursor;
      const bandEnd = next > rangeEnd ? rangeEnd : next;
      bands.push({
        x: xOf(bandStart),
        width: Math.max(1, xOf(bandEnd) - xOf(bandStart)),
        label: cursor.toLocaleDateString('ru', { month: 'long' }),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return bands;
  }, [rangeStart, rangeEnd, xOf]);

  const ticks = useMemo(() => {
    if (scale === 'month') return [];
    const stepDays = scale === 'week' ? 7 : 14;
    const fromAnchor = daysBetween(ANCHOR_MONDAY, rangeStart);
    const rem = ((fromAnchor % stepDays) + stepDays) % stepDays;
    const first = addCal(rangeStart, rem === 0 ? 0 : stepDays - rem);
    const out: { x: number; label: string }[] = [];
    for (let d = first; d <= rangeEnd; d = addCal(d, stepDays)) {
      out.push({ x: xOf(d), label: d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) });
    }
    return out;
  }, [rangeStart, rangeEnd, scale, xOf]);

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

  const totalRowsH = useMemo(
    () => rows.reduce((sum, row) => sum + (row.kind === 'group' ? GROUP_ROW_H : TASK_ROW_H), 0),
    [rows],
  );

  const totalTaskCount = allTasks.filter((t) => epics.some((e) => e.id === t.epicId)).length;

  // ── Infinite horizontal scroll ──────────────────────────────────────────────

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    setVisibleYear(addCal(rangeStart, Math.round(el.scrollLeft / pxPerDay)).getFullYear());

    if (daysBetween(rangeStart, rangeEnd) >= MAX_SPAN_DAYS) return;
    if (el.scrollLeft < EXPAND_THRESHOLD_PX) {
      pendingLeftExpandPx.current += EXPAND_CHUNK_DAYS * pxPerDay;
      setRangeStart((prev) => addCal(prev, -EXPAND_CHUNK_DAYS));
    }
    const remainingRight = el.scrollWidth - el.clientWidth - el.scrollLeft;
    if (remainingRight < EXPAND_THRESHOLD_PX) {
      setRangeEnd((prev) => addCal(prev, EXPAND_CHUNK_DAYS));
    }
  }, [rangeStart, rangeEnd, pxPerDay]);

  // Compensate scrollLeft after a leftward expansion so the visible dates don't jump.
  useLayoutEffect(() => {
    if (pendingLeftExpandPx.current > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft += pendingLeftExpandPx.current;
      pendingLeftExpandPx.current = 0;
    }
  }, [rangeStart]);

  // Initial scroll position: centered on today. Depends on rows.length too —
  // the Gantt (and its ref) only mounts once loading finishes, so `xOf` alone
  // wouldn't retrigger this (its identity is unchanged across that transition).
  useEffect(() => {
    if (didInitScroll.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = Math.max(0, xOf(TODAY) - 220);
    didInitScroll.current = true;
  }, [xOf, rows.length]);

  const scrollToToday = () => {
    if (scrollRef.current) scrollRef.current.scrollLeft = Math.max(0, xOf(TODAY) - 220);
    setVisibleYear(TODAY.getFullYear());
  };

  // Changing scale keeps the same rangeStart/rangeEnd window but a very different
  // pxPerDay, which would otherwise leave the scroll position pointing at an
  // unrelated date — recenter on today. Done here (not in an effect keyed on
  // `scale`) so it runs once, from the event that actually changed the scale,
  // after the re-render with the new pxPerDay has committed.
  const handleScaleChange = (v: string) => {
    const next = v as Scale;
    setScale(next);
    setVisibleYear(TODAY.getFullYear());
    requestAnimationFrame(() => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollLeft = Math.max(0, daysBetween(rangeStart, TODAY) * SCALE_PX_PER_DAY[next] - 220);
    });
  };

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: token.colorTextTertiary }}>
          {epics.length} фич · {totalTaskCount} задач
        </span>
        <div style={{ flex: 1 }} />
        <Button size="small" type="text" onClick={scrollToToday} style={{ fontSize: 12, color: token.colorTextTertiary }}>
          Сегодня
        </Button>
        <Select value={scale} onChange={handleScaleChange} style={{ width: 160 }} size="small" options={SCALE_OPTIONS} />
      </div>

      {rows.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: token.colorTextTertiary }}>Нет задач с датами</div>
      )}

      {/* Gantt */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="content-scroll"
        style={{ flex: 1, overflow: 'auto', borderRadius: 10, border: bdr, background: RIGHT_BG, minHeight: 0 }}
      >
        <div style={{ width: LEFT_W + totalW, position: 'relative' }}>

          {/* Header: sticky top, corner cell sticky left */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 20, height: HEADER_H }}>
            <div style={{
              position: 'sticky', left: 0, zIndex: 21, width: LEFT_W, flexShrink: 0, height: HEADER_H,
              background: LEFT_BG, borderRight: bdr, borderBottom: bdr,
              display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 14px 10px',
            }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Задачи</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: token.colorTextTertiary, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Срок</span>
            </div>
            <div style={{ width: totalW, position: 'relative', height: HEADER_H, background: RIGHT_BG, borderBottom: bdr }}>
              {/* Pinned to the viewport (not a date position) so the year stays legible no matter how far the user has scrolled. */}
              <div style={{
                position: 'sticky', left: LEFT_W + 8, top: 1, zIndex: 2, width: 'fit-content',
                fontSize: 10, fontWeight: 600, color: token.colorTextQuaternary, whiteSpace: 'nowrap',
              }}>
                {visibleYear}
              </div>
              {monthBands.map((band, i) => (
                <div key={i} style={{
                  position: 'absolute', left: band.x, top: YEAR_ROW_H, width: band.width, height: MONTH_ROW_H,
                  borderRight: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', paddingLeft: 8,
                  fontSize: 11, fontWeight: 600, color: token.colorTextSecondary,
                  overflow: 'hidden', whiteSpace: 'nowrap', textTransform: 'capitalize',
                }}>
                  {band.label}
                </div>
              ))}
              {ticks.map((tick, i) => (
                <div key={i} style={{
                  position: 'absolute', left: tick.x + 4, top: YEAR_ROW_H + MONTH_ROW_H + 3,
                  fontSize: 10, fontWeight: 400, color: token.colorTextQuaternary, whiteSpace: 'nowrap',
                }}>
                  {tick.label}
                </div>
              ))}
              <div style={{
                position: 'absolute', left: todayX + 4, top: YEAR_ROW_H + MONTH_ROW_H + 2, fontSize: 10, fontWeight: 700,
                color: token.colorPrimary, background: `${token.colorPrimary}22`, borderRadius: 4, padding: '1px 6px',
                whiteSpace: 'nowrap',
              }}>
                Сегодня
              </div>
            </div>
          </div>

          {/* Vertical gridlines spanning all rows: month boundaries + scale ticks + today */}
          <div style={{ position: 'absolute', top: HEADER_H, left: LEFT_W, width: totalW, height: totalRowsH, zIndex: 1, pointerEvents: 'none' }}>
            {monthBands.map((band, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, left: band.x, width: 1, height: totalRowsH, background: 'rgba(255,255,255,0.05)' }} />
            ))}
            {ticks.map((tick, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, left: tick.x, width: 1, height: totalRowsH, background: 'rgba(255,255,255,0.03)' }} />
            ))}
            <div style={{ position: 'absolute', top: 0, left: todayX, width: 1, height: totalRowsH, background: token.colorPrimary, opacity: 0.5 }} />
          </div>

          {/* Rows */}
          {rows.map((row) => {
            const rowH = row.kind === 'group' ? GROUP_ROW_H : TASK_ROW_H;

            if (row.kind === 'group') {
              return (
                <div key={`g-${row.epic.id}`} style={{ display: 'flex', height: rowH }}>
                  <div style={{
                    position: 'sticky', left: 0, zIndex: 5, width: LEFT_W, flexShrink: 0, height: rowH,
                    background: LEFT_BG_GROUP, borderBottom: bdr,
                    display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 2, background: row.epic.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: token.colorTextSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.epic.name}
                    </span>
                    <span style={{ fontSize: 11, color: token.colorTextQuaternary, marginLeft: 'auto', flexShrink: 0 }}>{row.taskCount}</span>
                  </div>
                  <div style={{ width: totalW, height: rowH, background: RIGHT_BG_GROUP, borderBottom: bdr }} />
                </div>
              );
            }

            const t = row.task;
            const bx = xOf(t.start);
            const bw = Math.max(pxPerDay * 2, xOf(t.end) - bx + pxPerDay);
            const displayTitle = t.title.replace(/^\[.*?\]\s*/, '');

            return (
              <div key={t.id} style={{ display: 'flex', height: rowH }}>
                <div style={{
                  position: 'sticky', left: 0, zIndex: 5, width: LEFT_W, flexShrink: 0, height: rowH,
                  background: LEFT_BG, borderBottom: bdr,
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
                        borderRadius: BAR_R, background: '#24252b',
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
