import { useState } from 'react';
import { theme } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons';

const { useToken } = theme;

// ────────────────────────────────────────────────────────────────────────────────
// Funnel step tile
// ────────────────────────────────────────────────────────────────────────────────

interface FunnelTileProps {
  label: string;
  value: string;
  subLabel?: string;
  change: number;
  selected: boolean;
  onClick: () => void;
}

export function FunnelTile({ label, value, subLabel, change, selected, onClick }: FunnelTileProps) {
  const { token } = useToken();
  const [hovered, setHovered] = useState(false);
  const isPositive = change >= 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected
          ? 'rgba(74,130,247,0.12)'
          : hovered
            ? 'rgba(255,255,255,0.03)'
            : 'transparent',
        border: `1px solid ${selected ? token.colorPrimary : token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        padding: '14px 16px 12px',
        cursor: 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
        minWidth: 160,
        flexShrink: 0,
      }}
    >
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: selected ? token.colorPrimary : token.colorText }}>
          {label}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 600, lineHeight: 1, color: token.colorText }}>
          {value}
        </span>
        <span
          style={{
            fontSize: 12,
            color: isPositive ? token.colorSuccess : token.colorError,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {isPositive
            ? <ArrowUpOutlined style={{ fontSize: 9 }} />
            : <ArrowDownOutlined style={{ fontSize: 9 }} />}
          {Math.abs(change).toLocaleString('ru')}
        </span>
      </div>
      {subLabel && (
        <div style={{ fontSize: 11, color: token.colorTextQuaternary, marginTop: 4 }}>
          {subLabel}
        </div>
      )}
    </div>
  );
}
