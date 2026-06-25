import { useEffect, useRef, useState } from 'react';
import {
  Select,
  Skeleton,
  Table,
  theme,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ExpandAltOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getActiveUsersTrend,
  getNewUsersTrend,
  getNpsHistory,
} from '../../data/api/dashboard';
import { getMetricGroups } from '../../data/api/metrics';
import type { MetricPoint, MetricRow } from '../../data/types';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Responsive SVG line chart
// ────────────────────────────────────────────────────────────────────────────────

interface LineChartProps {
  data: MetricPoint[];
  color: string;
  forecastRatio?: number;
}

function LineChartSVG({ data, color, forecastRatio = 0.88 }: LineChartProps) {
  const { token } = useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(700);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry?.contentRect.width) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  if (!data.length) return <div ref={containerRef} style={{ width: '100%', height: 220 }} />;

  const W = containerWidth;
  const H = 220;
  const PAD = { top: 16, right: 24, bottom: 36, left: 44 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values) * 1.15;
  const minV = 0;
  const range = maxV - minV || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * cW;
  const toY = (v: number) => PAD.top + cH - ((v - minV) / range) * cH;

  const forecastIdx = Math.floor(data.length * forecastRatio);

  const solidPoints = data
    .slice(0, forecastIdx + 1)
    .map((d, i) => `${toX(i)},${toY(d.value)}`)
    .join(' ');
  const forecastPoints = data
    .slice(forecastIdx)
    .map((d, i) => `${toX(forecastIdx + i)},${toY(d.value)}`)
    .join(' ');

  const fillPath = [
    `M${toX(0)},${toY(data[0]!.value)}`,
    ...data.slice(0, forecastIdx + 1).map((d, i) => `L${toX(i)},${toY(d.value)}`),
    `L${toX(forecastIdx)},${PAD.top + cH}`,
    `L${PAD.left},${PAD.top + cH}`,
    'Z',
  ].join(' ');

  const gridCount = 4;
  const gridValues = Array.from({ length: gridCount + 1 }, (_, i) =>
    Math.round((maxV / gridCount) * i),
  );

  const labelStep = Math.ceil(data.length / 7);
  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % labelStep === 0 || i === data.length - 1);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={W} height={H} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`fill-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Horizontal grid */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              y1={toY(v)}
              x2={W - PAD.right}
              y2={toY(v)}
              stroke={token.colorBorderSecondary}
              strokeWidth={0.8}
              strokeDasharray={i === 0 ? '0' : '3,4'}
            />
            <text
              x={PAD.left - 6}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill={token.colorTextTertiary}
              fontFamily="Inter, -apple-system, sans-serif"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X axis labels */}
        {xLabels.map(({ d, i }) => (
          <text
            key={i}
            x={toX(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize={11}
            fill={token.colorTextTertiary}
            fontFamily="Inter, -apple-system, sans-serif"
          >
            {d.date.slice(5).replace('-', ' ')}
          </text>
        ))}

        {/* Fill */}
        <path d={fillPath} fill={`url(#fill-grad-${color.replace('#', '')})`} />

        {/* Solid line */}
        <polyline
          points={solidPoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Forecast dashed */}
        <polyline
          points={forecastPoints}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeDasharray="5,4"
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.5}
        />
      </svg>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// KPI Tile — matches Mixpanel reference
// ────────────────────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  sublabel?: string;
  value: string | number;
  change?: number;
  loading?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

