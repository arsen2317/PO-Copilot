import { theme } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';
import type { ClusterKpi } from '../../../data/types';

const { useToken } = theme;

/**
 * KPI-тайл кластера — визуальный язык KpiTile с дашборда: мелкий лейбл,
 * крупное значение текущего периода, стрелка (+ процент, если задан)
 * в статусном цвете, строкой ниже — прошлый период («Q2: …» / «Май: …»).
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
      <div
        style={{
          marginBottom: 6,
          fontSize: 12,
          fontWeight: 500,
          color: token.colorText,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {kpi.label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 600, lineHeight: 1, color: token.colorText, whiteSpace: 'nowrap' }}>
          {kpi.value}
        </span>
        <span style={{ fontSize: 12, color: statusColor, display: 'flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
          {kpi.trend === 'up'
            ? <ArrowUpOutlined style={{ fontSize: 9 }} />
            : <ArrowDownOutlined style={{ fontSize: 9 }} />}
          {kpi.pct}
        </span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: token.colorTextTertiary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {kpi.prevLabel}: {kpi.prevValue}
      </div>
    </div>
  );
}
