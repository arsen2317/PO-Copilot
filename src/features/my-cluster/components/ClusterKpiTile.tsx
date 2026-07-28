import { theme } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { ClusterKpi } from '../../../data/types';

const { useToken } = theme;

const fmt1 = (n: number) =>
  n.toLocaleString('ru-RU', { maximumFractionDigits: n % 1 === 0 ? 0 : 2 });

function fmtValue(k: ClusterKpi): string {
  switch (k.format) {
    case 'mln_rub':  return `${fmt1(k.value)} млн ₽`;
    case 'mln':      return `${fmt1(k.value)} млн`;
    case 'thousand': return `${fmt1(k.value)} тыс.`;
    case 'percent':  return `${fmt1(k.value)}%`;
    case 'days':     return `${fmt1(k.value)} дн.`;
    case 'hours':    return `${fmt1(k.value)} ч.`;
    case 'count':    return fmt1(k.value);
  }
}

/**
 * KPI-тайл кластера — тот же визуальный язык, что KpiTile на дашборде:
 * мелкий лейбл + период, крупное значение, стрелка и дельта к прошлому
 * периоду в статусном цвете (colorSuccess/Warning/Error).
 */
export default function ClusterKpiTile({ kpi }: { kpi: ClusterKpi }) {
  const { token } = useToken();
  const statusColor = {
    good: token.colorSuccess,
    warn: token.colorWarning,
    bad: token.colorError,
  }[kpi.status];

  // Для процентных метрик дельта — в п.п.; для остальных — в % к прошлому периоду.
  const delta = kpi.format === 'percent'
    ? kpi.value - kpi.prevValue
    : kpi.prevValue === 0
      ? 0
      : ((kpi.value - kpi.prevValue) / Math.abs(kpi.prevValue)) * 100;
  const rising = delta >= 0;
  const deltaText = `${Math.abs(delta).toFixed(1)}${kpi.format === 'percent' ? ' пп' : '%'}`;

  return (
    <div
      style={{
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        padding: '14px 16px 12px',
        minWidth: 0,
      }}
    >
      <div style={{ marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: token.colorText }}>{kpi.label}</span>
        <span style={{ fontSize: 11, color: token.colorTextTertiary, marginLeft: 5 }}>
          ({kpi.period === 'month' ? 'за месяц' : 'за квартал'})
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: token.colorText, whiteSpace: 'nowrap' }}>
          {fmtValue(kpi)}
        </span>
        <span style={{ fontSize: 12, color: statusColor, display: 'flex', alignItems: 'center', gap: 2 }}>
          {rising ? <ArrowUpOutlined style={{ fontSize: 9 }} /> : <ArrowDownOutlined style={{ fontSize: 9 }} />}
          {deltaText}
        </span>
      </div>
    </div>
  );
}
