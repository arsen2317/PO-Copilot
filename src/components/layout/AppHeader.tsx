import { Avatar, Badge, Button, Dropdown, Layout, Space, theme, Typography } from 'antd';
import {
  BellOutlined,
  LogoutOutlined,
  RobotOutlined,
  SettingOutlined,
  UserOutlined,
} from '../icons';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';

const { useToken } = theme;

interface AppHeaderProps {
  unreadCount: number;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
}

const userMenuItems: ItemType<MenuItemType>[] = [
  {
    key: 'profile',
    icon: <UserOutlined />,
    label: 'Профиль',
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Настройки',
  },
  { type: 'divider' },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Выйти',
    danger: true,
  },
];

export default function AppHeader({ unreadCount, aiPanelOpen, onToggleAiPanel }: AppHeaderProps) {
  const { token } = useToken();

  return (
    <Layout.Header
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        background: token.colorBgContainer,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        gap: 16,
      }}
    >
      <Typography.Text
        strong
        style={{ fontSize: 18, color: token.colorPrimary, whiteSpace: 'nowrap', minWidth: 120 }}
      >
        ⬡ Барометр
      </Typography.Text>

      <Space size={12} style={{ marginLeft: 'auto' }}>
        <Badge count={unreadCount} size="small">
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            aria-label="Уведомления"
          />
        </Badge>

        <Button
          type={aiPanelOpen ? 'primary' : 'default'}
          icon={<RobotOutlined />}
          onClick={onToggleAiPanel}
          size="small"
          style={{ fontSize: 13 }}
        >
          ИИ-помощник
        </Button>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Avatar
            style={{ cursor: 'pointer', backgroundColor: token.colorPrimary }}
            icon={<UserOutlined />}
          />
        </Dropdown>
      </Space>
    </Layout.Header>
  );
}
