import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Button,
  Dropdown,
  Skeleton,
  Table,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DownOutlined,
  LeftOutlined,
  LinkOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import { useQuery } from '@tanstack/react-query';
import { getMetricDefinitions, getMetricGroupDefs } from '../../data/api/metric-definitions';
import type { MetricDefinition, MetricPoint } from '../../data/types';
import { useUIStore } from '../../store/uiStore';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Metric line chart — @ant-design/plots v2 (G2 v5)
// ────────────────────────────────────────────────────────────────────────────────

interface MetricLineChartProps {
  data: MetricPoint[];
  color: string;
  granularity: string;
  label: string;
  forecastRatio?: number;
}

function MetricLineChart({ data, color, granularity, label, forecastRatio = 0.88 }: MetricLineChartProps) {
  const { token } = useToken();
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

  const forecastIdx = Math.floor(data.length * forecastRatio);
  const solidData = data.slice(0, forecastIdx + 1);
  const forecastData = data.slice(forecastIdx);

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

  const fmtYLabel = (val: unknown): string => {
    const n = Number(val);
    return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(val);
  };

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 240 }}>
      {!data.length ? (
        <div style={{ padding: '24px 24px 8px' }}>
          <Skeleton active paragraph={{ rows: 8 }} title={false} />
        </div>
      ) : size ? (
        <Line
          data={solidData}
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
          point={{
            style: {
              fill: color,
              r: 3,
              stroke: token.colorBgContainer,
              lineWidth: 1.5,
            },
          }}
          area={{
            style: {
              fill: color,
              fillOpacity: 0.1,
            },
          }}
          axis={{
            x: { labelFormatter: fmtXLabel },
            y: {
              labelFormatter: fmtYLabel,
              title: label,
            },
          }}
          annotations={[
            {
              type: 'line',
              data: forecastData,
              encode: { x: 'date', y: 'value' },
              style: { stroke: color, lineWidth: 2, lineDash: [5, 4], opacity: 0.5 },
            },
          ]}
          tooltip={{
            title: (d: MetricPoint) => fmtXLabel(d.date),
            items: [(d: MetricPoint) => ({ name: label, value: d.value, color })],
          }}
          legend={false}
        />
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// KPI Tile — inside chart card, separated by vertical dividers
// ────────────────────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  sublabel?: string | undefined;
  value: string | number;
  change?: number | undefined;
  statusColor?: string | undefined;
  loading?: boolean | undefined;
  selected?: boolean | undefined;
  onClick?: (() => void) | undefined;
}

function KpiTile({ label, sublabel, value, change, statusColor, loading, selected, onClick }: KpiTileProps) {
  const { token } = useToken();
  const [hovered, setHovered] = useState(false);
  const isPositive = (change ?? 0) >= 0;
  const changeColor = statusColor ?? (isPositive ? token.colorSuccess : token.colorError);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected
          ? 'rgba(74,130,247,0.12)'
          : hovered && onClick
            ? 'rgba(255,255,255,0.03)'
            : 'transparent',
        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        padding: '14px 16px 12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.15s, border-color 0.15s',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      {loading ? (
        <Skeleton active title={false} paragraph={{ rows: 2, width: [100, 60] }} />
      ) : (
        <>
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: selected ? token.colorPrimary : token.colorText,
              }}
            >
              {label}
            </span>
            {sublabel && (
              <span style={{ fontSize: 11, color: token.colorTextTertiary, marginLeft: 5 }}>
                ({sublabel})
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: token.colorText }}>
              {value}
            </span>
            {change !== undefined ? (
              <span style={{ fontSize: 12, color: changeColor, display: 'flex', alignItems: 'center', gap: 2 }}>
                {isPositive
                  ? <ArrowUpOutlined style={{ fontSize: 9 }} />
                  : <ArrowDownOutlined style={{ fontSize: 9 }} />}
                {Math.abs(change).toFixed(2)}%
              </span>
            ) : (
              <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Dashboard Page
// ────────────────────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────────────────────
// Tiles scroll carousel with left/right nav buttons
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
  rows, activeId, loading, onSelect, bdr,
}: {
  rows: MetricDefinition[];
  activeId: string;
  loading: boolean;
  onSelect: (id: string) => void;
  bdr: string;
}) {
  const { token } = useToken();
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
  }, [rows, syncButtons]);

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
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <KpiTile key={i} label="" value="" loading />)
          : rows.map((m) => {
              const raw = m.lastPeriodValue
                ? ((m.currentValue - m.lastPeriodValue) / Math.abs(m.lastPeriodValue)) * 100
                : 0;
              const trend = m.lowerIsBetter ? -raw : raw;
              const pct = m.planValue === 0 ? 100
                : m.lowerIsBetter
                  ? (m.planValue / m.currentValue) * 100
                  : (m.currentValue / m.planValue) * 100;
              const statusColor = pct >= 90 ? token.colorSuccess : pct >= 70 ? token.colorWarning : token.colorError;
              return (
                <KpiTile
                  key={m.id}
                  label={m.name}
                  sublabel={m.unit || undefined}
                  value={fmtMetric(m.currentValue, m)}
                  change={trend}
                  statusColor={statusColor}
                  selected={activeId === m.id}
                  onClick={() => onSelect(m.id)}
                />
              );
            })
        }
      </div>
    </div>
  );
}

