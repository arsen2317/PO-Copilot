import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Divider, InputNumber, Tabs, theme, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Pie } from '@ant-design/plots';

const { useToken } = theme;

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalcParams {
  txPerMonth: number;
  avgTxAmount: number;
  interchangeRate: number;
  avgBalance: number;
  nim: number;
  monthlyFee: number;
  otherFeeIncome: number;
  cashbackRate: number;
  processingCostPerTx: number;
  accountServicingCost: number;
  cac: number;
  churnRate: number;
  discountRate: number;
}

interface CalcResult {
  revenue: number;
  cost: number;
  cm: number;
  cmPct: number;
  paybackMonths: number | null;
  ltv: number;
  ltvCac: number | null;
  paybackCurve: Array<{ month: number; value: number }>;
  revenueBreakdown: Array<{ type: string; value: number }>;
  costBreakdown: Array<{ type: string; value: number }>;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULTS: CalcParams = {
  txPerMonth: 15,
  avgTxAmount: 800,
  interchangeRate: 1.5,
  avgBalance: 25000,
  nim: 4,
  monthlyFee: 0,
  otherFeeIncome: 20,
  cashbackRate: 1,
  processingCostPerTx: 2,
  accountServicingCost: 80,
  cac: 1500,
  churnRate: 5,
  discountRate: 12,
};

// ─── Calculation ─────────────────────────────────────────────────────────────

function calculate(p: CalcParams): CalcResult {
  const turnover = p.txPerMonth * p.avgTxAmount;

  const interchange = turnover * p.interchangeRate / 100;
  const interestIncome = p.avgBalance * p.nim / 100 / 12;
  const fees = p.monthlyFee + p.otherFeeIncome;
  const revenue = interchange + interestIncome + fees;

  const cashback = turnover * p.cashbackRate / 100;
  const processing = p.txPerMonth * p.processingCostPerTx;
  const servicing = p.accountServicingCost;
  const cost = cashback + processing + servicing;

  const cm = revenue - cost;
  const cmPct = revenue > 0 ? (cm / revenue) * 100 : 0;
  const paybackMonths = cm > 0 ? p.cac / cm : null;

  const horizon = p.churnRate > 0 ? Math.min(Math.ceil(1 / (p.churnRate / 100)), 120) : 60;
  const retention = 1 - p.churnRate / 100;
  const monthlyDiscount = p.discountRate / 100 / 12;

  let ltv = 0;
  for (let t = 1; t <= horizon; t++) {
    ltv += cm * Math.pow(retention, t - 1) / Math.pow(1 + monthlyDiscount, t - 1);
  }

  const ltvCac = p.cac > 0 ? ltv / p.cac : null;

  const displayHorizon = Math.min(horizon, 48);
  const paybackCurve: Array<{ month: number; value: number }> = [
    { month: 0, value: -p.cac },
  ];
  for (let t = 1; t <= displayHorizon; t++) {
    paybackCurve.push({
      month: t,
      value: paybackCurve[t - 1]!.value + cm * Math.pow(retention, t - 1),
    });
  }

  return {
    revenue,
    cost,
    cm,
    cmPct,
    paybackMonths,
    ltv,
    ltvCac,
    paybackCurve,
    revenueBreakdown: [
      { type: 'Интерчейндж', value: Math.max(interchange, 0.001) },
      { type: 'Процентный доход', value: Math.max(interestIncome, 0.001) },
      { type: 'Комиссии', value: Math.max(fees, 0.001) },
    ],
    costBreakdown: [
      { type: 'Кешбэк', value: Math.max(cashback, 0.001) },
      { type: 'Процессинг', value: Math.max(processing, 0.001) },
      { type: 'Обслуживание', value: Math.max(servicing, 0.001) },
    ],
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────────

const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('ru', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtRub = (n: number) => `${fmt(Math.round(n))} ₽`;
const fmtPct = (n: number) => `${fmt(n, 1)}%`;

// ─── KPI Tile ────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: string;
  sub?: string | undefined;
  hint?: string | undefined;
  accent?: 'good' | 'bad' | 'warn' | undefined;
}

function KpiTile({ label, value, sub, hint, accent }: KpiTileProps) {
  const { token } = useToken();
  const accentColor =
    accent === 'good' ? token.colorSuccess
    : accent === 'bad' ? token.colorError
    : accent === 'warn' ? token.colorWarning
    : token.colorText;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: token.borderRadiusLG,
      padding: '12px 14px',
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: token.colorTextTertiary, fontWeight: 500 }}>{label}</span>
        {hint && (
          <Tooltip title={hint} placement="top">
            <InfoCircleOutlined style={{ fontSize: 10, color: token.colorTextQuaternary, cursor: 'default' }} />
          </Tooltip>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: accentColor }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: token.colorTextQuaternary, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Payback SVG Chart ───────────────────────────────────────────────────────

interface PaybackChartProps {
  data: Array<{ month: number; value: number }>;
  size: { w: number; h: number };
}

function PaybackChart({ data, size }: PaybackChartProps) {
  const { token } = useToken();

  if (data.length < 2) return null;

  const PAD = { top: 20, right: 20, bottom: 44, left: 64 };
  const cw = size.w - PAD.left - PAD.right;
  const ch = size.h - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;

  const toX = (m: number) => (m / (data.length - 1)) * cw;
  const toY = (v: number) => ch - ((v - minV) / range) * ch;

  const zeroY = toY(0);
  const zeroInRange = minV < 0 && maxV > 0;

  // Find payback month index (first positive)
  const paybackIdx = data.findIndex((d) => d.value >= 0);

  // Build polyline points
  const pts = data.map((d) => `${toX(d.month)},${toY(d.value)}`).join(' ');

  // Gradient area path (above zero)
  const areaPath =
    data.map((d, i) => {
      const x = toX(d.month);
      const y = toY(Math.max(d.value, 0));
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') +
    ` L ${toX(data[data.length - 1]!.month)} ${zeroInRange ? zeroY : ch}` +
    ` L ${toX(data[0]!.month)} ${zeroInRange ? zeroY : ch} Z`;

  // Y-axis labels: pick ~5 nice values
  const yStep = range / 4;
  const yLabels = [0, 1, 2, 3, 4].map((i) => minV + yStep * i);

  // X-axis labels
  const maxLabels = 7;
  const xStep = Math.max(1, Math.ceil(data.length / maxLabels));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  const lineColor = token.colorPrimary;
  const dangerColor = token.colorError;

  return (
    <svg width={size.w} height={size.h} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="ue-area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="ue-clip">
          <rect x={0} y={0} width={cw} height={ch} />
        </clipPath>
      </defs>

      <g transform={`translate(${PAD.left},${PAD.top})`}>
        {/* Grid + Y labels */}
        {yLabels.map((v, i) => {
          const y = toY(v);
          if (y < -4 || y > ch + 4) return null;
          const isZero = Math.abs(v) < range * 0.01;
          return (
            <g key={i}>
              <line
                x1={0} y1={y} x2={cw} y2={y}
                stroke={isZero ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)'}
                strokeWidth={isZero ? 1.5 : 1}
                strokeDasharray={isZero ? 'none' : '3 3'}
              />
              <text
                x={-8} y={y} textAnchor="end" dominantBaseline="middle"
                fill="rgba(255,255,255,0.38)" fontSize={10} fontFamily="Inter,sans-serif"
              >
                {Math.abs(v) >= 1000 ? `${fmt(v / 1000, 0)}k` : fmt(v, 0)}
              </text>
            </g>
          );
        })}

        {/* Zero line if in range */}
        {zeroInRange && (
          <line
            x1={0} y1={zeroY} x2={cw} y2={zeroY}
            stroke="rgba(255,255,255,0.25)" strokeWidth={1}
          />
        )}

        {/* Area fill (positive part) */}
        <path d={areaPath} fill="url(#ue-area-grad)" clipPath="url(#ue-clip)" />

        {/* Negative area */}
        {zeroInRange && (
          <path
            d={
              data.map((d, i) => {
                const x = toX(d.month);
                const y = toY(Math.min(d.value, 0));
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ') +
              ` L ${toX(data[data.length - 1]!.month)} ${zeroY}` +
              ` L ${toX(data[0]!.month)} ${zeroY} Z`
            }
            fill={dangerColor}
            fillOpacity={0.08}
            clipPath="url(#ue-clip)"
          />
        )}

        {/* Line */}
        <polyline
          points={pts}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          clipPath="url(#ue-clip)"
        />

        {/* Payback marker */}
        {paybackIdx > 0 && paybackIdx < data.length && (
          <g>
            <line
              x1={toX(data[paybackIdx]!.month)} y1={0}
              x2={toX(data[paybackIdx]!.month)} y2={ch}
              stroke={token.colorSuccess}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <circle
              cx={toX(data[paybackIdx]!.month)}
              cy={toY(data[paybackIdx]!.value)}
              r={5}
              fill={token.colorSuccess}
              stroke={token.colorBgContainer}
              strokeWidth={2}
            />
            <text
              x={toX(data[paybackIdx]!.month) + 8}
              y={Math.max(toY(data[paybackIdx]!.value) - 8, 12)}
              fill={token.colorSuccess}
              fontSize={10}
              fontFamily="Inter,sans-serif"
              fontWeight={600}
            >
              {data[paybackIdx]!.month} мес.
            </text>
          </g>
        )}

        {/* X labels */}
        {xLabels.map((d) => (
          <text
            key={d.month}
            x={toX(d.month)} y={ch + 18}
            textAnchor="middle"
            fill="rgba(255,255,255,0.38)"
            fontSize={10}
            fontFamily="Inter,sans-serif"
          >
            {d.month}
          </text>
        ))}

        {/* X axis label */}
        <text
          x={cw / 2} y={ch + 36}
          textAnchor="middle"
          fill="rgba(255,255,255,0.28)"
          fontSize={10}
          fontFamily="Inter,sans-serif"
        >
          месяц
        </text>
      </g>
    </svg>
  );
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

const REVENUE_COLORS = ['#4E6AF6', '#7B93FF', '#A0B3FF'];
const COST_COLORS = ['#FF6B6B', '#FF9E7A', '#FFB347'];

function DonutChart({ data, colors }: { data: Array<{ type: string; value: number }>; colors: string[] }) {
  return (
    <Pie
      data={data}
      angleField="value"
      colorField="type"
      radius={0.85}
      innerRadius={0.6}
      theme="classicDark"
      color={colors}
      label={false}
      legend={{ position: 'bottom', layout: 'horizontal' }}
      tooltip={{
        items: [
          (d: { type: string; value: number }, _index: number, data: Array<{ type: string; value: number }>) => {
            const total = data.reduce((s, x) => s + x.value, 0);
            return {
              name: d.type,
              value: `${fmtRub(d.value)} (${((d.value / total) * 100).toFixed(1)}%)`,
            };
          },
        ],
      }}
      height={260}
    />
  );
}

// ─── Input row helper ────────────────────────────────────────────────────────

interface InputRowProps {
  label: string;
  hint?: string;
  suffix?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  onChange: (v: number) => void;
}

function InputRow({ label, hint, suffix, value, min = 0, max, step = 1, precision = 0, onChange }: InputRowProps) {
  const { token } = useToken();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 13, color: token.colorTextSecondary }}>{label}</span>
        {hint && (
          <Tooltip title={hint} placement="right">
            <InfoCircleOutlined style={{ fontSize: 11, color: token.colorTextQuaternary, cursor: 'default' }} />
          </Tooltip>
        )}
      </div>
      <InputNumber<number>
        value={value}
        min={min}
        {...(max !== undefined ? { max } : {})}
        step={step}
        precision={precision}
        size="small"
        suffix={suffix}
        style={{ width: 110, flexShrink: 0 }}
        onChange={(v) => { if (v !== null) onChange(v as number); }}
      />
    </div>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { token } = useToken();
  return (
    <Typography.Text
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: token.colorTextQuaternary,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 10,
      }}
    >
      {children}
    </Typography.Text>
  );
}

// ─── Payback Chart container with ResizeObserver ──────────────────────────────

function PaybackChartContainer({ data }: { data: Array<{ month: number; value: number }> }) {
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

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 260 }}>
      {size && <PaybackChart data={data} size={size} />}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function UnitEconomicsPage() {
  const { token } = useToken();
  const [params, setParams] = useState<CalcParams>(DEFAULTS);

  const set = <K extends keyof CalcParams>(key: K) => (v: number) =>
    setParams((prev) => ({ ...prev, [key]: v }));

  const result = useMemo(() => calculate(params), [params]);

  const paybackStatus =
    result.paybackMonths === null ? 'bad'
    : result.paybackMonths <= 12 ? 'good'
    : result.paybackMonths <= 24 ? 'warn'
    : 'bad';

  const ltvCacStatus =
    result.ltvCac === null ? 'bad'
    : result.ltvCac >= 3 ? 'good'
    : result.ltvCac >= 1 ? 'warn'
    : 'bad';

  const cmStatus = result.cm > 0 ? 'good' : 'bad';

  const BDR = `1px solid ${token.colorBorderSecondary}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 0 }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexShrink: 0 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
            Unit-экономика
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            Расчёт прибыльности одной активной дебетовой карты
          </Typography.Text>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 12 }}>

        {/* ── Left: input panel ── */}
        <div style={{
          width: 280,
          flexShrink: 0,
          background: token.colorBgContainer,
          border: BDR,
          borderRadius: token.borderRadiusLG,
          overflow: 'hidden auto',
          padding: '16px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
        }}>

          <SectionTitle>Доходы</SectionTitle>

          <InputRow
            label="Транзакций в месяц"
            value={params.txPerMonth}
            min={0}
            max={200}
            onChange={set('txPerMonth')}
          />
          <InputRow
            label="Средний чек"
            suffix="₽"
            value={params.avgTxAmount}
            min={0}
            step={100}
            onChange={set('avgTxAmount')}
          />
          <InputRow
            label="Ставка интерчейнджа"
            hint="% от суммы транзакции"
            suffix="%"
            value={params.interchangeRate}
            min={0}
            max={5}
            step={0.1}
            precision={2}
            onChange={set('interchangeRate')}
          />
          <InputRow
            label="Остаток на счёте"
            suffix="₽"
            value={params.avgBalance}
            min={0}
            step={1000}
            onChange={set('avgBalance')}
          />
          <InputRow
            label="Чистая % маржа"
            hint="ЧПМ, % годовых"
            suffix="%"
            value={params.nim}
            min={0}
            max={30}
            step={0.5}
            precision={1}
            onChange={set('nim')}
          />
          <InputRow
            label="Ежемесячная плата"
            suffix="₽"
            value={params.monthlyFee}
            min={0}
            step={10}
            onChange={set('monthlyFee')}
          />
          <InputRow
            label="Прочие доходы"
            hint="Снятия наличных, прочие комиссии"
            suffix="₽/мес"
            value={params.otherFeeIncome}
            min={0}
            step={5}
            onChange={set('otherFeeIncome')}
          />

          <Divider style={{ margin: '14px 0 12px' }} />
          <SectionTitle>Расходы</SectionTitle>

          <InputRow
            label="Кешбэк / лояльность"
            suffix="% об."
            value={params.cashbackRate}
            min={0}
            max={10}
            step={0.1}
            precision={2}
            onChange={set('cashbackRate')}
          />
          <InputRow
            label="Процессинг (за транз.)"
            suffix="₽"
            value={params.processingCostPerTx}
            min={0}
            step={0.5}
            precision={1}
            onChange={set('processingCostPerTx')}
          />
          <InputRow
            label="Обслуживание счёта"
            hint="ДБО, колл-центр, пластик"
            suffix="₽/мес"
            value={params.accountServicingCost}
            min={0}
            step={5}
            onChange={set('accountServicingCost')}
          />
          <InputRow
            label="CAC"
            hint="Стоимость привлечения одного клиента"
            suffix="₽"
            value={params.cac}
            min={0}
            step={100}
            onChange={set('cac')}
          />

          <Divider style={{ margin: '14px 0 12px' }} />
          <SectionTitle>Параметры LTV</SectionTitle>

          <InputRow
            label="Отток в месяц (Churn)"
            hint="% активных карт, уходящих в месяц"
            suffix="%/мес"
            value={params.churnRate}
            min={0.1}
            max={50}
            step={0.5}
            precision={1}
            onChange={set('churnRate')}
          />
          <InputRow
            label="Ставка дисконтирования"
            suffix="% год"
            value={params.discountRate}
            min={0}
            max={50}
            step={1}
            onChange={set('discountRate')}
          />
        </div>

        {/* ── Right: results ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* KPI tiles */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            <KpiTile
              label="Выручка / карта / мес"
              value={fmtRub(result.revenue)}
              hint="Сумма всех источников дохода"
            />
            <KpiTile
              label="Расходы / карта / мес"
              value={fmtRub(result.cost)}
              hint="Переменные операционные расходы без CAC"
            />
            <KpiTile
              label="Contribution Margin"
              value={fmtRub(result.cm)}
              sub={`${fmtPct(result.cmPct)} от выручки`}
              accent={cmStatus}
              hint="Выручка минус операционные расходы"
            />
            <KpiTile
              label="Срок окупаемости"
              value={result.paybackMonths !== null ? `${fmt(result.paybackMonths, 1)} мес.` : 'Не окупается'}
              sub={result.paybackMonths !== null
                ? result.paybackMonths <= 12 ? 'Отличный показатель'
                  : result.paybackMonths <= 24 ? 'Приемлемый показатель'
                  : 'Высокий срок окупаемости'
                : 'Маржа отрицательная'}
              accent={paybackStatus}
              hint="CAC / Contribution Margin"
            />
            <KpiTile
              label="LTV"
              value={fmtRub(result.ltv)}
              sub={`горизонт ${Math.min(Math.ceil(1 / (params.churnRate / 100)), 120)} мес.`}
              hint="Чистая приведённая стоимость будущих маржей"
            />
            <KpiTile
              label="LTV / CAC"
              value={result.ltvCac !== null ? `${fmt(result.ltvCac, 2)}x` : '—'}
              sub={result.ltvCac !== null
                ? result.ltvCac >= 3 ? '≥ 3x — хорошо'
                  : result.ltvCac >= 1 ? '1–3x — приемлемо'
                  : '< 1x — убыточно'
                : undefined}
              accent={ltvCacStatus}
              hint="Отношение LTV к стоимости привлечения"
            />
          </div>

          {/* Charts card */}
          <div style={{
            flex: 1,
            background: token.colorBgContainer,
            border: BDR,
            borderRadius: token.borderRadiusLG,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Tabs
              defaultActiveKey="payback"
              size="small"
              style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              tabBarStyle={{ margin: '0 16px', flexShrink: 0 }}
              items={[
                {
                  key: 'payback',
                  label: 'График окупаемости',
                  children: (
                    <div style={{ padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8, display: 'block' }}>
                        Накопленный денежный поток (Contribution Margin − CAC), ₽
                      </Typography.Text>
                      <PaybackChartContainer data={result.paybackCurve} />
                    </div>
                  ),
                },
                {
                  key: 'revenue',
                  label: 'Структура выручки',
                  children: (
                    <div style={{ padding: '8px 24px 12px' }}>
                      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8, display: 'block' }}>
                        Итого: {fmtRub(result.revenue)} / карта / мес
                      </Typography.Text>
                      <DonutChart data={result.revenueBreakdown} colors={REVENUE_COLORS} />
                    </div>
                  ),
                },
                {
                  key: 'cost',
                  label: 'Структура расходов',
                  children: (
                    <div style={{ padding: '8px 24px 12px' }}>
                      <Typography.Text style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8, display: 'block' }}>
                        Итого: {fmtRub(result.cost)} / карта / мес
                      </Typography.Text>
                      <DonutChart data={result.costBreakdown} colors={COST_COLORS} />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      <div style={{ height: 24, flexShrink: 0 }} />
    </div>
  );
}
