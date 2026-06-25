import { useState } from 'react';
import { Layout, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AIPanelSider from './AIPanelSider';

const { useToken } = theme;

const MOCK_UNREAD_COUNT = 2;

export default function AppShell() {
  const { token } = useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);

  return (
    <Layout style={{ minHeight: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      <AppSidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        unreadCount={MOCK_UNREAD_COUNT}
        aiPanelOpen={aiPanelOpen}
        onToggleAiPanel={() => setAiPanelOpen((v) => !v)}
      />
      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Layout.Content
          style={{
            padding: 24,
            background: token.colorBgLayout,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Layout.Content>
        <AIPanelSider open={aiPanelOpen} onClose={() => setAiPanelOpen(false)} />
      </Layout>
    </Layout>
  );
}
