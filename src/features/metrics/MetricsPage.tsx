import { useState } from 'react';
import {
  Input,
  Select,
  Skeleton,
  Switch,
  Table,
  theme,
  Typography,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMetricDefinitions, getMetricGroupDefs } from '../../data/api/metric-definitions';
import type { MetricDefinition } from '../../data/types';

const { useToken } = theme;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(m: MetricDefinition): string {
  const v = m.currentValue;
  switch (m.format) {
    case 'currency':
      return v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(1)} млн ₽`
        : v >= 1_000
          ? `${v.toLocaleString('ru')} ₽`
          : `${v} ₽`;
    case 'percent':
      return `${v}%`;
    case 'rate':
      return `${v}%`;
    case 'duration_h':
      return m.unit === 'мин.' ? `${v} мин.` : `${v} ч.`;
    case 'duration_ms':
      return `${v} мс`;
    case 'duration_d':
      return `${v} дн.`;
    case 'per_1000':
      return `${v}`;
    default:
      return v >= 1_000 ? v.toLocaleString('ru') : String(v);
  }
}

function getFulfillment(m: MetricDefinition): number {
  if (m.planValue === 0) return 100;
  if (m.lowerIsBetter) {
    return Math.min(150, (m.planValue / m.currentValue) * 100);
  }
  return Math.min(150, (m.currentValue / m.planValue) * 100);
}

function getTrend(m: MetricDefinition): number {
  if (m.lastPeriodValue === 0) return 0;
  const raw = ((m.currentValue - m.lastPeriodValue) / Math.abs(m.lastPeriodValue)) * 100;
  return m.lowerIsBetter ? -raw : raw;
}

// ── Mini sparkline ────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const W = 60;
  const H = 22;
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const r = mx - mn || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - mn) / r) * (H - 4) - 2}`)
    .join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ── Group color dot ───────────────────────────────────────────────────────────

function GroupDot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: color + '22',
        border: `1.5px solid ${color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MetricsPage() {
  const { token } = useToken();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [dashboardToggles, setDashboardToggles] = useState<Record<string, boolean>>({});

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: getMetricDefinitions,
  });
  const { data: groupDefs } = useQuery({
    queryKey: ['metric-group-defs'],
    queryFn: getMetricGroupDefs,
  });

  const groupColorMap = Object.fromEntries(
    (groupDefs ?? []).map((g) => [g.id, g.color]),
  );
  const groupNameMap = Object.fromEntries(
    (groupDefs ?? []).map((g) => [g.id, g.name]),
  );

  const filtered = (metrics ?? []).filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q);
    const matchGroup = !groupFilter || m.groupId === groupFilter;
    return matchSearch && matchGroup;
  });

  const columns = [
    {
      title: 'МЕТРИКА',
      key: 'name',
      width: '38%',
      render: (_: unknown, m: MetricDefinition) => {
        const color = groupColorMap[m.groupId] ?? token.colorPrimary;
        return (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <GroupDot color={color} />
            <div style={{ minWidth: 0 }}>
              <Typography.Text strong style={{ fontSize: 13, display: 'block', color: token.colorText }}>
                {m.name}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, lineHeight: 1.4, display: 'block', marginTop: 2 }}
                ellipsis={{ tooltip: m.description }}
              >
                {m.description}
              </Typography.Text>
            </div>
          </div>
        );
      },
    },
    {
      title: 'ГРУППА',
      key: 'group',
      width: '14%',
      render: (_: unknown, m: MetricDefinition) => (
        <Typography.Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
          {groupNameMap[m.groupId] ?? m.groupId}
        </Typography.Text>
      ),
    },
    {
      title: 'ЗНАЧЕНИЕ',
      key: 'value',
      width: '12%',
      align: 'right' as const,
      render: (_: unknown, m: MetricDefinition) => {
        const color = groupColorMap[m.groupId] ?? token.colorPrimary;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
            <Sparkline data={m.history.map((h) => h.value)} color={color} />
            <Typography.Text strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
              {formatValue(m)}
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: '% ПЛАНА',
      key: 'fulfillment',
      width: '10%',
      align: 'right' as const,
      sorter: (_a: MetricDefinition, _b: MetricDefinition) =>
        getFulfillment(_a) - getFulfillment(_b),
      render: (_: unknown, m: MetricDefinition) => {
        const pct = getFulfillment(m);
        const color =
          pct >= 90 ? token.colorSuccess : pct >= 70 ? token.colorWarning : token.colorError;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <Typography.Text style={{ fontSize: 12, color, fontWeight: 600 }}>
              {pct.toFixed(0)}%
            </Typography.Text>
            <div
              style={{
                width: 48,
                height: 3,
                background: token.colorFillSecondary,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, pct)}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: 'ИЗМЕНЕНИЕ',
      key: 'trend',
      width: '10%',
      align: 'right' as const,
      sorter: (_a: MetricDefinition, _b: MetricDefinition) =>
        getTrend(_a) - getTrend(_b),
      render: (_: unknown, m: MetricDefinition) => {
        const t = getTrend(m);
        const isUp = t >= 0;
        const color = isUp ? token.colorSuccess : token.colorError;
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
            {isUp
              ? <ArrowUpOutlined style={{ fontSize: 10, color }} />
              : <ArrowDownOutlined style={{ fontSize: 10, color }} />}
            <Typography.Text style={{ fontSize: 12, color }}>
              {Math.abs(t).toFixed(1)}%
            </Typography.Text>
          </div>
        );
      },
    },
    {
      title: 'НА ДАШБОРДЕ',
      key: 'dashboard',
      width: '10%',
      align: 'center' as const,
      render: (_: unknown, m: MetricDefinition) => {
        const checked = dashboardToggles[m.id] ?? m.onDashboard;
        return (
          <Switch
            size="small"
            checked={checked}
            onChange={(v) => setDashboardToggles((prev) => ({ ...prev, [m.id]: v }))}
          />
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 22 }}>
            Метрики
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Измерение, сохранённое как единица для повторного использования в дашбордах, экспериментах и анализе
          </Typography.Text>
        </div>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            background: '#4A82F7',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          <PlusOutlined style={{ fontSize: 12 }} />
          Создать метрику
        </button>
      </div>

      {/* ── Search + filters ── */}
      <div style={{ display: 'flex', gap: 8, margin: '16px 0 12px' }}>
        <Input
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          placeholder="Поиск метрик"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 240 }}
          size="small"
          allowClear
        />
        <Select
          placeholder="Группа"
          allowClear
          value={groupFilter}
          onChange={(v) => setGroupFilter(v ?? null)}
          size="small"
          style={{ width: 220 }}
          options={[
            ...(groupDefs ?? []).map((g) => ({ value: g.id, label: g.name })),
          ]}
        />
        <Typography.Text
          type="secondary"
          style={{ fontSize: 12, marginLeft: 'auto', alignSelf: 'center' }}
        >
          {filtered.length} метрик
        </Typography.Text>
      </div>

      {/* ── Table ── */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <Table<MetricDefinition>
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            style={{ fontSize: 12 }}
            onRow={() => ({
              style: { cursor: 'default' },
              onMouseEnter: (e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)';
              },
              onMouseLeave: (e) => {
                (e.currentTarget as HTMLElement).style.background = '';
              },
            })}
          />
        )}
      </div>
    </div>
  );
}