function KpiTile({ label, sublabel, value, change, loading, selected, onClick }: KpiTileProps) {
  const { token } = useToken();
  const isPositive = (change ?? 0) >= 0;
  const changeColor = isPositive ? token.colorSuccess : token.colorError;

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'rgba(74,130,247,0.12)' : 'transparent',
        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '12px 16px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: 80 }} />
      ) : (
        <>
          {/* Label row */}
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: selected ? token.colorPrimary : token.colorTextSecondary,
              }}
            >
              {label}
            </span>
            {sublabel && (
              <span style={{ fontSize: 11, color: token.colorTextTertiary, marginLeft: 4 }}>
                ({sublabel})
              </span>
            )}
          </div>

          {/* Value + change */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1,
                color: token.colorText,
              }}
            >
              {value}
            </span>
            {change !== undefined && (
              <span style={{ fontSize: 12, color: changeColor, display: 'flex', alignItems: 'center', gap: 2 }}>
                {isPositive ? <ArrowUpOutlined style={{ fontSize: 10 }} /> : <ArrowDownOutlined style={{ fontSize: 10 }} />}
                {Math.abs(change).toFixed(2)}%
              </span>
            )}
            {change === undefined && (
              <span style={{ fontSize: 12, color: token.colorTextTertiary }}>—</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Dashboard
// ────────────────────────────────────────────────────────────────────────────────

type ChartMetric = 'active' | 'new' | 'nps';
type BreakdownSegment = 'all' | 'site' | 'mobile';

export default function DashboardPage() {
  const { token } = useToken();
  const [granularity, setGranularity] = useState('daily');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('active');
  const [metricGroupId, setMetricGroupId] = useState<string>('');
  const [breakdownSegment, setBreakdownSegment] = useState<BreakdownSegment>('all');

  const { data: activeUsers, isLoading: activeLoading } = useQuery({
    queryKey: ['active-users-trend'],
    queryFn: getActiveUsersTrend,
  });
  const { data: newUsers, isLoading: newLoading } = useQuery({
    queryKey: ['new-users-trend'],
    queryFn: getNewUsersTrend,
  });
  const { data: nps, isLoading: npsLoading } = useQuery({
    queryKey: ['nps-history'],
    queryFn: getNpsHistory,
  });
  const { data: metricGroups } = useQuery({
    queryKey: ['metric-groups'],
    queryFn: getMetricGroups,
  });

  const activeGroupId = metricGroupId || (metricGroups?.[0]?.id ?? '');

  const currentActiveUsers = activeUsers?.at(-1)?.value ?? 0;
  const prevActiveUsers = activeUsers?.at(-8)?.value ?? 0;
  const activeChange = prevActiveUsers
    ? ((currentActiveUsers - prevActiveUsers) / prevActiveUsers) * 100
    : 0;

  const currentNewUsers = newUsers?.at(-1)?.value ?? 0;
  const prevNewUsers = newUsers?.at(-8)?.value ?? 0;
  const newChange = prevNewUsers
    ? ((currentNewUsers - prevNewUsers) / prevNewUsers) * 100
    : 0;

  const currentNps = nps?.at(-1)?.nps ?? 0;
  const prevNps = nps?.at(-8)?.nps ?? 0;
  const npsChange = prevNps ? ((currentNps - prevNps) / Math.abs(prevNps)) * 100 : 0;

  const weeklyActive = activeUsers?.slice(-7).reduce((s, d) => s + d.value, 0) ?? 0;

  const chartData: MetricPoint[] =
    selectedMetric === 'active'
      ? (activeUsers ?? [])
      : selectedMetric === 'new'
        ? (newUsers ?? [])
        : (nps ?? []).map((p) => ({ date: p.date, value: p.nps }));

  const chartColor =
    selectedMetric === 'active'
      ? token.colorPrimary
      : selectedMetric === 'new'
        ? token.colorSuccess
        : token.colorWarning;

  const chartLoading =
    selectedMetric === 'active'
      ? activeLoading
      : selectedMetric === 'new'
        ? newLoading
        : npsLoading;

  const chartLabel =
    selectedMetric === 'active'
      ? 'Все пользователи · Общий'
      : selectedMetric === 'new'
        ? 'Новые пользователи · Общий'
        : 'NPS · Динамика';

  // Current metric group rows for breakdown table
  const currentGroup = metricGroups?.find((g) => g.id === activeGroupId);
  const breakdownRows: MetricRow[] = currentGroup?.metrics ?? [];

  const cardBorder = `1px solid ${token.colorBorderSecondary}`;
  const cardBg = token.colorBgContainer;
  const cardRadius = token.borderRadiusLG;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0, minHeight: 0 }}>
      {/* ── KPI tiles row ── */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          flexShrink: 0,
          paddingBottom: 12,
        }}
      >
        <KpiTile
          label="Активные пользователи"
          sublabel="уникальные"
          value={currentActiveUsers}
          change={activeChange}
          loading={activeLoading}
          selected={selectedMetric === 'active'}
          onClick={() => setSelectedMetric('active')}
        />
        <KpiTile
          label="Новые пользователи"
          sublabel="уникальные"
          value={currentNewUsers}
          change={newChange}
          loading={newLoading}
          selected={selectedMetric === 'new'}
          onClick={() => setSelectedMetric('new')}
        />
        <KpiTile
          label="Средняя сессия"
          value="—"
          loading={false}
        />
        <KpiTile
          label="Удержание на 7-й день"
          value="—"
          loading={false}
        />
        <KpiTile
          label="Еженедельно активные"
          value={weeklyActive}
          loading={activeLoading}
        />
        <KpiTile
          label="NPS"
          value={currentNps}
          change={npsChange}
          loading={npsLoading}
          selected={selectedMetric === 'nps'}
          onClick={() => setSelectedMetric('nps')}
        />
      </div>

      {/* ── Chart card ── */}
      <div
        style={{
          background: cardBg,
          borderRadius: cardRadius,
          border: cardBorder,
          flexShrink: 0,
        }}
      >
        {/* Chart toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
          }}
        >
          {/* Left: metric group dropdown */}
          <Select
            value={activeGroupId || null}
            onChange={(v: string) => setMetricGroupId(v)}
            size="small"
            style={{ width: 200 }}
            placeholder="Группа метрик"
            options={(metricGroups ?? []).map((g) => ({ value: g.id, label: g.name }))}
          />

          {/* Right: granularity + date range + chart type */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              value={granularity}
              onChange={setGranularity}
              size="small"
              style={{ width: 110 }}
              options={[
                { value: 'daily', label: 'По дням' },
                { value: 'weekly', label: 'По неделям' },
                { value: 'monthly', label: 'По месяцам' },
              ]}
            />
            <Select
              value={dateRange}
              onChange={setDateRange}
              size="small"
              style={{ width: 155 }}
              options={[
                { value: '7d', label: 'Последние 7 дней' },
                { value: '30d', label: 'Последние 30 дней' },
                { value: '90d', label: 'Последние 90 дней' },
                { value: 'q', label: 'Текущий квартал' },
              ]}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 10px',
                border: cardBorder,
                borderRadius: token.borderRadius,
                cursor: 'pointer',
                fontSize: 12,
                color: token.colorTextSecondary,
              }}
            >
              <LineChartOutlined style={{ fontSize: 12 }} />
              <span>Линейный</span>
              <span style={{ fontSize: 10 }}>▾</span>
            </div>
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: cardBorder,
                borderRadius: token.borderRadius,
                cursor: 'pointer',
                color: token.colorTextSecondary,
              }}
            >
              <ExpandAltOutlined style={{ fontSize: 12 }} />
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ padding: '0 8px 4px' }}>
          {chartLoading ? (
            <Skeleton active paragraph={{ rows: 5 }} title={false} style={{ padding: '16px 16px 8px' }} />
          ) : (
            <LineChartSVG data={chartData} color={chartColor} forecastRatio={0.88} />
          )}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingBottom: 12,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: chartColor,
            }}
          />
          <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
            {chartLabel}
          </Typography.Text>
        </div>
      </div>

      {/* ── Breakdown ── */}
      <div
        style={{
          marginTop: 12,
          flex: 1,
          background: cardBg,
          borderRadius: cardRadius,
          border: cardBorder,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Breakdown header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            padding: '12px 16px 0',
            flexShrink: 0,
          }}
        >
          <Typography.Text
            strong
            style={{ fontSize: 13, marginRight: 20, color: token.colorTextSecondary }}
          >
            Разбивка по
          </Typography.Text>
          {(['all', 'site', 'mobile'] as BreakdownSegment[]).map((seg) => {
            const labels: Record<BreakdownSegment, string> = {
              all: 'Все',
              site: 'Сайт',
              mobile: 'Мобильное приложение',
            };
            const active = breakdownSegment === seg;
            return (
              <div
                key={seg}
                onClick={() => setBreakdownSegment(seg)}
                style={{
                  padding: '6px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  color: active ? token.colorText : token.colorTextSecondary,
                  borderBottom: active ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                  marginBottom: -1,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {labels[seg]}
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: token.colorBorderSecondary }} />

        {/* Table */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <Table<MetricRow>
            size="small"
            pagination={false}
            dataSource={breakdownRows}
            rowKey="id"
            style={{ fontSize: 12 }}
            columns={[
              {
                title: 'Метрика',
                dataIndex: 'name',
                render: (name: string, row: MetricRow) => (
                  <span>
                    {name}
                    {row.unit ? <span style={{ color: token.colorTextTertiary, marginLeft: 4, fontSize: 11 }}>{row.unit}</span> : null}
                  </span>
                ),
              },
              {
                title: 'Текущий квартал',
                dataIndex: 'currentQuarter',
                align: 'right',
                render: (v: number, row: MetricRow) =>
                  row.unit === '₽'
                    ? v.toLocaleString('ru') + ' ₽'
                    : row.unit === '%'
                      ? `${v}%`
                      : v.toLocaleString('ru'),
              },
              {
                title: 'План',
                dataIndex: 'plan',
                align: 'right',
                render: (v: number, row: MetricRow) =>
                  row.unit === '₽'
                    ? v.toLocaleString('ru') + ' ₽'
                    : row.unit === '%'
                      ? `${v}%`
                      : v.toLocaleString('ru'),
              },
              {
                title: '% выполнения',
                dataIndex: 'fulfillment',
                align: 'right',
                render: (v: number) => (
                  <Typography.Text
                    style={{
                      color:
                        v >= 90
                          ? token.colorSuccess
                          : v >= 70
                            ? token.colorWarning
                            : token.colorError,
                    }}
                  >
                    {v}%
                  </Typography.Text>
                ),
                sorter: (a, b) => a.fulfillment - b.fulfillment,
              },
              {
                title: 'Прошлый квартал',
                dataIndex: 'lastQuarter',
                align: 'right',
                render: (v: number, row: MetricRow) =>
                  row.unit === '₽'
                    ? v.toLocaleString('ru') + ' ₽'
                    : row.unit === '%'
                      ? `${v}%`
                      : v.toLocaleString('ru'),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