// История всегда охватывает Jan–Jun; Q2 начинается с индекса 90 (1 апреля)
const Q2_START_IDX = 90;

function aggregateByGranularity(points: MetricPoint[], granularity: string): MetricPoint[] {
  if (granularity === 'daily' || points.length === 0) return points;
  const bucketSize = granularity === 'weekly' ? 7 : granularity === 'monthly' ? 30 : 1;
  const result: MetricPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
    result.push({ date: slice[0]!.date, value: Math.round(avg * 10) / 10 });
  }
  return result;
}

function fmtMetric(v: number, m: MetricDefinition): string {
  switch (m.format) {
    case 'currency':
      return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} млн ₽` : `${v.toLocaleString('ru')} ₽`;
    case 'percent':
    case 'rate':
      return `${v}%`;
    case 'duration_h':
      return m.unit === 'мин.' ? `${v} мин.` : `${v} ч.`;
    case 'duration_ms':
      return `${v} мс`;
    case 'duration_d':
      return `${v} дн.`;
    default:
      return v >= 1_000 ? v.toLocaleString('ru') : String(v);
  }
}

function calcFulfillment(m: MetricDefinition): number {
  if (m.planValue === 0) return 100;
  return Math.min(150, m.lowerIsBetter
    ? (m.planValue / m.currentValue) * 100
    : (m.currentValue / m.planValue) * 100);
}

export default function DashboardPage() {
  const { token } = useToken();
  const [granularity, setGranularity] = useState('weekly');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('');
  const [metricGroupId, setMetricGroupId] = useState<string>('');

  const { data: metricGroupDefs } = useQuery({
    queryKey: ['metric-group-defs'],
    queryFn: getMetricGroupDefs,
  });
  const { data: metricDefinitions, isLoading: metricsLoading } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: getMetricDefinitions,
  });

  // Respond to metric focus from AI panel
  const focusedMetricId = useUIStore((s) => s.focusedMetricId);
  const clearFocusedMetric = useUIStore((s) => s.setFocusedMetric);
  useEffect(() => {
    if (!focusedMetricId || !metricDefinitions) return;
    const metric = metricDefinitions.find((m) => m.id === focusedMetricId);
    if (!metric) return;
    setMetricGroupId(metric.groupId);
    setSelectedMetricId(metric.id);
    clearFocusedMetric(null);
  }, [focusedMetricId, metricDefinitions, clearFocusedMetric]);

  const activeGroupId = metricGroupId || (metricGroupDefs?.[0]?.id ?? '');
  const groupColor = metricGroupDefs?.find((g) => g.id === activeGroupId)?.color ?? token.colorPrimary;

  const breakdownRows =
    (metricDefinitions ?? []).filter((m) => m.groupId === activeGroupId);

  const activeMetric = breakdownRows.find((m) => m.id === selectedMetricId) ?? breakdownRows[0];

  const rawHistory = activeMetric?.history ?? [];
  const chartData: MetricPoint[] = aggregateByGranularity(
    rawHistory.slice(Q2_START_IDX),
    granularity,
  );
  const chartColor = (() => {
    if (!activeMetric) return groupColor;
    const pct = activeMetric.planValue === 0 ? 100
      : activeMetric.lowerIsBetter
        ? (activeMetric.planValue / activeMetric.currentValue) * 100
        : (activeMetric.currentValue / activeMetric.planValue) * 100;
    return pct >= 90 ? token.colorSuccess : pct >= 70 ? token.colorWarning : token.colorError;
  })();
  const chartLoading = metricsLoading;
  const yAxisLabel = activeMetric?.unit ?? '';

  const activeGroupName = metricGroupDefs?.find((g) => g.id === activeGroupId)?.name ?? 'Группа метрик';
  const groupMenu: MenuProps = {
    items: (metricGroupDefs ?? []).map((g) => ({ key: g.id, label: g.name })),
    onClick: ({ key }) => setMetricGroupId(key),
  };

  const GRANULARITY_OPTIONS = [
    { value: 'daily', label: 'По дням' },
    { value: 'weekly', label: 'По неделям' },
    { value: 'monthly', label: 'По месяцам' },
  ];
  const granularityLabel = GRANULARITY_OPTIONS.find((o) => o.value === granularity)?.label ?? 'По неделям';
  const granularityMenu: MenuProps = {
    items: GRANULARITY_OPTIONS.map((o) => ({ key: o.value, label: o.label })),
    onClick: ({ key }) => setGranularity(key),
  };

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}>
            Продукт: дебетовые карты
          </Typography.Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tooltip title="Помощь">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary }}>
              <QuestionCircleOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <Tooltip title="Копировать ссылку">
            <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: token.colorTextTertiary }}>
              <LinkOutlined style={{ fontSize: 16 }} />
            </div>
          </Tooltip>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              background: token.colorPrimary,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: 11 }}>⊞</span>
            Настроить
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {/* Left: metric group dropdown button */}
        <Dropdown menu={groupMenu} trigger={['click']}>
          <Button icon={<DownOutlined />} iconPosition="end">
            {activeGroupName}
          </Button>
        </Dropdown>

        {/* Right: last-updated info + granularity dropdown button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: token.colorTextTertiary,
              fontSize: 12,
            }}
          >
            <ReloadOutlined style={{ fontSize: 12 }} />
            Данные от 22 мин назад
          </div>
          <Dropdown menu={granularityMenu} trigger={['click']}>
            <Button icon={<DownOutlined />} iconPosition="end">
              {granularityLabel}
            </Button>
          </Dropdown>
        </div>
      </div>

      {/* ── Main chart card (fills remaining height) ── */}
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
        {/* KPI tiles row — horizontal scroll carousel */}
        <TilesCarousel
          rows={breakdownRows}
          activeId={activeMetric?.id ?? ''}
          loading={metricsLoading}
          onSelect={setSelectedMetricId}
          bdr={BDR}
        />

        {/* Chart area — fills all remaining height */}
        {chartLoading ? (
          <div style={{ flex: 1, padding: '24px 24px 8px' }}>
            <Skeleton active paragraph={{ rows: 8 }} title={false} />
          </div>
        ) : (
          <MetricLineChart
            data={chartData}
            color={chartColor}
            granularity={granularity}
            label={yAxisLabel}
          />
        )}

      </div>

      {/* ── Breakdown table ── */}
      <div
        style={{
          flexShrink: 0,
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          marginTop: 12,
          overflow: 'hidden',
        }}
      >
        <Table<MetricDefinition>
          size="small"
          pagination={false}
          dataSource={breakdownRows}
          rowKey="id"
          style={{ fontSize: 12 }}
          columns={[
            {
              title: 'Метрика',
              dataIndex: 'name',
              render: (_: string, row: MetricDefinition) => (
                <span>
                  {row.name}
                  {row.unit
                    ? <span style={{ color: token.colorTextTertiary, marginLeft: 4, fontSize: 11 }}>{row.unit}</span>
                    : null}
                </span>
              ),
            },
            {
              title: 'Текущий квартал',
              dataIndex: 'currentValue',
              align: 'right',
              render: (_: number, row: MetricDefinition) => fmtMetric(row.currentValue, row),
            },
            {
              title: 'План',
              dataIndex: 'planValue',
              align: 'right',
              render: (_: number, row: MetricDefinition) => fmtMetric(row.planValue, row),
            },
            {
              title: '% выполнения',
              key: 'fulfillment',
              align: 'right',
              sorter: (a: MetricDefinition, b: MetricDefinition) => calcFulfillment(a) - calcFulfillment(b),
              render: (_: unknown, row: MetricDefinition) => {
                const pct = calcFulfillment(row);
                return (
                  <Typography.Text
                    style={{
                      color: pct >= 90 ? token.colorSuccess : pct >= 70 ? token.colorWarning : token.colorError,
                    }}
                  >
                    {pct.toFixed(0)}%
                  </Typography.Text>
                );
              },
            },
            {
              title: 'Прошлый квартал',
              dataIndex: 'lastPeriodValue',
              align: 'right',
              render: (_: number, row: MetricDefinition) => fmtMetric(row.lastPeriodValue, row),
            },
          ]}
        />
      </div>

    </div>
  );
}
