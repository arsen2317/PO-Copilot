import { theme, Typography } from 'antd';

const { useToken } = theme;

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { token } = useToken();
  return (
    <Typography.Text
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        color: token.colorTextQuaternary,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 10,
      }}
    >
      {children}
    </Typography.Text>
  );
}
