import { useRef, useState } from 'react';
import type { FunnelAnalyticsStep } from '../../../data/types';

// ────────────────────────────────────────────────────────────────────────────────
// Funnel bar chart — custom SVG: solid blue (converted) + diagonal-stripe (dropped)
// ────────────────────────────────────────────────────────────────────────────────

interface FunnelBarChartProps {
  steps: FunnelAnalyticsStep[];
  size: { w: number; h: number };
}

interface HoverZone {
  barIdx: number;
  zone: 'blue' | 'hatch';
  mouseX: number;
  mouseY: number;
}

export function FunnelBarChart({ steps, size }: FunnelBarChartProps) {
  const [hover, setHover] = useState<HoverZone | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const PAD = { top: 36, right: 24, bottom: 72, left: 52 };
  const chartW = size.w - PAD.left - PAD.right;
  const chartH = size.h - PAD.top - PAD.bottom;

  const n = steps.length;
  const colW = chartW / n;
  const barW = colW * 0.52;
  const barOff = (colW - barW) / 2;

  const toY = (pct: number) => chartH * (1 - pct / 100);

  const yLabels = [0, 25, 50, 75, 100];
  const totalUsers = steps[0]?.users ?? 1;

  const getBlueColor = (i: number): string => {
    if (!hover) return '#4E6AF6';
    if (hover.zone === 'blue' && hover.barIdx === i) return '#7B93FF';
    if (hover.zone === 'hatch') return '#2E4099';
    return '#4E6AF6';
  };

  const getHatchOverlay = (i: number): string | null => {
    if (!hover) return null;
    if (hover.zone === 'hatch' && hover.barIdx === i) return 'rgba(200,220,255,0.18)';
    if (hover.zone === 'blue') return 'rgba(0,0,0,0.28)';
    return null;
  };

  const handleMouse = (e: React.MouseEvent, barIdx: number, zone: 'blue' | 'hatch') => {
    const svgRect = svgRef.current?.getBoundingClientRect();
    if (!svgRect) return;
    setHover({ barIdx, zone, mouseX: e.clientX - svgRect.left, mouseY: e.clientY - svgRect.top });
  };

  return (
    <div style={{ position: 'relative', width: size.w, height: size.h, overflow: 'visible' }}>
      <svg ref={svgRef} width={size.w} height={size.h} style={{ display: 'block' }}>
        <defs>
          <pattern id="funnel-hatch" patternUnits="userSpaceOnUse" width="9" height="9" patternTransform="rotate(-45 0 0)">
            <rect width="9" height="9" fill="rgba(100,130,255,0.28)" />
            <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(255,255,255,0.55)" strokeWidth="3" />
          </pattern>
        </defs>

        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Y-axis grid + labels */}
          {yLabels.map((pct) => (
            <g key={pct}>
              <line
                x1={0} y1={toY(pct)} x2={chartW} y2={toY(pct)}
                stroke="rgba(255,255,255,0.07)" strokeWidth={1}
                strokeDasharray={pct === 0 ? 'none' : '3 3'}
              />
              <text
                x={-8} y={toY(pct)}
                textAnchor="end" dominantBaseline="middle"
                fill="rgba(255,255,255,0.38)" fontSize={11} fontFamily="Inter,sans-serif"
              >{pct}%</text>
            </g>
          ))}

          {/* Bars */}
          {steps.map((step, i) => {
            const currPct = step.users / totalUsers;
            const prevPct = i === 0 ? 1.0 : steps[i - 1]!.users / totalUsers;

            const x = i * colW + barOff;
            const solidH = chartH * currPct;
            const solidY = chartH * (1 - currPct);
            const hatchH = chartH * (prevPct - currPct);
            const hatchY = chartH * (1 - prevPct);

            const shortName = step.name.length > 18 ? step.name.slice(0, 17) + '…' : step.name;
            const hatchOverlay = getHatchOverlay(i);

            // Chip: centered on the hatch/blue boundary
            const chipW = 68;
            const chipH = 38;
            const chipX = x + barW / 2 - chipW / 2;
            const chipY = solidY - chipH / 2;

            return (
              <g key={step.id}>
                {/* ── Hatch zone ── */}
                {hatchH > 0 && (
                  <>
                    <rect x={x} y={hatchY} width={barW} height={hatchH}
                      fill="url(#funnel-hatch)"
                      stroke="rgba(255,255,255,0.22)" strokeWidth={1} rx={3} />
                    {hatchOverlay && (
                      <rect x={x} y={hatchY} width={barW} height={hatchH}
                        style={{ fill: hatchOverlay, transition: 'fill 0.15s', pointerEvents: 'none' }} rx={3} />
                    )}
                    {/* transparent hit area */}
                    <rect x={x} y={hatchY} width={barW} height={hatchH}
                      fill="transparent" style={{ cursor: 'pointer' }}
                      onMouseMove={(e) => handleMouse(e, i, 'hatch')}
                      onMouseLeave={() => setHover(null)} />
                  </>
                )}

                {/* ── Blue zone ── */}
                {solidH > 0 && (
                  <>
                    <rect x={x} y={solidY} width={barW} height={solidH}
                      style={{ fill: getBlueColor(i), transition: 'fill 0.15s' }}
                      stroke="rgba(255,255,255,0.22)" strokeWidth={1} rx={3} />
                    {/* transparent hit area */}
                    <rect x={x} y={solidY} width={barW} height={solidH}
                      fill="transparent" style={{ cursor: 'pointer' }}
                      onMouseMove={(e) => handleMouse(e, i, 'blue')}
                      onMouseLeave={() => setHover(null)} />
                  </>
                )}

                {/* ── Chip label (% + users) ── */}
                <g style={{ pointerEvents: 'none' }}>
                  <rect x={chipX} y={chipY} width={chipW} height={chipH}
                    rx={6} fill="rgba(8,10,20,0.84)"
                    stroke="rgba(255,255,255,0.13)" strokeWidth={1} />
                  <text x={x + barW / 2} y={chipY + 15}
                    textAnchor="middle" fill="#fff"
                    fontSize={13} fontWeight={700} fontFamily="Inter,sans-serif">
                    {(currPct * 100).toFixed(1)}%
                  </text>
                  <text x={x + barW / 2} y={chipY + 29}
                    textAnchor="middle" fill="rgba(255,255,255,0.50)"
                    fontSize={11} fontFamily="Inter,sans-serif">
                    {step.users.toLocaleString('ru')}
                  </text>
                </g>

                {/* ── X-axis label ── */}
                <text textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={10} fontFamily="Inter,sans-serif">
                  <tspan x={x + barW / 2} y={chartH + 18}>Шаг {i + 1}</tspan>
                  <tspan x={x + barW / 2} dy={14}>{shortName}</tspan>
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Tooltip ── */}
      {hover && (() => {
        const step = steps[hover.barIdx]!;
        const currPct = step.users / totalUsers;
        const prevStep = hover.barIdx > 0 ? steps[hover.barIdx - 1]! : null;
        const convFromPrev = prevStep ? (step.users / prevStep.users) * 100 : 100;
        const dropPctFromPrev = 100 - convFromPrev;
        const dropCountFromPrev = prevStep ? prevStep.users - step.users : 0;
        const isBlue = hover.zone === 'blue';

        return (
          <div style={{
            position: 'absolute',
            left: Math.min(hover.mouseX + 14, size.w - 240),
            top: Math.max(hover.mouseY - 60, 4),
            background: '#1a1b1f',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 12,
            color: '#fff',
            pointerEvents: 'none',
            zIndex: 20,
            minWidth: 220,
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            lineHeight: 1.7,
          }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{step.name}</div>
            {isBlue ? (
              <>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#8DA4F5' }}>
                    {(currPct * 100).toFixed(1)}%
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.50)', marginLeft: 6, fontSize: 12 }}>
                    конверсия от первого шага
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>
                  <b style={{ color: '#fff' }}>
                    {step.users.toLocaleString('ru')} / {totalUsers.toLocaleString('ru')}
                  </b>
                  <span style={{ marginLeft: 4 }}>уникальных конверсий</span>
                </div>
                {prevStep && (
                  <div style={{ color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
                    {convFromPrev.toFixed(1)}% от предыдущего шага
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#FF8A8A' }}>
                    {dropPctFromPrev.toFixed(1)}%
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.50)', marginLeft: 6, fontSize: 12 }}>
                    отсев от предыдущего шага
                  </span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.50)', marginTop: 4 }}>
                  <b style={{ color: '#fff' }}>
                    {dropCountFromPrev.toLocaleString('ru')} / {(prevStep?.users ?? totalUsers).toLocaleString('ru')}
                  </b>
                  <span style={{ marginLeft: 4 }}>уникальных отсевов</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.40)', marginTop: 2 }}>
                  −{dropCountFromPrev.toLocaleString('ru')} чел. на этом шаге
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
