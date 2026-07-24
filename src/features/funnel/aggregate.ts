import type { MetricPoint } from '../../data/types';

// Bucket daily points into weekly/monthly averages for the step line chart.
export function aggregateByGranularity(points: MetricPoint[], granularity: string): MetricPoint[] {
  if (granularity === 'daily' || points.length === 0) return points;
  const bucketSize = granularity === 'weekly' ? 7 : 30;
  const result: MetricPoint[] = [];
  for (let i = 0; i < points.length; i += bucketSize) {
    const slice = points.slice(i, i + bucketSize);
    const avg = slice.reduce((s, p) => s + p.value, 0) / slice.length;
    result.push({ date: slice[0]!.date, value: Math.round(avg) });
  }
  return result;
}
