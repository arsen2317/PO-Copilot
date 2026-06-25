import { useState } from 'react';
import {
  Button,
  Col,
  Flex,
  Row,
  Select,
  Skeleton,
  Table,
  Tabs,
  theme,
  Typography,
} from 'antd';
import {
  FilterOutlined,
  ReloadOutlined,
  ShareAltOutlined,
  TeamOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  getActiveUsersTrend,
  getFunnelSteps,
  getIncidents,
  getNewUsersTrend,
  getNpsHistory,
  getProducts,
  getSprintMetric,
} from '../../data/api/dashboard';
import type { MetricPoint } from '../../data/types';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Line Chart SVG
// ────────────────────────────────────────────────────────────────────────────────

interface LineChartProps {
  data: MetricPoint[];
  color: string;
  height?: number;
  forecastRatio?: number;
}

function LineChartSVG({ data, color, height = 200, forecastRatio = 0.88 }: LineChartProps) {
  const { token } = useToken();
  if (!data.length) return null;

  const W = 780;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 36, left: 48 };
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

  const gridCount = 5;
  const gridValues = Array.from({ length: gridCount }, (_, i) =>
    Math.round((maxV / (gridCount - 1)) * i),
  );

  const labelStep = Math.ceil(data.length / 7);
  const xLabels = data
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % labelStep === 0 || i === data.length - 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height, display: 'block' }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
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
            x={PAD.left - 8}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize={10}
            fill={token.colorTextTertiary}
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
          y={H - 6}
          textAnchor="middle"
          fontSize={10}
          fill={token.colorTextTertiary}
        >
          {d.date.slice(5).replace('-', ' ')}
        </text>
      ))}

      {/* Fill under solid line */}
      <path d={fillPath} fill={`url(#fill-${color.replace('#', '')})`} />

      {/* Solid line */}
      <polyline
        points={solidPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Forecast dashed line */}
      <polyline
        points={forecastPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5,4"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.55}
      />

      {/* Data dots */}
      {data
        .filter((_, i) => i % Math.ceil(data.length / 20) === 0)
        .map((d, idx) => {
          const realIdx = idx * Math.ceil(data.length / 20);
          return (
            <circle
              key={realIdx}
              cx={toX(realIdx)}
              cy={toY(d.value)}
              r={3}
              fill={color}
              opacity={realIdx <= forecastIdx ? 0.7 : 0.4}
            />
          );
        })}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// KPI Tile
// ────────────────────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  sublabel?: string | undefined;
  value: string | number;
  change?: number | undefined;
  loading?: boolean | undefined;
  selected?: boolean | undefined;
  icon?: React.ReactNode;
  sparkData?: number[] | undefined;
  sparkColor?: string | undefined;
  onClick?: (() => void) | undefined;
}

