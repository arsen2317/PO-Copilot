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
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getMetricDefinitions, getMetricGroupDefs } from '../../data/api/metric-definitions';
import type { MetricDefinition } from '../../data/types';

const { useToken } = theme;

function ColTitle({ children }: { children: string }) {
  const { token } = useToken();
  return (
    <span style={{ fontSize: 11, fontWeight: 500, color: token.colorTextTertiary, letterSpacing: '0.4px' }}>
      {children}
    </span>
  );
}

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
      title: <ColTitle>МЕТРИКА</ColTitle>,
      key: 'name',
      ellipsis: true,
      render: (_: unknown, m: MetricDefinition) => {
        const pct = m.planValue === 0 ? 100
          : m.lowerIsBetter
            ? (m.planValue / m.currentValue) * 100
            : (m.currentValue / m.planValue) * 100;
        const dotColor = pct >= 90 ? token.colorSuccess : pct >= 70 ? token.colorWarning : token.colorError;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: dotColor,
                flexShrink: 0,
              }}
            />
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: token.colorText,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: token.colorTextTertiary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 1,
                }}
              >
                {m.description}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: <ColTitle>ТИП</ColTitle>,
      key: 'group',
      width: 130,
      render: (_: unknown, m: MetricDefinition) => (
        <Typography.Text style={{ fontSize: 12, color: token.colorText }}>
          {groupNameMap[m.groupId] ?? m.groupId}
        </Typography.Text>
      ),
    },
    {
      title: <ColTitle>НА ДАШБОРДЕ</ColTitle>,
      key: 'dashboard',
      width: 130,
      align: 'center' as const,
      sorter: (a: MetricDefinition, b: MetricDefinition) =>
        Number(dashboardToggles[a.id] ?? a.onDashboard) - Number(dashboardToggles[b.id] ?? b.onDashboard),
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
          options={(groupDefs ?? []).map((g) => ({ value: g.id, label: g.name }))}
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
            size="middle"
            pagination={false}
            tableLayout="fixed"
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
