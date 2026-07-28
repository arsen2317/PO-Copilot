import { theme } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { ClusterKpi } from '../../../data/types';

const { useToken } = theme;

/**
 * KPI-тайл кластера — визуальный язык KpiTile с дашборда: мелкий лейбл
 * + период, крупное значение, стрелка изменения в статусном цвете
 * (colorSuccess/Warning/Error) и сравнение с прошлым периодом.
 */
export default function ClusterKpiTile({ kpi }: { kpi: ClusterKpi }) {
  const { token } = useToken();
  const statusColor = {
    good: token.colorSuccess,
    warn: token.colorWarning,
    bad: token.colorError,
  }[kpi.status];

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
        <span style={{ fontSize: 11, color: token.colorTextTertiary, marginLeft: 5 }}>({kpi.period})</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: token.colorText, whiteSpace: 'nowrap' }}>
          {kpi.value}
        </span>
        <span style={{ fontSize: 11, color: statusColor }}>
          {kpi.trend === 'up'
            ? <ArrowUpOutlined style={{ fontSize: 10 }} />
            : <ArrowDownOutlined style={{ fontSize: 10 }} />}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: token.colorTextTertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {kpi.prevValue} — {kpi.prevLabel}
      </div>
    </div>
  );
}
