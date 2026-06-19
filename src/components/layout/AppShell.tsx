import { useState } from 'react';
import { Layout, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

const { useToken } = theme;

const MOCK_UNREAD_COUNT = 2;

export default function AppShell() {
  const { token } = useToken();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader unreadCount={MOCK_UNREAD_COUNT} />
      <Layout>
        <AppSidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <Layout.Content
          style={{
            padding: 24,
            background: token.colorBgLayout,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
