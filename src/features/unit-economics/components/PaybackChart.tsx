import { useLayoutEffect, useRef, useState } from 'react';
import { theme } from 'antd';
import { fmt } from '../format';

const { useToken } = theme;

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
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const cac = -data[0]!.value; // data[0] is always {month:0, value:-CAC}
  const curveSpan = dataMax - dataMin;

  // Y domain (B+): the curve should fill most of the plot AND still react to input changes
  // AND show break-even (0) when it's reasonably in view.
  // - bottom = the curve's start (-CAC for profitable cards, lower for loss-making ones);
  // - top aims at 0 (break-even), but the empty space above the curve is capped at
  //   HEADROOM×(curve span) so a weak-margin curve never collapses into a thin sliver.
  // When 0 ends up above the domain (curve far below break-even), the top y-axis label is
  // negative, which itself signals "not yet paid back".
  let minV: number;
  let maxV: number;
  if (curveSpan < 1) {
    // ~flat curve (CM ≈ 0): show a CAC-scaled window around it instead of a bare line.
    const half = (Math.abs(cac) || 1) * 0.6;
    minV = dataMin - half;
    maxV = dataMin + half;
  } else {
    const HEADROOM = 0.35;
    const lo = dataMin;
    const hi = Math.min(Math.max(0, dataMax), dataMax + curveSpan * HEADROOM);
    const pad = (hi - lo) * 0.06;
    minV = lo - pad;
    maxV = hi + pad;
  }
  const range = maxV - minV || 1;

  const toX = (m: number) => (m / (data.length - 1)) * cw;
  const toY = (v: number) => ch - ((v - minV) / range) * ch;

  const zeroY = toY(0);
  const zeroInRange = minV < 0 && maxV > 0;

  // Payback crossing — interpolate the exact month where the cumulative flow hits zero,
  // instead of snapping to the first data point that is already positive.
  const paybackIdx = data.findIndex((d) => d.value >= 0);
  const crossMonth =
    paybackIdx > 0
      ? (() => {
          const prev = data[paybackIdx - 1]!;
          const cur = data[paybackIdx]!;
          const denom = cur.value - prev.value;
          const frac = denom !== 0 ? (0 - prev.value) / denom : 0;
          return prev.month + frac * (cur.month - prev.month);
        })()
      : null;

  // Build polyline points
  const pts = data.map((d) => `${toX(d.month)},${toY(d.value)}`).join(' ');

  const firstX = toX(data[0]!.month);
  const lastX = toX(data[data.length - 1]!.month);

  // Positive area (blue) — between the curve and the zero line, only where value > 0.
  // Bottom edge is always the zero line, so an all-negative curve yields an empty area
  // (previously it filled down to the chart bottom and flooded the whole plot).
  const posArea =
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.month)} ${toY(Math.max(d.value, 0))}`).join(' ') +
    ` L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;

  // Negative area (red) — between the zero line and the curve, only where value < 0.
  const negArea =
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(d.month)} ${toY(Math.min(d.value, 0))}`).join(' ') +
    ` L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;

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
                {Math.abs(v) >= 10000
                  ? `${fmt(v / 1000, 0)}k`
                  : Math.abs(v) >= 1000
                    ? `${fmt(v / 1000, 1)}k`
                    : fmt(Math.round(v), 0)}
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

        {/* Area fills — both bounded by the zero line, clipped to the plot rect */}
        <path d={posArea} fill="url(#ue-area-grad)" clipPath="url(#ue-clip)" />
        <path d={negArea} fill={dangerColor} fillOpacity={0.08} clipPath="url(#ue-clip)" />

        {/* Line */}
        <polyline
          points={pts}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          clipPath="url(#ue-clip)"
        />

        {/* Payback marker — sits on the exact zero crossing (interpolated) */}
        {crossMonth !== null && (
          <g>
            <line
              x1={toX(crossMonth)} y1={0}
              x2={toX(crossMonth)} y2={ch}
              stroke={token.colorSuccess}
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <circle
              cx={toX(crossMonth)}
              cy={toY(0)}
              r={5}
              fill={token.colorSuccess}
              stroke={token.colorBgContainer}
              strokeWidth={2}
            />
            <text
              x={toX(crossMonth) + 8}
              y={Math.max(toY(0) - 8, 12)}
              fill={token.colorSuccess}
              fontSize={10}
              fontFamily="Inter,sans-serif"
              fontWeight={600}
            >
              {Math.round(crossMonth)} мес.
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

// ─── Payback Chart container with ResizeObserver ──────────────────────────────

export function PaybackChartContainer({ data }: { data: Array<{ month: number; value: number }> }) {
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
