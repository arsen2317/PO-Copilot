import { useState } from 'react';
import { Avatar, Badge, Button, Dropdown, Flex, Layout, Menu, theme, Tooltip, Typography } from 'antd';
import {
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MessageOutlined,
  PlusOutlined,
  RobotOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';
import SearchModal from './SearchModal';

const { useToken } = theme;

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  unreadCount: number;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
}

const NAV_ITEMS: ItemType<MenuItemType>[] = [
  { key: '/', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: '/assistant', icon: <MessageOutlined />, label: 'Ассистент' },
  { key: '/agents', icon: <BulbOutlined />, label: 'Агенты' },
  { key: '/services', icon: <AppstoreOutlined />, label: 'ИИ-сервисы' },
  { key: '/tasks', icon: <CheckSquareOutlined />, label: 'Задачи' },
  { key: '/rooms', icon: <TeamOutlined />, label: 'Комнаты' },
  { key: '/knowledge', icon: <BookOutlined />, label: 'База знаний' },
];

const userMenuItems: ItemType<MenuItemType>[] = [
  { key: 'profile', icon: <UserOutlined />, label: 'Профиль' },
  { key: 'settings', icon: <SettingOutlined />, label: 'Настройки' },
  { type: 'divider' },
  { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', danger: true },
];

export default function AppSidebar({
  collapsed,
  onCollapse,
  unreadCount,
  aiPanelOpen,
  onToggleAiPanel,
}: AppSidebarProps) {
  const { token } = useToken();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);

  const selectedKey: string =
    NAV_ITEMS.find((item) => {
      const key = item?.key as string | undefined;
      return key && key !== '/' && location.pathname.startsWith(key);
    })?.key as string | undefined
    ?? (location.pathname === '/' ? '/' : '');

  const iconBtn = (icon: React.ReactNode, tooltip: string, onClick: () => void, active = false) =>
    collapsed ? (
      <Tooltip title={tooltip} placement="right" key={tooltip}>
        <Button
          type="text"
          icon={icon}
          onClick={onClick}
          style={{
            color: active ? token.colorPrimary : token.colorTextSecondary,
            width: 40,
            height: 40,
          }}
        />
      </Tooltip>
    ) : (
      <Button
        key={tooltip}
        type="text"
        icon={icon}
        onClick={onClick}
        style={{
          color: active ? token.colorPrimary : token.colorTextSecondary,
          width: 40,
          height: 40,
        }}
      />
    );

  return (
    <>
      <Layout.Sider
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        width={220}
        collapsedWidth={56}
        style={{
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Flex vertical style={{ height: '100%' }}>

          {/* ── Logo ── */}
          <Flex
            align="center"
            justify={collapsed ? 'center' : 'flex-start'}
            style={{
              height: 56,
              padding: collapsed ? 0 : '0 16px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
            }}
          >
            <Typography.Text
              strong
              style={{
                fontSize: collapsed ? 20 : 17,
                color: token.colorPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                letterSpacing: collapsed ? 0 : 0.3,
              }}
            >
              {collapsed ? '⬡' : '⬡ Барометр'}
            </Typography.Text>
          </Flex>

          {/* ── Search ── */}
          <div
            style={{
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
            }}
          >
            {collapsed ? (
              <Tooltip title="Поиск" placement="right">
                <Button
                  type="text"
                  icon={<SearchOutlined />}
                  onClick={() => setSearchOpen(true)}
                  style={{
                    width: '100%',
                    height: 40,
                    color: token.colorTextSecondary,
                    borderRadius: 0,
                  }}
                />
              </Tooltip>
            ) : (
              <Button
                type="text"
                icon={<SearchOutlined />}
                onClick={() => setSearchOpen(true)}
                style={{
                  width: '100%',
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: 16,
                  color: token.colorTextSecondary,
                  fontSize: 13,
                  borderRadius: 0,
                  justifyContent: 'flex-start',
                }}
              >
                Поиск
              </Button>
            )}
          </div>

          {/* ── Create button ── */}
          <div
            style={{
              padding: collapsed ? '10px 8px' : '10px 12px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
            }}
          >
            {collapsed ? (
              <Tooltip title="Создать" placement="right">
                <Button type="primary" icon={<PlusOutlined />} style={{ width: '100%' }} />
              </Tooltip>
            ) : (
              <Button type="primary" icon={<PlusOutlined />} style={{ width: '100%' }}>
                Создать
              </Button>
            )}
          </div>

          {/* ── Nav menu ── */}
          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={NAV_ITEMS}
            style={{ borderRight: 0, flex: 1, overflow: 'auto' }}
            onClick={({ key }) => void navigate(key)}
          />

          {/* ── Bottom bar ── */}
          <Flex
            align="center"
            justify={collapsed ? 'center' : 'space-between'}
            style={{
              padding: collapsed ? '10px 8px' : '10px 8px',
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
              flexWrap: collapsed ? 'wrap' : 'nowrap',
              gap: 4,
            }}
          >
            {/* Left icons */}
            <Flex align="center" gap={0} wrap="wrap">
              {iconBtn(
                <RobotOutlined />,
                'ИИ-помощник',
                onToggleAiPanel,
                aiPanelOpen,
              )}

              <Badge count={unreadCount} size="small" offset={[-4, 4]}>
                {iconBtn(
                  <BellOutlined />,
                  'Уведомления',
                  () => void navigate('/notifications'),
                )}
              </Badge>

              {iconBtn(
                <SettingOutlined />,
                'Настройки',
                () => void navigate('/profile'),
              )}
            </Flex>

            {/* User avatar */}
            {collapsed ? (
              <Tooltip title="Профиль" placement="right">
                <Dropdown menu={{ items: userMenuItems }} placement="topRight">
                  <Avatar
                    size={32}
                    icon={<UserOutlined />}
                    style={{ cursor: 'pointer', background: token.colorPrimary, flexShrink: 0 }}
                  />
                </Dropdown>
              </Tooltip>
            ) : (
              <Dropdown menu={{ items: userMenuItems }} placement="topRight">
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{ cursor: 'pointer', background: token.colorPrimary, flexShrink: 0 }}
                />
              </Dropdown>
            )}
          </Flex>

        </Flex>
      </Layout.Sider>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
