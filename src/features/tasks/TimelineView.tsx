import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input, Modal, Select, Skeleton, theme, Typography } from 'antd';
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

// ─── dark CSS ─────────────────────────────────────────────────────────────────

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
.gantt-port { opacity: 0; transition: opacity 0.15s; cursor: crosshair; pointer-events: all; }
.gantt-port.visible { opacity: 1; }
.gantt-dep-del { pointer-events: all; cursor: pointer; }
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
    return {
      id: t.id,
      name: t.title.replace(/^\[.*?\]\s*/, ''),
      start,
      end,
      progress: 0,
      dependencies: deps.join(', '),
      custom_class: `gs-${t.status}${isCritical ? '-critical' : ''}`,
    };
  });
}

// ─── post-render SVG injection ────────────────────────────────────────────────

interface InjectOptions {
  container: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ganttInstance: any;
  primary: string;
  tasks: Task[];
  allDeps: Dep[];
  onNewDep: (fromId: string, toId: string) => void;
  onDeleteDep: (fromId: string, toId: string) => void;
  onPortClick: (taskId: string) => void;
}

function postRenderInject(opts: InjectOptions) {
  const { container, ganttInstance, primary, tasks, allDeps, onNewDep, onDeleteDep, onPortClick } = opts;
  const svg = container.querySelector<SVGSVGElement>('.gantt svg');
  if (!svg) return;

  // Remove previous injections
  svg.querySelectorAll('.gantt-port, .gantt-avatar, .gantt-dep-del, .gantt-dep-hit').forEach((el) => el.remove());

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // ── marker for live arrow ──────────────────────────────────────────────────
  let defs = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); svg.prepend(defs); }
  if (!defs.querySelector('#gp-arrow')) {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'gp-arrow');
    marker.setAttribute('markerWidth', '8'); marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '6'); marker.setAttribute('refY', '4');
    marker.setAttribute('orient', 'auto');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M0,0 L8,4 L0,8 Z');
    p.setAttribute('fill', primary);
    marker.appendChild(p);
    defs.appendChild(marker);
  }

  const screenToSvg = (cx: number, cy: number) => {
    const pt = svg.createSVGPoint();
    pt.x = cx; pt.y = cy;
    const ctm = svg.getScreenCTM();
    return ctm ? pt.matrixTransform(ctm.inverse()) : pt;
  };

  // ── per-bar extras: avatar + port ─────────────────────────────────────────
  svg.querySelectorAll<SVGGElement>('.bar-wrapper').forEach((wrapper) => {
    const taskId = wrapper.getAttribute('data-id');
    const bar = wrapper.querySelector<SVGRectElement>('.bar');
    if (!taskId || !bar) return;

    const bx = parseFloat(bar.getAttribute('x') ?? '0');
    const bw = parseFloat(bar.getAttribute('width') ?? '0');
    const by = parseFloat(bar.getAttribute('y') ?? '0');
    const bh = parseFloat(bar.getAttribute('height') ?? '0');
    const task = taskMap.get(taskId);

    // Avatar (right-inside the bar)
    if (task?.assignee && bw > 50) {
      const r = Math.min(9, bh / 2 - 3);
      const ax = bx + bw - r - 5;
      const ay = by + bh / 2;
      const color = AVATAR_COLORS[task.assignee.id] ?? '#555';
      const initials = task.assignee.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'gantt-avatar');
      g.style.pointerEvents = 'none';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(ax)); circle.setAttribute('cy', String(ay));
      circle.setAttribute('r', String(r)); circle.setAttribute('fill', color);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(ax)); text.setAttribute('y', String(ay));
      text.setAttribute('text-anchor', 'middle'); text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('fill', '#fff'); text.setAttribute('font-size', String(Math.round(r * 0.85)));
      text.setAttribute('font-weight', '600'); text.setAttribute('font-family', '-apple-system, system-ui');
      text.textContent = initials;

      g.appendChild(circle); g.appendChild(text);
      svg.appendChild(g);
    }

    // Port (bottom-center, drag or click)
    const portX = bx + bw / 2;
    const portY = by + bh + 1;

    const port = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    port.setAttribute('class', 'gantt-port');
    port.setAttribute('cx', String(portX)); port.setAttribute('cy', String(portY));
    port.setAttribute('r', '7');
    port.setAttribute('fill', '#0e0f14');
    port.setAttribute('stroke', primary);
    port.setAttribute('stroke-width', '2.5');

    const showPort = () => { if (!port.dataset.drag) port.classList.add('visible'); };
    const hidePort = () => { if (!port.dataset.drag) port.classList.remove('visible'); };
    wrapper.addEventListener('mouseenter', showPort);
    wrapper.addEventListener('mouseleave', hidePort);

    port.addEventListener('mousedown', (e) => {
      e.stopPropagation(); e.preventDefault();
      let moved = false;
      const startX = e.clientX; const startY = e.clientY;
      port.dataset.drag = '1';
      port.classList.add('visible');

      const livePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      livePath.setAttribute('fill', 'none');
      livePath.setAttribute('stroke', primary);
      livePath.setAttribute('stroke-width', '2');
      livePath.setAttribute('stroke-dasharray', '5 3');
      livePath.setAttribute('marker-end', 'url(#gp-arrow)');
      svg.appendChild(livePath);

      const onMove = (me: MouseEvent) => {
        if (!moved && Math.hypot(me.clientX - startX, me.clientY - startY) > 5) moved = true;
        const pt = screenToSvg(me.clientX, me.clientY);
        const d = `M ${portX} ${portY} C ${portX},${portY + 40} ${pt.x},${pt.y - 40} ${pt.x},${pt.y}`;
        livePath.setAttribute('d', d);
      };

      const onUp = (me: MouseEvent) => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        livePath.remove();
        delete port.dataset.drag;
        port.classList.remove('visible');

        if (!moved) {
          onPortClick(taskId!);
          return;
        }
        const target = document.elementFromPoint(me.clientX, me.clientY);
        const toWrapper = target?.closest<SVGGElement>('[data-id]');
        const toId = toWrapper?.getAttribute('data-id');
        if (toId && toId !== taskId) onNewDep(taskId!, toId);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });

    svg.appendChild(port);
  });

  // ── arrow delete buttons ───────────────────────────────────────────────────
  if (!ganttInstance?.tasks) return;
  const arrowEls = Array.from(svg.querySelectorAll<SVGPathElement>('.arrow'));
  let idx = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ganttInstance.tasks as any[]).forEach((fTask: any) => {
    const fdeps: string[] = fTask.dependencies ?? [];
    fdeps.forEach((depId: string) => {
      const arrow = arrowEls[idx++];
      if (!arrow) return;

      // Check this dep is in our managed allDeps
      const depExists = allDeps.some((d) => d.fromId === depId && d.toId === fTask.id);
      if (!depExists) return;

      try {
        const totalLen = arrow.getTotalLength();
        const midPt = arrow.getPointAtLength(totalLen * 0.62);

        // Invisible wide hit-area on the arrow path
        const hitArea = arrow.cloneNode() as SVGPathElement;
        hitArea.setAttribute('class', 'gantt-dep-hit');
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', '14');
        hitArea.setAttribute('fill', 'none');
        hitArea.style.pointerEvents = 'visibleStroke';
        hitArea.style.cursor = 'pointer';

        // Delete button group (shown on hover)
        const delG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        delG.setAttribute('class', 'gantt-dep-del');
        delG.style.opacity = '0';
        delG.style.transition = 'opacity 0.12s';

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', String(midPt.x)); bg.setAttribute('cy', String(midPt.y));
        bg.setAttribute('r', '9');
        bg.setAttribute('fill', '#1a1b1e');
        bg.setAttribute('stroke', 'rgba(255,80,80,0.65)');
        bg.setAttribute('stroke-width', '1.5');

        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', String(midPt.x)); txt.setAttribute('y', String(midPt.y));
        txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('dominant-baseline', 'central');
        txt.setAttribute('fill', 'rgba(255,80,80,0.9)');
        txt.setAttribute('font-size', '13'); txt.setAttribute('font-weight', '600');
        txt.style.userSelect = 'none'; txt.style.pointerEvents = 'none';
        txt.textContent = '×';

        delG.appendChild(bg); delG.appendChild(txt);

        const fromId = depId;
        const toId = fTask.id;

        const show = () => {
          delG.style.opacity = '1';
          arrow.style.stroke = 'rgba(255,80,80,0.55)';
        };
        const hide = () => {
          delG.style.opacity = '0';
          arrow.style.stroke = '';
        };

        hitArea.addEventListener('mouseenter', show);
        hitArea.addEventListener('mouseleave', hide);
        delG.addEventListener('mouseenter', show);
        delG.addEventListener('mouseleave', hide);

        delG.addEventListener('click', (e) => {
          e.stopPropagation();
          onDeleteDep(fromId, toId);
        });

        svg.insertBefore(hitArea, arrowEls[0] ?? svg.firstChild);
        svg.appendChild(delG);
      } catch (_) { /* getTotalLength may fail on hidden elements */ }
    });
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
  const frappeTasksRef = useRef<object[]>([]);
  const allDepsRef = useRef<Dep[]>([]);

  // Range from URL → default to 'sprint'
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

  // Link modal state
  const [linkModalTaskId, setLinkModalTaskId] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');

  const { data: allTasks = [], isLoading: tl } = useQuery({ queryKey: ['tasks'], queryFn: getTasks });
  const { data: epics = [], isLoading: el } = useQuery({ queryKey: ['epics'], queryFn: getEpics });
  const isLoading = tl || el;

  const epicTasks = useMemo(
    () => allTasks.filter((t) => t.epicId === selectedEpicId),
    [allTasks, selectedEpicId],
  );

  // Unified dep list: fixture + extra, minus removed
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

  // Keep refs in sync
  useEffect(() => { frappeTasksRef.current = frappeTasks; }, [frappeTasks]);
  useEffect(() => { allDepsRef.current = allDeps; }, [allDeps]);

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

  const openLinkModal = useCallback((taskId: string) => {
    setLinkModalTaskId(taskId);
    setLinkInput('');
  }, []);

  const handleLinkConfirm = useCallback(() => {
    const toId = linkInput.trim().toUpperCase();
    if (linkModalTaskId && toId && toId !== linkModalTaskId) {
      addDep(linkModalTaskId, toId);
    }
    setLinkModalTaskId(null);
  }, [linkModalTaskId, linkInput, addDep]);

  // Inject dark CSS
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

  // Stable post-render callback
  const runPostRender = useCallback(() => {
    if (!containerRef.current || !ganttRef.current) return;
    postRenderInject({
      container: containerRef.current,
      ganttInstance: ganttRef.current,
      primary: token.colorPrimary,
      tasks: epicTasks,
      allDeps: allDepsRef.current,
      onNewDep: addDep,
      onDeleteDep: deleteDep,
      onPortClick: openLinkModal,
    });
  }, [token.colorPrimary, epicTasks, addDep, deleteDep, openLinkModal]);

  // Init / update gantt
  useEffect(() => {
    if (!containerRef.current || !frappeTasks.length) return;

    const viewMode = GANTT_VIEW[range];

    if (!ganttRef.current) {
      ganttRef.current = new Gantt(containerRef.current, frappeTasks, {
        view_mode: viewMode,
        language: 'ru',
        scroll_to: 'today',
        popup: ({ task }: { task: { id: string; name: string; start: string; end: string } }) =>
          `<div class="title">${task.name}</div>
           <div class="subtitle">${task.id}</div>
           <div class="details">${task.start} → ${task.end}</div>`,
        on_click: (fTask: { id: string }) => {
          // Skip navigation if user just finished dragging
          if (Date.now() - lastDragRef.current < 400) return;
          navigate(`/tasks/${fTask.id}`);
        },
        on_date_change: (fTask: { id: string }, newStart: Date) => {
          lastDragRef.current = Date.now();
          // Enforce dependency constraints: start must be after all parent ends
          const myDeps = allDepsRef.current.filter((d) => d.toId === fTask.id);
          for (const dep of myDeps) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const parentFTask = (ganttRef.current?.tasks as any[])?.find((t: any) => t.id === dep.fromId);
            if (!parentFTask) continue;
            const parentEnd: Date = parentFTask._end;
            if (newStart <= parentEnd) {
              // Violated — revert after current render
              setTimeout(() => {
                if (ganttRef.current) {
                  ganttRef.current.options.view_mode = GANTT_VIEW[range];
                  ganttRef.current.refresh(frappeTasksRef.current);
                  requestAnimationFrame(() => requestAnimationFrame(runPostRender));
                }
              }, 50);
              return;
            }
          }
        },
        on_progress_change: () => {},
        on_view_change: () => {},
      });
    } else {
      ganttRef.current.options.view_mode = viewMode;
      ganttRef.current.refresh(frappeTasks);
    }

    requestAnimationFrame(() => requestAnimationFrame(runPostRender));
  }, [frappeTasks, range, navigate, runPostRender]);

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
          style={{ flex: 1, borderRadius: 10, border: bdr, overflow: 'hidden', minHeight: 300 }}
        >
          <div ref={containerRef} />
        </div>
      )}

      {/* Link modal */}
      <Modal
        open={linkModalTaskId !== null}
        title="Создать связь"
        onOk={handleLinkConfirm}
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
          onPressEnter={handleLinkConfirm}
          autoFocus
        />
      </Modal>
    </div>
  );
}
