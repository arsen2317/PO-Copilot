import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Select, Skeleton, theme } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
// @ts-expect-error – no official types for frappe-gantt
import Gantt from 'frappe-gantt';
import './frappe-gantt.css';
import { getEpics, getTasks } from '../../data/api/tasks';
import type { Task } from '../../data/types';

const { useToken } = theme;

// ─── types ────────────────────────────────────────────────────────────────────

type ViewRange = 'sprint' | 'month' | 'quarter' | 'halfyear' | 'year';

interface Dep { fromId: string; toId: string }

interface FrappeTask {
  id: string;
  name: string;
  start: string;
  end: string;
  progress: number;
  dependencies: string;
  custom_class: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const VIEW_OPTIONS: { value: ViewRange; label: string }[] = [
  { value: 'sprint', label: 'Спринт (2 нед.)' },
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

// ─── helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function toFrappeTasks(tasks: Task[], extraDeps: Dep[]): FrappeTask[] {
  return tasks.map((t) => {
    const start = t.startDate ?? t.createdAt ?? '2026-07-01';
    const end = t.deadline ?? addDays(start, 7);
    const builtIn = t.dependencies ?? [];
    const extra = extraDeps.filter((d) => d.toId === t.id).map((d) => d.fromId);
    const allDeps = [...new Set([...builtIn, ...extra])];
    const progress =
      t.status === 'done' ? 100 :
      t.status === 'review' ? 80 :
      t.status === 'in_progress' ? 40 :
      t.status === 'todo' ? 5 : 0;
    const riskCls = t.riskLevel === 'critical' && t.status !== 'done' ? ' gs-critical' : '';
    return {
      id: t.id,
      name: t.title.replace(/^\[.*?\]\s*/, ''),
      start,
      end,
      progress,
      dependencies: allDeps.join(', '),
      custom_class: `gs-${t.status}${riskCls}`,
    };
  });
}

// ─── dark-theme CSS injected once ─────────────────────────────────────────────

function buildDarkCSS(primary: string): string {
  return `
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
  --g-progress-color: rgba(255,255,255,0.11);
  --g-handle-color: rgba(255,255,255,0.5);
  --g-weekend-label-color: rgba(255,255,255,0.06);
  --g-expected-progress: rgba(100,100,160,0.25);
  --g-header-background: #13141a;
  --g-row-color: #13141a;
  --g-row-border-color: rgba(255,255,255,0.05);
  --g-today-highlight: ${primary};
  --g-popup-actions: #252636;
  --g-weekend-highlight-color: rgba(255,255,255,0.012);
}
.gantt-dark-wrap .gantt-container { background: #13141a; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-done .bar        { fill: rgba(73,170,25,0.16);   stroke: rgba(73,170,25,0.30)   !important; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-in_progress .bar { fill: rgba(22,104,220,0.16);  stroke: rgba(22,104,220,0.32)  !important; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-review .bar      { fill: rgba(216,150,20,0.16);  stroke: rgba(216,150,20,0.32)  !important; }
.gantt-dark-wrap .gantt .bar-wrapper.gs-todo .bar        { fill: rgba(255,255,255,0.05); }
.gantt-dark-wrap .gantt .bar-wrapper.gs-backlog .bar     { fill: rgba(255,255,255,0.03); }
.gantt-dark-wrap .gantt .bar-wrapper.gs-critical .bar    { stroke: rgba(255,80,80,0.55)  !important; }
.gantt-dark-wrap .gantt .bar-wrapper:hover .bar          { stroke: rgba(255,255,255,0.22) !important; stroke-width: 1.5 !important; }
.gantt-dark-wrap .gantt .bar-label { font-family: -apple-system, system-ui, sans-serif !important; }
.gantt-dark-wrap .popup-wrapper { background: #1e2030 !important; border: 1px solid rgba(255,255,255,0.1) !important; box-shadow: 0 8px 24px #0008 !important; }
.gantt-dark-wrap .popup-wrapper .title   { color: rgba(255,255,255,0.9) !important; }
.gantt-dark-wrap .popup-wrapper .subtitle,
.gantt-dark-wrap .popup-wrapper .details { color: rgba(255,255,255,0.45) !important; }
/* port dots for creating dependencies */
.gantt-port { opacity: 0; transition: opacity 0.15s; cursor: crosshair; pointer-events: all; }
.gantt-port.visible { opacity: 1; }
  `.trim();
}

// ─── port injection – adds draggable connector dots to frappe-gantt SVG ──────

function injectPorts(
  container: HTMLDivElement,
  primary: string,
  onNewDep: (fromId: string, toId: string) => void,
) {
  const svg = container.querySelector<SVGSVGElement>('.gantt svg');
  if (!svg) return;

  // remove stale ports
  svg.querySelectorAll('.gantt-port').forEach((el) => el.remove());

  // ensure live-arrow marker exists
  let defs = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); svg.prepend(defs); }
  if (!defs.querySelector('#gp-arrow')) {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'gp-arrow');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '6');
    marker.setAttribute('refY', '4');
    marker.setAttribute('orient', 'auto');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M0,0 L8,4 L0,8 Z');
    p.setAttribute('fill', primary);
    marker.appendChild(p);
    defs.appendChild(marker);
  }

  const wrappers = svg.querySelectorAll<SVGGElement>('.bar-wrapper');
  wrappers.forEach((wrapper) => {
    const taskId = wrapper.getAttribute('data-id');
    const bar = wrapper.querySelector<SVGRectElement>('.bar');
    if (!taskId || !bar) return;

    const bx = parseFloat(bar.getAttribute('x') ?? '0');
    const bw = parseFloat(bar.getAttribute('width') ?? '0');
    const by = parseFloat(bar.getAttribute('y') ?? '0');
    const bh = parseFloat(bar.getAttribute('height') ?? '0');
    const portX = bx + bw;
    const portY = by + bh / 2;

    const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    port.setAttribute('class', 'gantt-port');
    port.setAttribute('cx', String(portX));
    port.setAttribute('cy', String(portY));
    port.setAttribute('r', '7');
    port.setAttribute('fill', '#0e0f14');
    port.setAttribute('stroke', primary);
    port.setAttribute('stroke-width', '2.5');

    wrapper.addEventListener('mouseenter', () => { if (!port.dataset.drag) port.classList.add('visible'); });
    wrapper.addEventListener('mouseleave', () => { if (!port.dataset.drag) port.classList.remove('visible'); });

    port.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      port.dataset.drag = '1';
      port.classList.add('visible');

      const livePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      livePath.setAttribute('fill', 'none');
      livePath.setAttribute('stroke', primary);
      livePath.setAttribute('stroke-width', '2');
      livePath.setAttribute('stroke-dasharray', '5 3');
      livePath.setAttribute('marker-end', 'url(#gp-arrow)');
      svg.appendChild(livePath);

      const screenToSvg = (cx: number, cy: number) => {
        const pt = svg.createSVGPoint();
        pt.x = cx; pt.y = cy;
        const ctm = svg.getScreenCTM();
        return ctm ? pt.matrixTransform(ctm.inverse()) : pt;
      };

      const onMove = (me: MouseEvent) => {
        const pt = screenToSvg(me.clientX, me.clientY);
        const d = `M ${portX} ${portY} C ${portX + 60},${portY} ${pt.x - 60},${pt.y} ${pt.x},${pt.y}`;
        livePath.setAttribute('d', d);
      };

      const onUp = (me: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        livePath.remove();
        delete port.dataset.drag;
        port.classList.remove('visible');

        const target = document.elementFromPoint(me.clientX, me.clientY);
        const toWrapper = target?.closest<SVGGElement>('[data-id]');
        const toId = toWrapper?.getAttribute('data-id');
        if (toId && toId !== taskId) onNewDep(taskId, toId);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    svg.appendChild(port);
  });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function TimelineView({ bdr }: { bdr: string }) {
  const { token } = useToken();
  const navigate = useNavigate();

  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ganttRef = useRef<any>(null);

  const [range, setRange] = useState<ViewRange>('quarter');
  const [selectedEpicId, setSelectedEpicId] = useState('EPIC-6');
  const [extraDeps, setExtraDeps] = useState<Dep[]>([]);

  const { data: allTasks = [], isLoading: tl } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: epics = [], isLoading: el } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tl || el;

  const epicTasks = useMemo(
    () => allTasks.filter((t) => t.epicId === selectedEpicId),
    [allTasks, selectedEpicId],
  );

  const frappeTasks = useMemo(
    () => toFrappeTasks(epicTasks, extraDeps),
    [epicTasks, extraDeps],
  );

  const selectedEpic = epics.find((e) => e.id === selectedEpicId);
  const epicOptions = epics.map((e) => ({ value: e.id, label: e.name }));

  // Inject dark CSS once (updates when primary colour changes)
  useEffect(() => {
    const id = 'gantt-dark-styles';
    let styleEl = document.getElementById(id) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = id;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildDarkCSS(token.colorPrimary);
  }, [token.colorPrimary]);

  const addDep = useCallback((fromId: string, toId: string) => {
    setExtraDeps((prev) => {
      if (prev.some((d) => d.fromId === fromId && d.toId === toId)) return prev;
      return [...prev, { fromId, toId }];
    });
  }, []);

  // Init / update gantt
  useEffect(() => {
    if (!containerRef.current || !frappeTasks.length) return;

    const viewMode = GANTT_VIEW[range];

    if (!ganttRef.current) {
      ganttRef.current = new Gantt(containerRef.current, frappeTasks, {
        view_mode: viewMode,
        language: 'ru',
        scroll_to: 'today',
        popup: ({ task }: { task: { id: string; name: string; start: string; end: string; progress: number } }) =>
          `<div class="title">${task.name}</div>
           <div class="subtitle">${task.id}</div>
           <div class="details">${task.start} → ${task.end} · ${task.progress}%</div>`,
        on_click: (task: { id: string }) => { navigate(`/tasks/${task.id}`); },
        on_date_change: () => {},
        on_progress_change: () => {},
        on_view_change: () => {},
      });
    } else {
      // Avoid double render: set view mode in options, then refresh (refresh calls change_view_mode internally)
      ganttRef.current.options.view_mode = viewMode;
      ganttRef.current.refresh(frappeTasks);
    }

    // Re-inject port dots after frappe-gantt finishes rendering (needs 2 rAFs)
    const primary = token.colorPrimary;
    const cb = addDep;
    const container = containerRef.current;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        injectPorts(container, primary, cb);
      });
    });
  }, [frappeTasks, range, navigate, addDep, token.colorPrimary]);

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
          style={{ width: 160 }}
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
          style={{ flex: 1, borderRadius: 10, border: bdr, overflow: 'hidden', minHeight: 300 }}
        >
          <div ref={containerRef} />
        </div>
      )}
    </div>
  );
}
