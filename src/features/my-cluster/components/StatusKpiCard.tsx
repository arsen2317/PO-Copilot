import { theme } from 'antd';
import { CaretDownOutlined, CaretUpOutlined } from '@ant-design/icons';
import type { ClusterKpi } from '../../../data/types';

const { useToken } = theme;

/**
 * Статусная KPI-карточка кластера: цветной блок «значение + подпись» (зелёный/
 * красный/жёлтый по статусу) и колонка сравнения с прошлым периодом справа.
 * Цвета — только через статус-токены antd (не хардкод), как требует CLAUDE.md.
 */
export default function StatusKpiCard({ kpi }: { kpi: ClusterKpi }) {
  const { token } = useToken();

  const palette = {
    good: { fg: token.colorSuccess, bg: token.colorSuccessBg, bd: token.colorSuccessBorder },
    bad: { fg: token.colorError, bg: token.colorErrorBg, bd: token.colorErrorBorder },
    warn: { fg: token.colorWarning, bg: token.colorWarningBg, bd: token.colorWarningBorder },
  }[kpi.status];

  const TrendIcon = kpi.trend === 'up' ? CaretUpOutlined : CaretDownOutlined;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        padding: 8,
      }}
    >
      {/* Цветной статус-блок */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          background: palette.bg,
          border: `1px solid ${palette.bd}`,
          borderRadius: token.borderRadius,
          padding: '12px 14px',
        }}
      >
        <TrendIcon
          style={{ position: 'absolute', top: 8, right: 8, fontSize: 12, color: palette.fg }}
        />
        <div
          style={{
            fontSize: 21,
            fontWeight: 700,
            lineHeight: 1.1,
            color: palette.fg,
            paddingRight: 16,
          }}
        >
          {kpi.value}
        </div>
        <div style={{ fontSize: 12, color: token.colorText, marginTop: 6, lineHeight: 1.3 }}>
          {kpi.label}
        </div>
        <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 1 }}>
          {kpi.period}
        </div>
      </div>

      {/* Колонка сравнения */}
      <div
        style={{
          flexShrink: 0,
          width: 96,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          textAlign: 'right',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, color: token.colorTextSecondary, lineHeight: 1.2 }}>
          {kpi.prevValue}
        </div>
        <div style={{ fontSize: 11, color: token.colorTextTertiary, marginTop: 3 }}>
          {kpi.prevLabel}
        </div>
      </div>
    </div>
  );
}
