import { theme, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { useToken } = theme;

export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string | undefined;
  hint?: string | undefined;
  accent?: 'good' | 'bad' | 'warn' | undefined;
}

export function KpiTile({ label, value, sub, hint, accent }: KpiTileProps) {
  const { token } = useToken();
  const accentColor =
    accent === 'good' ? token.colorSuccess
    : accent === 'bad' ? token.colorError
    : accent === 'warn' ? token.colorWarning
    : token.colorText;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${token.colorBorderSecondary}`,
      borderRadius: token.borderRadiusLG,
      padding: '12px 14px',
      flex: 1,
      minWidth: 130,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: token.colorTextTertiary, fontWeight: 500 }}>{label}</span>
        {hint && (
          <Tooltip title={hint} placement="top">
            <InfoCircleOutlined style={{ fontSize: 10, color: token.colorTextQuaternary, cursor: 'default' }} />
          </Tooltip>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: accentColor }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: token.colorTextQuaternary, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}
