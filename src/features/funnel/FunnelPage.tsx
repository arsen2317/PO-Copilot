import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Select, Skeleton, theme, Tooltip, Typography } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  LeftOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { getFunnelAnalytics } from '../../data/api/funnel-analytics';
import type { FunnelAnalyticsStep, MetricPoint } from '../../data/types';
import { useUIStore } from '../../store/uiStore';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Funnel bar chart — custom SVG: solid blue (converted) + diagonal-stripe (dropped)
// ────────────────────────────────────────────────────────────────────────────────

interface FunnelBarChartProps {
  steps: FunnelAnalyticsStep[];
  size: { w: number; h: number };
}

interface HoverZone {
  barIdx: number;
  zone: 'blue' | 'hatch';
  mouseX: number;
  mouseY: number;
}

function FunnelBarChart({ steps, size }: FunnelBarChartProps) {
  const [hover, setHover] = useState<HoverZone | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const PAD = { top: 36, right: 24, bottom: 72, left: 52 };
  const chartW = size.w - PAD.left - PAD.right;
  const chartH = size.h - PAD.top - PAD.bottom;

  const n = steps.length;
  const colW = chartW / n;
  const barW = colW * 0.52;
  const barOff = (colW - barW) / 2;

  const toY = (pct: number) => chartH * (1 - pct / 100);

  const yLabels = [0, 25, 50, 75, 100];
  const totalUsers = steps[0]?.users ?? 1;

  const getBlueColor = (i: number): string => {
    if (!hover) return '#4E6AF6';
    if (hover.zone === 'blue' && hover.barIdx === i) return '#7B93FF';
    if (hover.zone === 'hatch') return '#2E4099';
    return '#4E6AF6';
  };

  const getHatchOverlay = (i: number): string | null => {
    if (!hover) return null;
    if (hover.zone === 'hatch' && hover.barIdx === i) return 'rgba(200,220,255,0.18)';
    if (hover.zone === 'blue') return 'rgba(0,0,0,0.28)';
    return null;
  };

  const handleMouse = (e: React.MouseEvent, barIdx: number, zone: 'blue' | 'hatch') => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    setHover({ barIdx, zone, mouseX: e.clientX - svgRect.left, mouseY: e.clientY - svgRect.top });
  };

  return (
    <div style={{ position: 'relative', width: size.w, height: size.h, overflow: 'visible' }}>
      <svg ref={svgRef} width={size.w} height={size.h} style={{ display: 'block' }}>
        <defs>
          <pattern id="funnel-hatch" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(-45 0 0)">
            <rect width="9" height="9" fill="rgba(100,130,255,0.28)" />
            <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(255,255,255,0.55)" strokeWidth="3" />
          </pattern>
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Y-axis grid + labels */}
          {yLabels.map((pct) => (
            <g key={pct}>
              <line
                x1={0} y1={toY(pct)} x2={chartW} y2={toY(pct)}
                stroke="rgba(255,255,255,0.07)" strokeWidth={1}
                strokeDasharray={pct === 0 ? 'none' : '3 3'}
              />
              <text
                x={-8} y={toY(pct)}
                textAnchor="end" dominantBaseline="middle"
                fill="rgba(255,255,255,0.38)" fontSize={11} fontFamily="Inter,sans-serif"
              >{pct}%</text>
            </g>
          ))}

          {/* Bars */}
          {steps.map((step, i) => {
            const currPct = step.users / totalUsers;
            const prevPct = i === 0 ? 1.0 : steps[i - 1]!.users / totalUsers;

            const x = i * colW + barOff;
            const solidH = chartH * currPct;
            const solidY = chartH * (1 - currPct);
            const hatchH = chartH * (prevPct - currPct);
            const hatchY = chartH * (1 - prevPct);

            const shortName = step.name.length > 18 ? step.name.slice(0, 17) + '…' : step.name;
            const hatchOverlay = getHatchOverlay(i);

            // Chip: centered on the hatch/blue boundary
            const chipW = 68;
            const chipH = 38;
            const chipX = x + barW / 2 - chipW / 2;
            const chipY = solidY - chipH / 2;

            return (
              <g key={step.id}>
                {/* ── Hatch zone ── */}
                {hatchH > 0 && (
                  <>
                    <rect x={x} y={hatchY} width={barW} height={hatchH}
                      fill="url(#funnel-hatch)"
                      stroke="rgba(255,255,255,0.22)" strokeWidth={1} rx={3} />
                    {hatchOverlay && (
                      <rect x={x} y={hatchY} width={barW} height={hatchH}
                        style={{ fill: hatchOverlay, transition: 'fill 0.15s', pointerEvents: 'none' }} rx={3} />
                    )}
                    {/* transparent hit area */}
                    <rect x={x} y={hatchY} width={barW} height={hatchH}
                      fill="transparent" style={{ cursor: 'pointer' }}
                      onMouseMove={(e) => handleMouse(e, i, 'hatch')}
                      onMouseLeave={() => setHover(null)} />
                  </>
                )}

                {/* ── Blue zone ── */}
                {solidH > 0 && (
                  <>
                    <rect x={x} y={solidY} width={barW} height={solidH}
                      style={{ fill: getBlueColor(i), transition: 'fill 0.15s' }}
                      stroke="rgba(255,255,255,0.22)" strokeWidth={1} rx={3} />
                    {/* transparent hit area */}
                    <rect x={x} y={solidY} width={barW} height={solidH}
                      fill="transparent" style={{ cursor: 'pointer' }}
                      onMouseMove={(e) => handleMouse(e, i, 'blue')}
                      onMouseLeave={() => setHover(null)} />
                  </>
                )}

                {/* ── Chip label (% + users) ── */}
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={chipX} y={chipY} width={chipW} height={chipH}
                    rx={6} fill="rgba(8,10,20,0.84)"
                    stroke="rgba(255,255,255,0.13)" strokeWidth={1} />
                  <text x={x + barW / 2} y={chipY + 15}
                    textAnchor="middle" fill="#fff"
                    fontSize={13} fontWeight={700} fontFamily="Inter,sans-serif">
                    {(currPct * 100).toFixed(1)}%
                  </text>
                  <text x={x + barW / 2} y={chipY + 29}
                    textAnchor="middle" fill="rgba(255,255,255,0.50)"
                    fontSize={11} fontFamily="Inter,sans-serif">
                    {step.users.toLocaleString('ru')}
                  </text>
                </g>

                {/* ── X-axis label ── */}
                <text textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="Inter,sans-serif">
                  <tspan x={x + barW / 2} y={chartH + 18}>Шаг {i + 1}</tspan>
                  <tspan x={x + barW / 2} dy={14}>{shortName}</tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Tooltip ── */}
      {hover && (() => {
        const step = steps[hover.barIdx]!;
        const currPct = step.users / totalUsers;
        const prevStep = hover.barIdx > 0 ? steps[hover.barIdx - 1]! : null;
        const convFromPrev = prevStep ? (step.users / prevStep.users) * 100 : 100;
        const dropPctFromPrev = 100 - convFromPrev;
        const dropCountFromPrev = prevStep ? prevStep.users - step.users : 0;
        const isBlue = hover.zone === 'blue';

        return (
          <div style={{
            position: 'absolute',
            left: Math.min(hover.mouseX + 14, size.w - 240),
            top: Math.max(hover.mouseY - 60, 4),
            background: '#1a1b1f',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fff',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{step.name}</div>
            {isBlue ? (
              <>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#8DA4F5' }}>
                    {(currPct * 100).toFixed(1)}%
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.50)', marginLeft: 6, fontSize: 12 }}>
                    конверсия от первого шага
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>
                  <b style={{ color: '#fff' }}>
                    {step.users.toLocaleString('ru')} / {totalUsers.toLocaleString('ru')}
                  </b>
                  <span style={{ marginLeft: 4 }}>уникальных конверсий</span>
                </div>
                {prevStep && (
                  <div style={{ color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
                    {convFromPrev.toFixed(1)}% от предыдущего шага
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#FF8A8A' }}>
                    {dropPctFromPrev.toFixed(1)}%
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.50)', marginLeft: 6, fontSize: 12 }}>
                    отсев от предыдущего шага
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>
                  <b style={{ color: '#fff' }}>
                    {dropCountFromPrev.toLocaleString('ru')} / {(prevStep?.users ?? totalUsers).toLocaleString('ru')}
                  </b>
                  <span style={{ marginLeft: 4 }}>уникальных отсевов</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
                  −{dropCountFromPrev.toLocaleString('ru')} чел. на этом шаге
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Step line chart — shows daily users for selected step
// ────────────────────────────────────────────────────────────────────────────────

interface StepLineChartProps {
  data: MetricPoint[];
  granularity: string;
  size: { w: number; h: number };
}

function aggregateByGranularity(points: MetricPoint[], granularity: string): MetricPoint[] {
  if (granularity === 'daily' || points.length === 0) return points;
  const bucketSize = granularity === 'weekly' ? 7 : 30;
  const result: MetricPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
    result.push({ date: slice[0]!.date, value: Math.round(avg) });
  }
  return result;
}

function StepLineChart({ data, granularity, size }: StepLineChartProps) {
  const { token } = useToken();
  const color = token.colorPrimary;

  const fmtXLabel = (val: unknown): string => {
    const d = new Date(String(val));
    if (granularity === 'monthly') return d.toLocaleDateString('ru', { month: 'short' });
    if (granularity === 'weekly') {
      const end = new Date(d);
      end.setDate(d.getDate() + 6);
      return `${d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}–${end.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}`;
    }
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  return (
    <Line
      data={data}
      xField="date"
      yField="value"
      width={size.w}
      height={size.h}
      theme="classicDark"
      paddingBottom={40}
      paddingLeft={56}
      paddingTop={12}
      paddingRight={16}
      style={{ stroke: color, lineWidth: 2 }}
      point={{ style: { fill: color, r: 3, stroke: token.colorBgContainer, lineWidth: 1.5 } }}
      area={{ style: { fill: color, fillOpacity: 0.1 } }}
      axis={{
        x: { labelFormatter: fmtXLabel },
        y: { title: 'Конверсия' },
      }}
      tooltip={{
        title: (d: MetricPoint) => fmtXLabel(d.date),
        items: [(d: MetricPoint) => ({ name: 'Пользователей', value: d.value, color })],
      }}
      legend={false}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Chart container with ResizeObserver
// ────────────────────────────────────────────────────────────────────────────────

const OVERALL_ID = '__overall__';

interface ChartContainerProps {
  selectedId: string;
  steps: FunnelAnalyticsStep[];
  granularity: string;
  loading: boolean;
}

function ChartContainer({ selectedId, steps, granularity, loading }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isOverall = selectedId === OVERALL_ID;
  const selectedStep = steps.find((s) => s.id === selectedId);
  const chartData = aggregateByGranularity(selectedStep?.history ?? [], granularity);

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 240, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      {loading ? (
        <div style={{ padding: '24px 24px 8px' }}>
          <Skeleton active paragraph={{ rows: 8 }} title={false} />
        </div>
      ) : size ? (
        isOverall ? (
          <FunnelBarChart steps={steps} size={size} />
        ) : (
          <StepLineChart key={selectedId} data={chartData} granularity={granularity} size={size} />
        )
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Funnel step tile
// ────────────────────────────────────────────────────────────────────────────────

interface FunnelTileProps {
  label: string;
  value: string;
  subLabel?: string;
  change: number;
  selected: boolean;
  onClick: () => void;
}

function FunnelTile({ label, value, subLabel, change, selected, onClick }: FunnelTileProps) {
  const { token } = useToken();
  const [hovered, setHovered] = useState(false);
  const isPositive = change >= 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected
          ? 'rgba(74,130,247,0.12)'
          : hovered
            ? 'rgba(255,255,255,0.03)'
            : 'transparent',
        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        padding: '14px 16px 12px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: selected ? token.colorPrimary : token.colorText }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: token.colorText }}>
          {value}
        </span>
        <span
          style={{
            fontSize: 12,
            color: isPositive ? token.colorSuccess : token.colorError,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {isPositive
            ? <ArrowUpOutlined style={{ fontSize: 9 }} />
            : <ArrowDownOutlined style={{ fontSize: 9 }} />}
          {Math.abs(change).toLocaleString('ru')}
        </span>
      </div>
      {subLabel && (
        <div style={{ fontSize: 11, color: token.colorTextQuaternary, marginTop: 4 }}>
          {subLabel}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Tiles carousel
// ────────────────────────────────────────────────────────────────────────────────

function CarouselNavBtn({ dir, bdr, onClick }: { dir: 1 | -1; bdr: string; onClick: () => void }) {
  const { token } = useToken();
  return (
    <button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        [dir === -1 ? 'left' : 'right']: 4,
        zIndex: 2,
        width: 28,
        height: 28,
        borderRadius: 8,
        border: bdr,
        background: token.colorBgContainer,
        color: token.colorText,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: 0,
      }}
    >
      {dir === -1 ? <LeftOutlined style={{ fontSize: 11 }} /> : <RightOutlined style={{ fontSize: 11 }} />}
    </button>
  );
}

function TilesCarousel({
  steps,
  selectedId,
  loading,
  onSelect,
  bdr,
  overallConversion,
}: {
  steps: FunnelAnalyticsStep[];
  selectedId: string;
  loading: boolean;
  onSelect: (id: string) => void;
  bdr: string;
  overallConversion: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const syncButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    syncButtons();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncButtons);
    ro.observe(el);
    return () => ro.disconnect();
  }, [steps, syncButtons]);

  const scroll = (dir: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  return (
    <div style={{ position: 'relative', flexShrink: 0, padding: '12px 16px 0' }}>
      {canLeft && <CarouselNavBtn dir={-1} bdr={bdr} onClick={() => scroll(-1)} />}
      {canRight && <CarouselNavBtn dir={1} bdr={bdr} onClick={() => scroll(1)} />}
      <div
        ref={scrollRef}
        onScroll={syncButtons}
        style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}
      >
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{ minWidth: 160, height: 80, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }}
            />
          ))
        ) : (
          <>
            <FunnelTile
              label="Общая конверсия"
              value={`${overallConversion.toFixed(2)}%`}
              change={0}
              selected={selectedId === OVERALL_ID}
              onClick={() => onSelect(OVERALL_ID)}
            />
            {steps.map((s, idx) => (
              <FunnelTile
                key={s.id}
                label={`Шаг ${idx + 1}: ${s.name}`}
                value={s.users.toLocaleString('ru')}
                subLabel="за квартал"
                change={s.change}
                selected={selectedId === s.id}
                onClick={() => onSelect(s.id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Funnel Page
// ────────────────────────────────────────────────────────────────────────────────

export default function FunnelPage() {
  const { token } = useToken();
  const [granularity, setGranularity] = useState('weekly');
  const [selectedId, setSelectedId] = useState<string>(OVERALL_ID);

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['funnel-analytics'],
    queryFn: getFunnelAnalytics,
  });

  // AI panel navigation: respond to focusedFunnelStepId from the store
  const focusedFunnelStepId = useUIStore((s) => s.focusedFunnelStepId);
  const clearFocusedFunnelStep = useUIStore((s) => s.setFocusedFunnelStep);
  useEffect(() => {
    if (!focusedFunnelStepId || !steps.length) return;
    if (focusedFunnelStepId === `funnel:${OVERALL_ID}` || focusedFunnelStepId === OVERALL_ID) {
      setSelectedId(OVERALL_ID);
    } else {
      // ID format from AI: "funnel:step1"
      const raw = focusedFunnelStepId.startsWith('funnel:')
        ? focusedFunnelStepId.slice('funnel:'.length)
        : focusedFunnelStepId;
      const step = steps.find((s) => s.id === raw);
      if (step) setSelectedId(step.id);
    }
    clearFocusedFunnelStep(null);
  }, [focusedFunnelStepId, steps, clearFocusedFunnelStep]);

  const lastStep = steps[steps.length - 1];
  const overallConversion = lastStep?.conversionFromFirst ?? 0;

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>

      {/* ── Page header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
          Воронка конверсии
        </Typography.Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip title="Помощь">
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: token.colorTextTertiary,
              }}
            >
              <QuestionCircleOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadius,
          marginBottom: 12,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left: status */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 14px',
              height: 36,
              color: token.colorTextTertiary,
              fontSize: 12,
            }}
          >
            <ReloadOutlined style={{ fontSize: 12 }} />
            II квартал 2026 (апр–июн) · Данные от 22 мин назад
          </div>
        </div>

        <div style={{ width: 1, height: 36, background: token.colorBorderSecondary }} />

        {/* Right: granularity */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Select
            value={granularity}
            onChange={setGranularity}
            variant="borderless"
            size="small"
            style={{ width: 130 }}
            options={[
              { value: 'daily', label: 'По дням' },
              { value: 'weekly', label: 'По неделям' },
              { value: 'monthly', label: 'По месяцам' },
            ]}
          />
        </div>
      </div>

      {/* ── Main chart card ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden',
          minHeight: 400,
        }}
      >
        <TilesCarousel
          steps={steps}
          selectedId={selectedId}
          loading={isLoading}
          onSelect={setSelectedId}
          bdr={BDR}
          overallConversion={overallConversion}
        />

        <ChartContainer
          selectedId={selectedId}
          steps={steps}
          granularity={granularity}
          loading={isLoading}
        />
      </div>

      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}
