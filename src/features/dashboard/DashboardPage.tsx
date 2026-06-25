import { useEffect, useRef, useState } from 'react';
import {
  Select,
  Skeleton,
  Table,
  theme,
  Tooltip,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ExpandAltOutlined,
  LineChartOutlined,
  LinkOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
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
// Fully-responsive SVG chart (ResizeObserver on both axes)
// ────────────────────────────────────────────────────────────────────────────────

interface LineChartProps {
  data: MetricPoint[];
  color: string;
  label: string;
  forecastRatio?: number;
}

function LineChartSVG({ data, color, label, forecastRatio = 0.88 }: LineChartProps) {
  const { token } = useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 700, h: 300 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry?.contentRect) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  if (!data.length) {
    return (
      <div ref={containerRef} style={{ flex: 1, width: '100%' }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  const W = size.w;
  const H = size.h;
  const PAD = { top: 16, right: 24, bottom: 36, left: 52 };
  const cW = Math.max(0, W - PAD.left - PAD.right);
  const cH = Math.max(0, H - PAD.top - PAD.bottom);

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values) * 1.15;
  const range = maxV || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * cW;
  const toY = (v: number) => PAD.top + cH - (v / range) * cH;

  const forecastIdx = Math.floor(data.length * forecastRatio);

  const solidPts = data
    .slice(0, forecastIdx + 1)
    .map((d, i) => `${toX(i)},${toY(d.value)}`)
    .join(' ');
  const forecastPts = data
    .slice(forecastIdx)
    .map((d, i) => `${toX(forecastIdx + i)},${toY(d.value)}`)
    .join(' ');

  const fillD = [
    `M${toX(0)},${toY(data[0]!.value)}`,
    ...data.slice(0, forecastIdx + 1).map((d, i) => `L${toX(i)},${toY(d.value)}`),
    `L${toX(forecastIdx)},${PAD.top + cH}`,
    `L${PAD.left},${PAD.top + cH}`,
    'Z',
  ].join(' ');

  const gridCount = 4;
  const gridVals = Array.from({ length: gridCount + 1 }, (_, i) =>
    Math.round((maxV / gridCount) * i),
  );

  const labelStep = Math.max(1, Math.ceil(data.length / 7));
  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % labelStep === 0 || i === data.length - 1);

  const gradId = `grad-${color.replace('#', '')}`;

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative', minHeight: 0 }}
    >
      {/* Y-axis label */}
      <div
        style={{
          position: 'absolute',
          left: 4,
          top: '50%',
          transform: 'translateY(-50%) rotate(-90deg)',
          fontSize: 11,
          color: token.colorTextTertiary,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      <svg width={W} height={H} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        {/* Grid */}
        {gridVals.map((v, i) => (
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
              x={PAD.left - 8}
              y={toY(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill={token.colorTextTertiary}
              fontFamily="Inter, -apple-system, sans-serif"
            >
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            </text>
          </g>
        ))}

        {/* X labels */}
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
            {new Date(d.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
          </text>
        ))}

        {/* Fill */}
        <path d={fillD} fill={`url(#${gradId})`} />

        {/* Solid line */}
        <polyline
          points={solidPts}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Forecast */}
        <polyline
          points={forecastPts}
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
// KPI Tile — inside chart card, separated by vertical dividers
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
  const [hovered, setHovered] = useState(false);
  const isPositive = (change ?? 0) >= 0;
  const changeColor = isPositive ? token.colorSuccess : token.colorError;

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
        border: `1px solid ${selected ? token.colorPrimary : 'transparent'}`,
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

type ChartMetric = 'active' | 'new' | 'nps';
type BreakdownSegment = 'all' | 'site' | 'mobile';

export default function DashboardPage() {
  const { token } = useToken();
  const [granularity, setGranularity] = useState('daily');
  const [dateRange, setDateRange] = useState('7d');
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

  const currentGroup = metricGroups?.find((g) => g.id === activeGroupId);
  const breakdownRows: MetricRow[] = currentGroup?.metrics ?? [];

  const cur = activeUsers?.at(-1)?.value ?? 0;
  const prev = activeUsers?.at(-8)?.value ?? 0;
  const activeChange = prev ? ((cur - prev) / prev) * 100 : 0;

  const curNew = newUsers?.at(-1)?.value ?? 0;
  const prevNew = newUsers?.at(-8)?.value ?? 0;
  const newChange = prevNew ? ((curNew - prevNew) / prevNew) * 100 : 0;

  const curNps = nps?.at(-1)?.nps ?? 0;
  const prevNps = nps?.at(-8)?.nps ?? 0;
  const npsChange = prevNps ? ((curNps - prevNps) / Math.abs(prevNps)) * 100 : 0;

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

  const chartLoading = selectedMetric === 'active' ? activeLoading : selectedMetric === 'new' ? newLoading : npsLoading;

  const chartLabel =
    selectedMetric === 'active'
      ? 'Все пользователи · Общий'
      : selectedMetric === 'new'
        ? 'Новые пользователи · Общий'
        : 'NPS · Динамика';

  const yAxisLabel =
    selectedMetric === 'active' || selectedMetric === 'new' ? 'Уникальные' : 'Баллы';

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
            Обзор продукта
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Изменено сегодня · Арсен Аракелян
          </Typography.Text>
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
              padding: '5px 14px',
              background: 'transparent',
              border: BDR,
              borderRadius: 6,
              cursor: 'pointer',
              color: token.colorText,
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >
            Поделиться
          </button>
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
          gap: 0,
          padding: '0 0',
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadius,
          marginBottom: 12,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left controls */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ padding: '0 12px' }}>
            <Select
              value={activeGroupId || null}
              onChange={(v: string) => setMetricGroupId(v)}
              variant="borderless"
              size="small"
              style={{ width: 200 }}
              placeholder="Группа метрик"
              options={(metricGroups ?? []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </div>
          <div style={{ width: 1, height: 24, background: token.colorBorderSecondary }} />
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

        {/* Right dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Select
            value={granularity}
            onChange={setGranularity}
            variant="borderless"
            size="small"
            style={{ width: 110 }}
            options={[
              { value: 'hourly', label: 'По часам' },
              { value: 'daily', label: 'По дням' },
              { value: 'weekly', label: 'По неделям' },
              { value: 'monthly', label: 'По месяцам' },
            ]}
          />
          <div style={{ width: 1, height: 24, background: token.colorBorderSecondary }} />
          <Select
            value={dateRange}
            onChange={setDateRange}
            variant="borderless"
            size="small"
            style={{ width: 160 }}
            options={[
              { value: '7d', label: 'Последние 7 дней' },
              { value: '30d', label: 'Последние 30 дней' },
              { value: '90d', label: 'Последние 90 дней' },
              { value: 'q', label: 'Текущий квартал' },
            ]}
          />
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
          minHeight: 0,
        }}
      >
        {/* KPI tiles row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            padding: '12px 16px 0',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          <KpiTile
            label="Активные пользователи"
            sublabel="уникальные"
            value={cur}
            change={activeChange}
            loading={activeLoading}
            selected={selectedMetric === 'active'}
            onClick={() => setSelectedMetric('active')}
          />
          <KpiTile
            label="Новые пользователи"
            sublabel="уникальные"
            value={curNew}
            change={newChange}
            loading={newLoading}
            selected={selectedMetric === 'new'}
            onClick={() => setSelectedMetric('new')}
          />
          <KpiTile
            label="Средняя длит. сессии"
            value="—"
          />
          <KpiTile
            label="Удержание на 7-й день"
            value="—"
          />
          <KpiTile
            label="Еженед. активные"
            value={weeklyActive}
            loading={activeLoading}
          />
          <KpiTile
            label="NPS"
            value={curNps}
            change={npsChange}
            loading={npsLoading}
            selected={selectedMetric === 'nps'}
            onClick={() => setSelectedMetric('nps')}
          />
        </div>

        {/* Chart toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            flexShrink: 0,
          }}
        >
          {/* Right controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                border: BDR,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 12,
                color: token.colorTextSecondary,
              }}
            >
              <LineChartOutlined style={{ fontSize: 12 }} />
              <span>Линейный</span>
              <span style={{ fontSize: 10 }}>▾</span>
            </div>
            <Tooltip title="Развернуть">
              <div
                style={{
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: BDR,
                  borderRadius: 6,
                  cursor: 'pointer',
                  color: token.colorTextTertiary,
                }}
              >
                <ExpandAltOutlined style={{ fontSize: 12 }} />
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Chart area — fills all remaining height */}
        {chartLoading ? (
          <div style={{ flex: 1, padding: '24px 24px 8px' }}>
            <Skeleton active paragraph={{ rows: 8 }} title={false} />
          </div>
        ) : (
          <LineChartSVG
            data={chartData}
            color={chartColor}
            label={yAxisLabel}
            forecastRatio={0.88}
          />
        )}

        {/* Legend + bottom controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 16px',
            borderTop: BDR,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          {/* Bottom-right: add series + settings */}
          <div style={{ position: 'absolute', right: 16, display: 'flex', gap: 6 }}>
            <Tooltip title="Добавить серию">
              <div
                style={{
                  width: 24,
                  height: 24,
                  border: BDR,
                  borderRadius: 5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: token.colorTextTertiary,
                  fontSize: 12,
                }}
              >
                <PlusOutlined />
              </div>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* ── Breakdown table (hug height) ── */}
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
        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: BDR }}>
          <Typography.Text strong style={{ fontSize: 13, color: token.colorTextSecondary, marginRight: 20 }}>
            Разбивка по
          </Typography.Text>
          {(['all', 'site', 'mobile'] as BreakdownSegment[]).map((seg) => {
            const labels: Record<BreakdownSegment, string> = { all: 'Все', site: 'Сайт', mobile: 'Мобильное приложение' };
            const active = breakdownSegment === seg;
            return (
              <div
                key={seg}
                onClick={() => setBreakdownSegment(seg)}
                style={{
                  padding: '10px 14px',
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
                  {row.unit
                    ? <span style={{ color: token.colorTextTertiary, marginLeft: 4, fontSize: 11 }}>{row.unit}</span>
                    : null}
                </span>
              ),
            },
            {
              title: 'Текущий квартал',
              dataIndex: 'currentQuarter',
              align: 'right',
              render: (v: number, row: MetricRow) =>
                row.unit === '₽' ? v.toLocaleString('ru') + ' ₽' : row.unit === '%' ? `${v}%` : v.toLocaleString('ru'),
            },
            {
              title: 'План',
              dataIndex: 'plan',
              align: 'right',
              render: (v: number, row: MetricRow) =>
                row.unit === '₽' ? v.toLocaleString('ru') + ' ₽' : row.unit === '%' ? `${v}%` : v.toLocaleString('ru'),
            },
            {
              title: '% выполнения',
              dataIndex: 'fulfillment',
              align: 'right',
              sorter: (a, b) => a.fulfillment - b.fulfillment,
              render: (v: number) => (
                <Typography.Text
                  style={{
                    color: v >= 90 ? token.colorSuccess : v >= 70 ? token.colorWarning : token.colorError,
                  }}
                >
                  {v}%
                </Typography.Text>
              ),
            },
            {
              title: 'Прошлый квартал',
              dataIndex: 'lastQuarter',
              align: 'right',
              render: (v: number, row: MetricRow) =>
                row.unit === '₽' ? v.toLocaleString('ru') + ' ₽' : row.unit === '%' ? `${v}%` : v.toLocaleString('ru'),
            },
          ]}
        />
      </div>
    </div>
  );
}
