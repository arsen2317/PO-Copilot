import { theme } from 'antd';
import { Line } from '@ant-design/plots';
import type { MetricPoint } from '../../../data/types';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Step line chart — shows daily users for selected step
// ────────────────────────────────────────────────────────────────────────────────

interface StepLineChartProps {
  data: MetricPoint[];
  granularity: string;
  size: { w: number; h: number };
}

export function StepLineChart({ data, granularity, size }: StepLineChartProps) {
  const { token } = useToken();
  const color = token.colorPrimary;

  const fmtXLabel = (val: unknown): string => {
    const d = new Date(String(val));
    if (granularity === 'monthly') return d.toLocaleDateString('ru', { month: 'short' });
    if (granularity === 'weekly') {
      const end = new Date(d);
      end.setDate(d.getDate() + 6);
      return `${d.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}–${end.toLocaleDateString('ru', { day: 'numeric', month: 'short' })}`;
    }
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' });
  };

  return (
    <Line
      data={data}
      xField="date"
      yField="value"
      width={size.w}
      height={size.h}
      theme="classicDark"
      paddingBottom={40}
      paddingLeft={56}
      paddingTop={12}
      paddingRight={16}
      style={{ stroke: color, lineWidth: 2 }}
      point={{ style: { fill: color, r: 3, stroke: token.colorBgContainer, lineWidth: 1.5 } }}
      area={{ style: { fill: color, fillOpacity: 0.1 } }}
      axis={{
        x: { labelFormatter: fmtXLabel },
        y: { title: 'Конверсия' },
      }}
      tooltip={{
        title: (d: MetricPoint) => fmtXLabel(d.date),
        items: [(d: MetricPoint) => ({ name: 'Пользователей', value: d.value, color })],
      }}
      legend={false}
    />
  );
}
