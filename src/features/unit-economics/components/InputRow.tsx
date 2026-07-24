import { InputNumber, theme, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { useToken } = theme;

export interface InputRowProps {
  label: string;
  hint?: string;
  suffix?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  onChange: (v: number) => void;
}

export function InputRow({ label, hint, suffix, value, min = 0, max, step = 1, precision = 0, onChange }: InputRowProps) {
  const { token } = useToken();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
        <span style={{ fontSize: 13, color: token.colorTextSecondary }}>{label}</span>
        {hint && (
          <Tooltip title={hint} placement="right">
            <InfoCircleOutlined style={{ fontSize: 11, color: token.colorTextQuaternary, cursor: 'default' }} />
          </Tooltip>
        )}
      </div>
      <InputNumber<number>
        value={value}
        min={min}
        {...(max !== undefined ? { max } : {})}
        step={step}
        precision={precision}
        size="small"
        suffix={suffix}
        style={{ width: 110, flexShrink: 0 }}
        onChange={(v) => { if (v !== null) onChange(v as number); }}
      />
    </div>
  );
}
