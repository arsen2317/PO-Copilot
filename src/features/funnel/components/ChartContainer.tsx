import { useLayoutEffect, useRef, useState } from 'react';
import { Skeleton } from 'antd';
import type { FunnelAnalyticsStep } from '../../../data/types';
import { OVERALL_ID } from '../constants';
import { aggregateByGranularity } from '../aggregate';
import { FunnelBarChart } from './FunnelBarChart';
import { StepLineChart } from './StepLineChart';

// ────────────────────────────────────────────────────────────────────────────────
// Chart container with ResizeObserver
// ────────────────────────────────────────────────────────────────────────────────

interface ChartContainerProps {
  selectedId: string;
  steps: FunnelAnalyticsStep[];
  granularity: string;
  loading: boolean;
}

export function ChartContainer({ selectedId, steps, granularity, loading }: ChartContainerProps) {
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

  const isOverall = selectedId === OVERALL_ID;
  const selectedStep = steps.find((s) => s.id === selectedId);
  const chartData = aggregateByGranularity(selectedStep?.history ?? [], granularity);

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 240 }}>
      {loading ? (
        <div style={{ padding: '24px 24px 8px' }}>
          <Skeleton active paragraph={{ rows: 8 }} title={false} />
        </div>
      ) : size ? (
        isOverall ? (
          <FunnelBarChart steps={steps} size={size} />
        ) : (
          <StepLineChart key={selectedId} data={chartData} granularity={granularity} size={size} />
        )
      ) : null}
    </div>
  );
}
