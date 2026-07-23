import { Pie } from '@ant-design/plots';
import { fmtRub } from '../format';

export function DonutChart({ data, colors }: { data: Array<{ type: string; value: number }>; colors: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, width: '100%' }}>
      <Pie
        data={data}
        angleField="value"
        colorField="type"
        radius={0.85}
        innerRadius={0.6}
        theme="classicDark"
        color={colors}
        label={false}
        legend={false}
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
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
        {data.map((d, i) => (
          <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i] ?? '#888', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{d.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