function KpiTile({
  label,
  sublabel,
  value,
  change,
  loading,
  selected,
  icon,
  sparkData,
  sparkColor,
  onClick,
}: KpiTileProps) {
  const { token } = useToken();
  const isPositive = (change ?? 0) >= 0;
  const changeColor = isPositive ? token.colorSuccess : token.colorError;

  const mini = sparkData && sparkData.length > 1;
  const miniPts = mini
    ? (() => {
        const mn = Math.min(...sparkData);
        const mx = Math.max(...sparkData);
        const r = mx - mn || 1;
        const W = 80;
        const H = 24;
        return sparkData
          .map(
            (v, i) =>
              `${(i / (sparkData.length - 1)) * W},${H - ((v - mn) / r) * (H - 4) - 2}`,
          )
          .join(' ');
      })()
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? `${token.colorPrimary}18` : token.colorBgContainer,
        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: '14px 16px 10px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
        height: '100%',
        minWidth: 0,
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} title={false} />
      ) : (
        <Flex vertical gap={6}>
          <Flex align="center" gap={6}>
            {icon && (
              <span style={{ color: selected ? token.colorPrimary : token.colorTextSecondary, fontSize: 13 }}>
                {icon}
              </span>
            )}
            <Typography.Text
              style={{
                fontSize: 12,
                color: selected ? token.colorPrimary : token.colorTextSecondary,
                fontWeight: 500,
              }}
            >
              {label}
            </Typography.Text>
            {sublabel && (
              <Typography.Text style={{ fontSize: 11, color: token.colorTextTertiary }}>
                ({sublabel})
              </Typography.Text>
            )}
          </Flex>

          <Flex align="baseline" gap={8}>
            <Typography.Text
              style={{
                fontSize: 28,
                fontWeight: 600,
                lineHeight: 1,
                color: token.colorText,
              }}
            >
              {value}
            </Typography.Text>
            {change !== undefined && (
              <Typography.Text style={{ fontSize: 13, color: changeColor }}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </Typography.Text>
            )}
          </Flex>

          {miniPts && sparkColor && (
            <svg width={80} height={24} style={{ display: 'block', marginTop: 4 }}>
              <polyline
                points={miniPts}
                fill="none"
                stroke={sparkColor}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </svg>
          )}
        </Flex>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Dashboard Page
// ────────────────────────────────────────────────────────────────────────────────

type ChartMetric = 'active' | 'new' | 'nps' | 'velocity';
type BreakdownTab = 'product' | 'funnel' | 'incidents';

export default function DashboardPage() {
  const { token } = useToken();
  const [productId, setProductId] = useState('p1');
  const [dateRange, setDateRange] = useState('7d');
  const [granularity, setGranularity] = useState('daily');
  const [selectedMetric, setSelectedMetric] = useState<ChartMetric>('active');
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('product');

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });
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
  const { data: sprint } = useQuery({
    queryKey: ['sprint-metric'],
    queryFn: getSprintMetric,
  });
  const { data: incidents } = useQuery({
    queryKey: ['incidents'],
    queryFn: getIncidents,
  });
  const { data: funnel } = useQuery({
    queryKey: ['funnel'],
    queryFn: getFunnelSteps,
  });

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

  const velocityPct = sprint
    ? (sprint.completedPoints / sprint.totalPoints) * 100
    : 0;

  // Chart data based on selected metric
  const chartData: MetricPoint[] =
    selectedMetric === 'active'
      ? (activeUsers ?? [])
      : selectedMetric === 'new'
        ? (newUsers ?? [])
        : selectedMetric === 'nps'
          ? (nps ?? []).map((p) => ({ date: p.date, value: p.nps }))
          : [];

  const chartColor =
    selectedMetric === 'active'
      ? token.colorPrimary
      : selectedMetric === 'new'
        ? token.colorSuccess
        : selectedMetric === 'nps'
          ? token.colorWarning
          : token.colorError;

  const chartLoading =
    selectedMetric === 'active'
      ? activeLoading
      : selectedMetric === 'new'
        ? newLoading
        : npsLoading;

  // Breakdown table columns
  const productBreakdownData = (products ?? []).map((p, i) => ({
    key: p.id,
    name: p.name,
    team: p.team,
    activeUsers: [49, 31, 18][i] ?? 0,
    newUsers: [21, 14, 7][i] ?? 0,
    nps: [currentNps, currentNps - 5, currentNps + 3][i] ?? 0,
  }));

  return (
    <Flex vertical gap={0} style={{ minHeight: 0 }}>
      {/* ── Page header ── */}
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Обзор продукта
        </Typography.Title>
        <Flex gap={8}>
          <Button icon={<ShareAltOutlined />} size="small">
            Поделиться
          </Button>
          <Button type="primary" size="small">
            Настроить
          </Button>
        </Flex>
      </Flex>

      {/* ── Filter bar ── */}
      <Flex
        align="center"
        gap={8}
        wrap="wrap"
        style={{
          padding: '10px 14px',
          background: token.colorBgContainer,
          borderRadius: token.borderRadius,
          border: `1px solid ${token.colorBorderSecondary}`,
          marginBottom: 20,
        }}
      >
        <Button icon={<FilterOutlined />} size="small" type="text">
          Фильтр
        </Button>
        <Button icon={<TeamOutlined />} size="small" type="text">
          Сегмент
        </Button>
        <div
          style={{
            width: 1,
            height: 18,
            background: token.colorBorderSecondary,
            margin: '0 4px',
          }}
        />
        <Flex align="center" gap={6}>
          <ReloadOutlined style={{ fontSize: 12, color: token.colorTextTertiary }} />
          <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary }}>
            Данные от &lt;1 мин назад
          </Typography.Text>
        </Flex>
        <div style={{ flex: 1 }} />
        {productsLoading ? (
          <Skeleton.Input size="small" active style={{ width: 180 }} />
        ) : (
          <Select
            value={productId}
            onChange={setProductId}
            size="small"
            style={{ width: 190 }}
            options={(products ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
        )}
        <Select
          value={granularity}
          onChange={setGranularity}
          size="small"
          style={{ width: 90 }}
          options={[
            { value: 'daily', label: 'По дням' },
            { value: 'weekly', label: 'По неделям' },
          ]}
        />
        <Select
          value={dateRange}
          onChange={setDateRange}
          size="small"
          style={{ width: 130 }}
          options={[
            { value: '7d', label: 'Последние 7 дней' },
            { value: '14d', label: 'Последние 14 дней' },
            { value: '30d', label: 'Последние 30 дней' },
          ]}
        />
      </Flex>

      {/* ── KPI tiles ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 0 }}>
        <Col xs={12} sm={6}>
          <KpiTile
            label="Активные пользователи"
            sublabel="уникальные"
            value={currentActiveUsers}
            change={activeChange}
            loading={activeLoading}
            selected={selectedMetric === 'active'}
            icon={<UserOutlined />}
            sparkData={activeUsers?.slice(-14).map((d) => d.value)}
            sparkColor={token.colorPrimary}
            onClick={() => setSelectedMetric('active')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiTile
            label="Новые пользователи"
            sublabel="уникальные"
            value={currentNewUsers}
            change={newChange}
            loading={newLoading}
            selected={selectedMetric === 'new'}
            icon={<UserAddOutlined />}
            sparkData={newUsers?.slice(-14).map((d) => d.value)}
            sparkColor={token.colorSuccess}
            onClick={() => setSelectedMetric('new')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiTile
            label="NPS сегодня"
            value={currentNps}
            change={npsChange}
            loading={npsLoading}
            selected={selectedMetric === 'nps'}
            sparkData={nps?.slice(-14).map((d) => d.nps)}
            sparkColor={token.colorWarning}
            onClick={() => setSelectedMetric('nps')}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiTile
            label="Скорость спринта"
            value={`${sprint?.completedPoints ?? '—'}/${sprint?.totalPoints ?? '—'}`}
            change={velocityPct - 100}
            selected={selectedMetric === 'velocity'}
            onClick={() => setSelectedMetric('velocity')}
          />
        </Col>
      </Row>

      {/* ── Chart ── */}
      <div
        style={{
          marginTop: 12,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          padding: '16px 8px 8px',
        }}
      >
        <Flex justify="flex-end" align="center" style={{ marginBottom: 8, paddingRight: 8 }}>
          <Button size="small" type="text" style={{ fontSize: 12, color: token.colorTextSecondary }}>
            Линейный график ▾
          </Button>
        </Flex>

        {chartLoading ? (
          <Skeleton active paragraph={{ rows: 4 }} title={false} />
        ) : (
          <LineChartSVG data={chartData} color={chartColor} height={200} />
        )}

        {/* Legend */}
        <Flex align="center" gap={8} justify="center" style={{ marginTop: 8, paddingBottom: 4 }}>
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
            {selectedMetric === 'active'
              ? 'Все пользователи · Общий'
              : selectedMetric === 'new'
                ? 'Новые пользователи · Общий'
                : selectedMetric === 'nps'
                  ? 'NPS · Динамика'
                  : 'Скорость спринта'}
          </Typography.Text>
        </Flex>
      </div>

      {/* ── Breakdown ── */}
      <div
        style={{
          marginTop: 12,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          padding: '0 0 4px',
        }}
      >
        <Flex
          align="center"
          style={{
            padding: '12px 16px 0',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Typography.Text strong style={{ marginRight: 16, fontSize: 13 }}>
            Разбивка по
          </Typography.Text>
          <Tabs
            size="small"
            activeKey={breakdownTab}
            onChange={(k) => setBreakdownTab(k as BreakdownTab)}
            style={{ marginBottom: -1 }}
            items={[
              { key: 'product', label: 'Продукту' },
              { key: 'funnel', label: 'Воронке' },
              { key: 'incidents', label: 'Инцидентам' },
            ]}
          />
        </Flex>

        {breakdownTab === 'product' && (
          <Table
            size="small"
            pagination={false}
            dataSource={productBreakdownData}
            style={{ fontSize: 12 }}
            columns={[
              {
                title: 'Продукт',
                dataIndex: 'name',
                render: (name: string, row: typeof productBreakdownData[0]) => (
                  <Flex vertical gap={0}>
                    <Typography.Text style={{ fontSize: 12 }}>{name}</Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      {row.team}
                    </Typography.Text>
                  </Flex>
                ),
              },
              {
                title: 'Активные',
                dataIndex: 'activeUsers',
                align: 'right',
                sorter: (a, b) => a.activeUsers - b.activeUsers,
                defaultSortOrder: 'descend',
              },
              {
                title: 'Новые',
                dataIndex: 'newUsers',
                align: 'right',
                sorter: (a, b) => a.newUsers - b.newUsers,
              },
              {
                title: 'NPS',
                dataIndex: 'nps',
                align: 'right',
                render: (v: number) => (
                  <Typography.Text
                    style={{
                      color: v >= 65 ? token.colorSuccess : v >= 50 ? token.colorWarning : token.colorError,
                    }}
                  >
                    {v}
                  </Typography.Text>
                ),
              },
            ]}
          />
        )}

        {breakdownTab === 'funnel' && (
          <Table
            size="small"
            pagination={false}
            dataSource={funnel ?? []}
            rowKey="id"
            style={{ fontSize: 12 }}
            columns={[
              { title: 'Шаг воронки', dataIndex: 'name' },
              {
                title: 'Пользователей',
                dataIndex: 'value',
                align: 'right',
                render: (v: number) => v.toLocaleString('ru'),
              },
              {
                title: 'Конверсия',
                dataIndex: 'percent',
                align: 'right',
                render: (v: number, row) => (
                  <Typography.Text
                    style={{
                      color:
                        row.riskLevel === 'critical'
                          ? token.colorError
                          : row.riskLevel === 'warning'
                            ? token.colorWarning
                            : token.colorSuccess,
                    }}
                  >
                    {v}%
                  </Typography.Text>
                ),
              },
            ]}
          />
        )}

        {breakdownTab === 'incidents' && (
          <Table
            size="small"
            pagination={false}
            dataSource={incidents ?? []}
            rowKey="id"
            style={{ fontSize: 12 }}
            columns={[
              {
                title: 'Инцидент',
                dataIndex: 'title',
                render: (title: string) => (
                  <Typography.Text style={{ fontSize: 12 }}>{title}</Typography.Text>
                ),
              },
              {
                title: 'Критичность',
                dataIndex: 'severity',
                width: 120,
                render: (s: string) => (
                  <Typography.Text
                    style={{ color: s === 'critical' ? token.colorError : token.colorWarning, fontSize: 12 }}
                  >
                    {s === 'critical' ? 'Критичный' : 'Предупреждение'}
                  </Typography.Text>
                ),
              },
              {
                title: 'Время',
                dataIndex: 'time',
                width: 100,
                render: (t: string) => (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(t).toLocaleDateString('ru', { day: '2-digit', month: 'short' })}
                  </Typography.Text>
                ),
              },
            ]}
          />
        )}
      </div>
    </Flex>
  );
}
