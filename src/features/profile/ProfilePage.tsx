import { theme, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import InDevelopmentPage from '../../components/InDevelopmentPage';

const { useToken } = theme;

// TODO: подставить реальное фото профиля, когда файл будет доступен в репозитории.
const PROFILE = { name: 'Аракелян А.А.', role: 'Product Owner · Дебетовые карты' };

export default function ProfilePage() {
  const { token } = useToken();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #4A82F7 0%, #7B5AF7 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px',
          }}
        >
          АА
        </div>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontSize: 22, color: token.colorText }}>
            {PROFILE.name}
          </Typography.Title>
          <Typography.Text style={{ fontSize: 13, color: token.colorTextTertiary }}>
            {PROFILE.role}
          </Typography.Text>
        </div>
      </div>

      <InDevelopmentPage
        title="Настройки профиля"
        icon={<UserOutlined />}
        description="Вкладки: уведомления, интеграции, персонализация, агенты/сервисы, команды."
      />
    </div>
  );
}
