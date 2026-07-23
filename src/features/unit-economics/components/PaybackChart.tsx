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
