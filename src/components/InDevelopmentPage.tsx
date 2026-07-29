import { theme, Typography } from 'antd';
import { ToolOutlined } from '@ant-design/icons';
import { appSurfaces, useThemeStore } from '../store/themeStore';

const { useToken } = theme;

interface InDevelopmentPageProps {
  title: string;
  icon?: React.ReactNode | undefined;
  description?: string | undefined;
}

/** Общая заглушка для разделов навигации, которые ещё не реализованы. */
export default function InDevelopmentPage({ title, icon, description }: InDevelopmentPageProps) {
  const { token } = useToken();
  const S = appSurfaces(useThemeStore((s) => s.isDark));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Typography.Title
        level={3}
        style={{ margin: 0, marginBottom: 4, fontSize: 24, color: token.colorText, fontFamily: "'MTS Wide', 'MTS Text', sans-serif" }}
      >
        {title}
      </Typography.Title>
      <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary, marginBottom: 14 }}>
        Раздел находится в разработке
      </Typography.Text>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          borderRadius: 12,
          border: `1px dashed ${token.colorBorderSecondary}`,
          background: S.panel,
        }}
      >
        <div
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: S.inner, border: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: token.colorTextTertiary,
          }}
        >
          {icon ?? <ToolOutlined />}
        </div>
        <div style={{ textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: token.colorText, marginBottom: 6 }}>
            Раздел «{title}» скоро появится
          </div>
          {description && (
            <div style={{ fontSize: 13, color: token.colorTextTertiary, lineHeight: 1.6 }}>
              {description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
