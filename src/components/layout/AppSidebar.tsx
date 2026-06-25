import { useState } from 'react';
import { Button, Flex, Layout, Menu, theme, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  BookOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ItemType, MenuItemType } from 'antd/es/menu/interface';
import SearchModal from './SearchModal';

const { useToken } = theme;

interface AppSidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
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

export default function AppSidebar({ collapsed, onCollapse }: AppSidebarProps) {
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

  const searchButton = collapsed ? (
    <Tooltip title="Поиск" placement="right">
      <Button
        type="text"
        icon={<SearchOutlined />}
        onClick={() => setSearchOpen(true)}
        style={{
          width: '100%',
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: token.colorTextSecondary,
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
        justifyContent: 'flex-start',
        paddingLeft: 16,
        gap: 8,
        color: token.colorTextSecondary,
        fontSize: 14,
        borderRadius: 0,
      }}
    >
      Поиск
    </Button>
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
        }}
      >
        <Flex
          vertical
          style={{
            height: '100%',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          {/* Search button at the very top */}
          <div
            style={{
              borderBottom: `1px solid ${token.colorBorderSecondary}`,
              flexShrink: 0,
            }}
          >
            {searchButton}
          </div>

          {/* Nav menu */}
          <Menu
            mode="inline"
            selectedKeys={selectedKey ? [selectedKey] : []}
            items={NAV_ITEMS}
            style={{ borderRight: 0, flex: 1 }}
            onClick={({ key }) => void navigate(key)}
          />

          {/* Create button */}
          <div
            style={{
              padding: collapsed ? '12px 8px' : '12px 16px',
              borderTop: `1px solid ${token.colorBorderSecondary}`,
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
        </Flex>
      </Layout.Sider>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
