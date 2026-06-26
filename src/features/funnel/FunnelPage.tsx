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
import { Column, Line } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { getFunnelAnalytics } from '../../data/api/funnel-analytics';
import type { FunnelAnalyticsStep, MetricPoint } from '../../data/types';
import { useUIStore } from '../../store/uiStore';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Funnel bar chart — shows all steps as stacked columns (conversion vs drop)
// ────────────────────────────────────────────────────────────────────────────────

interface FunnelBarChartProps {
  steps: FunnelAnalyticsStep[];
  size: { w: number; h: number };
}

function FunnelBarChart({ steps, size }: FunnelBarChartProps) {
  // Build stepped lookup for tooltip enrichment
  const stepByName = new Map(steps.map((s) => [s.name, s]));

  const barData = steps.flatMap((s) => [
    {
      step: s.name,
      type: 'Конверсия',
      value: s.conversionFromFirst,
      users: s.users,
      pct: s.conversionFromFirst,
    },
    {
      step: s.name,
      type: 'Отсев',
      value: 100 - s.conversionFromFirst,
      users: s.users,
      pct: s.conversionFromFirst,
    },
  ]);

  const annotations = steps.map((s) => ({
    type: 'text' as const,
    data: [s.name, s.conversionFromFirst, 'Конверсия'],
    style: {
      text: `${s.conversionFromFirst.toFixed(1)}%\n${s.users}`,
      textAlign: 'center' as const,
      fill: '#fff',
      fontSize: 12,
      fontWeight: 600,
      dy: -8,
    },
  }));

  return (
    <Column
      data={barData}
      xField="step"
      yField="value"
      colorField="type"
      stack={true}
      theme="classicDark"
      width={size.w}
      height={size.h}
      paddingBottom={60}
      paddingLeft={56}
      paddingTop={32}
      paddingRight={16}
      scale={{
        color: { range: ['#4E6AF6', 'rgba(120,140,255,0.22)'] },
        y: { domain: [0, 100] },
      }}
      style={(d: { type: string }) => ({
        fill: d.type === 'Отсев' ? 'rgba(120,140,255,0.18)' : '#4E6AF6',
        stroke: d.type === 'Отсев' ? 'rgba(120,140,255,0.45)' : '#4E6AF6',
        lineWidth: d.type === 'Отсев' ? 1 : 0,
      })}
      axis={{
        y: {
          labelFormatter: (v: unknown) => `${v}%`,
          title: 'Конверсия',
        },
        x: {
          labelAutoRotate: false,
          labelAutoHide: false,
        },
      }}
      annotations={annotations}
      tooltip={{
        title: (d: { step: string }) => d.step,
        items: [
          (d: { step: string; type: string; value: number }) => {
            const s = stepByName.get(d.step);
            if (!s || d.type !== 'Конверсия') return null;
            return {
              name: `Конверсия от первого шага`,
              value: `${s.conversionFromFirst.toFixed(1)}% (${s.users} чел.)`,
              color: '#4E6AF6',
            };
          },
          (d: { step: string; type: string; value: number }) => {
            const s = stepByName.get(d.step);
            if (!s || d.type !== 'Отсев') return null;
            const dropped = steps[0] ? steps[0].users - s.users : 0;
            return {
              name: 'Отсеялись',
              value: `${(100 - s.conversionFromFirst).toFixed(1)}% (${dropped} чел.)`,
              color: 'rgba(120,140,255,0.6)',
            };
          },
        ],
      }}
      legend={false}
    />
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
    result.push({ date: slice[0]!.date, value: Math.round(avg * 10) / 10 });
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
    <div ref={containerRef} style={{ flex: 1, minHeight: 240 }}>
      {loading ? (
        <div style={{ padding: '24px 24px 8px' }}>
          <Skeleton active paragraph={{ rows: 8 }} title={false} />
        </div>
      ) : size ? (
        isOverall ? (
          <FunnelBarChart steps={steps} size={size} />
        ) : (
          <StepLineChart data={chartData} granularity={granularity} size={size} />
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
  change: number;
  selected: boolean;
  onClick: () => void;
}

function FunnelTile({ label, value, change, selected, onClick }: FunnelTileProps) {
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
          {Math.abs(change)}
        </span>
      </div>
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
                value={String(s.users)}
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
  const [granularity, setGranularity] = useState('daily');
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
            Данные от 22 мин назад
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
