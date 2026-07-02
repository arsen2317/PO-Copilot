import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Modal, Select, Skeleton, theme, Typography } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
// @ts-expect-error – vendored vanilla JS
import Gantt from '../../lib/frappe-gantt/index.js';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Task } from '../../data/types';

const { useToken } = theme;

// ─── types ────────────────────────────────────────────────────────────────────

type ViewRange = 'sprint' | 'month' | 'quarter' | 'halfyear' | 'year';
interface Dep { fromId: string; toId: string }

// ─── constants ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS: { value: ViewRange; label: string }[] = [
  { value: 'sprint', label: 'Спринт' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'halfyear', label: 'Полугодие' },
  { value: 'year', label: 'Год' },
];

const GANTT_VIEW: Record<ViewRange, string> = {
  sprint: 'Day',
  month: 'Week',
  quarter: 'Month',
  halfyear: 'Month',
  year: 'Month',
};

const AVATAR_COLORS: Record<string, string> = {
  u1: '#1668dc', u2: '#49aa19', u3: '#d89614',
  u4: '#722ed1', u5: '#eb2f96', u6: '#13c2c2',
  u7: '#fa8c16', u8: '#c41d7f', u9: '#0958d9',
  u10: '#389e0d', u11: '#08979c',
};

// ─── dark CSS injection ───────────────────────────────────────────────────────

function injectDarkCSS(primary: string) {
  const id = 'gantt-dark-styles';
  let el = document.getElementById(id) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = `
.gantt-dark-wrap {
  --g-arrow-color: rgba(180,180,220,0.35);
  --g-bar-color: #1e2030;
  --g-bar-border: rgba(255,255,255,0.08);
  --g-tick-color-thick: rgba(255,255,255,0.09);
  --g-tick-color: rgba(255,255,255,0.04);
  --g-actions-background: #1e2030;
  --g-border-color: rgba(255,255,255,0.08);
  --g-text-muted: rgba(255,255,255,0.38);
  --g-text-light: rgba(255,255,255,0.85);
  --g-text-dark: rgba(255,255,255,0.85);
  --g-progress-color: transparent;
  --g-handle-color: rgba(255,255,255,0.5);
  --g-weekend-label-color: rgba(255,255,255,0.06);
  --g-expected-progress: transparent;
  --g-header-background: #13141a;
  --g-row-color: #13141a;
  --g-row-border-color: rgba(255,255,255,0.05);
  --g-today-highlight: ${primary};
  --g-popup-actions: #252636;
  --g-weekend-highlight-color: rgba(255,255,255,0.012);
}
.gantt-dark-wrap .gantt-container { background: #13141a; }
.gantt-dark-wrap .gantt .bar-progress { display: none; }
.gantt-dark-wrap .gantt .bar-expected-progress { display: none; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-done .bar        { fill: rgba(73,170,25,0.16);   stroke: rgba(73,170,25,0.30)   !important; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-in_progress .bar { fill: rgba(22,104,220,0.16);  stroke: rgba(22,104,220,0.32)  !important; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-review .bar      { fill: rgba(216,150,20,0.16);  stroke: rgba(216,150,20,0.32)  !important; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-todo .bar        { fill: rgba(255,255,255,0.05); }
.gantt-dark-wrap .gantt .bar-wrapper.gs-backlog .bar     { fill: rgba(255,255,255,0.03); }
.gantt-dark-wrap .gantt .bar-wrapper[class*="-critical"] .bar { stroke: rgba(255,80,80,0.55) !important; }
.gantt-dark-wrap .gantt .bar-wrapper:hover .bar          { stroke: rgba(255,255,255,0.22) !important; stroke-width: 1.5 !important; }
.gantt-dark-wrap .gantt .bar-label { font-family: -apple-system, system-ui, sans-serif !important; }
.gantt-dark-wrap .popup-wrapper { background: #1e2030 !important; border: 1px solid rgba(255,255,255,0.1) !important; box-shadow: 0 8px 24px #0008 !important; }
.gantt-dark-wrap .popup-wrapper .title   { color: rgba(255,255,255,0.9) !important; }
.gantt-dark-wrap .popup-wrapper .subtitle,
.gantt-dark-wrap .popup-wrapper .details { color: rgba(255,255,255,0.45) !important; }
.gantt-dark-wrap .gantt .bar-wrapper .port {
  opacity: 0; transition: opacity 0.15s; cursor: crosshair; pointer-events: all;
}
.gantt-dark-wrap .gantt .bar-wrapper:hover .port { opacity: 1; }
.gantt-dark-wrap .gantt .bar-avatar-circle { pointer-events: none; }
.gantt-dark-wrap .gantt .bar-avatar-text { pointer-events: none; }
  `.trim();
}

// ─── data helpers ─────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function toFrappeTasks(tasks: Task[], allDeps: Dep[]): object[] {
  const taskIds = new Set(tasks.map((t) => t.id));
  return tasks.map((t) => {
    const start = t.startDate ?? t.createdAt ?? '2026-07-01';
    const end = t.deadline ?? addDays(start, 7);
    const deps = allDeps
      .filter((d) => d.toId === t.id && taskIds.has(d.fromId))
      .map((d) => d.fromId);
    const isCritical = t.riskLevel === 'critical' && t.status !== 'done';
    const avatarColor = t.assignee ? (AVATAR_COLORS[t.assignee.id] ?? '#555') : undefined;
    const avatarInitials = t.assignee
      ? t.assignee.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
      : undefined;
    return {
      id: t.id,
      name: t.title.replace(/^\[.*?\]\s*/, ''),
      start,
      end,
      progress: 0,
      dependencies: deps.join(', '),
      custom_class: `gs-${t.status}${isCritical ? '-critical' : ''}`,
      _avatar_color: avatarColor,
      _avatar_initials: avatarInitials,
    };
  });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ganttRef = useRef<any>(null);
  const lastDragRef = useRef(0);

  // Range from URL → default 'sprint'
  const [range, setRangeState] = useState<ViewRange>(() => {
    const r = searchParams.get('range') as ViewRange | null;
    return r && GANTT_VIEW[r] ? r : 'sprint';
  });
  const setRange = useCallback((r: ViewRange) => {
    setRangeState(r);
    setSearchParams((p) => { p.set('range', r); return p; }, { replace: true });
  }, [setSearchParams]);

  const [selectedEpicId, setSelectedEpicId] = useState('EPIC-6');
  const [extraDeps, setExtraDeps] = useState<Dep[]>([]);
  const [removedDeps, setRemovedDeps] = useState<Set<string>>(new Set());

  // Link modal
  const [linkModalTaskId, setLinkModalTaskId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');

  const { data: allTasks = [], isLoading: tl } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: epics = [], isLoading: el } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tl || el;

  const epicTasks = useMemo(
    () => allTasks.filter((t) => t.epicId === selectedEpicId),
    [allTasks, selectedEpicId],
  );

  const fixturedDeps = useMemo<Dep[]>(() => {
    const r: Dep[] = [];
    epicTasks.forEach((t) => (t.dependencies ?? []).forEach((fromId) => r.push({ fromId, toId: t.id })));
    return r;
  }, [epicTasks]);

  const allDeps = useMemo<Dep[]>(() => {
    const key = (d: Dep) => `${d.fromId}→${d.toId}`;
    const combined = [...fixturedDeps, ...extraDeps].filter((d) => !removedDeps.has(key(d)));
    const seen = new Set<string>();
    return combined.filter((d) => { const k = key(d); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [fixturedDeps, extraDeps, removedDeps]);

  const frappeTasks = useMemo(() => toFrappeTasks(epicTasks, allDeps), [epicTasks, allDeps]);

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);
  const epicOptions = epics.map((e) => ({ value: e.id, label: e.name }));

  const addDep = useCallback((fromId: string, toId: string) => {
    setExtraDeps((prev) => {
      if (prev.some((d) => d.fromId === fromId && d.toId === toId)) return prev;
      return [...prev, { fromId, toId }];
    });
  }, []);

  const deleteDep = useCallback((fromId: string, toId: string) => {
    const key = `${fromId}→${toId}`;
    if (fixturedDeps.some((d) => `${d.fromId}→${d.toId}` === key)) {
      setRemovedDeps((prev) => new Set([...prev, key]));
    } else {
      setExtraDeps((prev) => prev.filter((d) => `${d.fromId}→${d.toId}` !== key));
    }
  }, [fixturedDeps]);

  // Inject dark CSS whenever primary color changes
  useEffect(() => {
    injectDarkCSS(token.colorPrimary);
  }, [token.colorPrimary]);

  // Init / update gantt
  useEffect(() => {
    if (!containerRef.current || !frappeTasks.length) return;

    const viewMode = GANTT_VIEW[range];

    if (!ganttRef.current) {
      ganttRef.current = new Gantt(containerRef.current, frappeTasks, {
        view_mode: viewMode,
        language: 'ru',
        scroll_to: 'today',
        hide_progress: true,
        hide_ports: false,
        port_color: token.colorPrimary,
        move_dependencies: true,
        popup: false,
        on_click: (fTask: { id: string }) => {
          if (Date.now() - lastDragRef.current < 400) return;
          navigate(`/tasks/${fTask.id}`);
        },
        on_date_change: (_fTask: unknown, _start: Date) => {
          lastDragRef.current = Date.now();
        },
        on_dep_create: (fromId: string, toId: string) => {
          addDep(fromId, toId);
        },
        on_dep_delete: (fromId: string, toId: string) => {
          deleteDep(fromId, toId);
        },
      });
    } else {
      ganttRef.current.options.view_mode = viewMode;
      ganttRef.current.options.on_dep_create = (fromId: string, toId: string) => addDep(fromId, toId);
      ganttRef.current.options.on_dep_delete = (fromId: string, toId: string) => deleteDep(fromId, toId);
      ganttRef.current.refresh(frappeTasks);
    }
  }, [frappeTasks, range, navigate, addDep, deleteDep, token.colorPrimary]);

  // Reset gantt instance when epic changes (so it re-initializes)
  useEffect(() => {
    if (ganttRef.current && containerRef.current) {
      ganttRef.current.clear();
      containerRef.current.innerHTML = '';
      ganttRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEpicId]);

  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
        <FilterOutlined style={{ color: token.colorTextTertiary, fontSize: 13 }} />
        <Select
          value={selectedEpicId}
          onChange={setSelectedEpicId}
          style={{ width: 260 }}
          size="small"
          options={epicOptions}
        />
        <Select
          value={range}
          onChange={(v) => setRange(v as ViewRange)}
          style={{ width: 140 }}
          size="small"
          options={VIEW_OPTIONS}
        />
      </div>

      {selectedEpic && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: token.colorText }}>{selectedEpic.name}</span>
          <span style={{ fontSize: 12, color: token.colorTextTertiary }}>{epicTasks.length} задач</span>
        </div>
      )}

      {epicTasks.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: token.colorTextTertiary }}>
          В этом эпике нет задач
        </div>
      ) : (
        <div
          className="gantt-dark-wrap"
          style={{
            flex: 1,
            borderRadius: 10,
            border: bdr,
            overflow: 'auto',
            minHeight: 300,
          }}
        >
          <div ref={containerRef} />
        </div>
      )}

      {/* Link modal */}
      <Modal
        open={linkModalTaskId !== null}
        title="Создать связь"
        onOk={() => {
          const toId = linkInput.trim().toUpperCase();
          if (linkModalTaskId && toId && toId !== linkModalTaskId) {
            addDep(linkModalTaskId, toId);
          }
          setLinkModalTaskId(null);
        }}
        onCancel={() => setLinkModalTaskId(null)}
        okText="Связать"
        cancelText="Отмена"
        width={360}
      >
        <Typography.Text style={{ display: 'block', marginBottom: 8, color: token.colorTextSecondary, fontSize: 13 }}>
          Задача <strong>{linkModalTaskId}</strong> будет зависеть от:
        </Typography.Text>
        <Input
          placeholder="Например: TASK-12"
          value={linkInput}
          onChange={(e) => setLinkInput(e.target.value)}
          onPressEnter={() => {
            const toId = linkInput.trim().toUpperCase();
            if (linkModalTaskId && toId && toId !== linkModalTaskId) {
              addDep(linkModalTaskId, toId);
            }
            setLinkModalTaskId(null);
          }}
          autoFocus
        />
      </Modal>
    </div>
  );
}
