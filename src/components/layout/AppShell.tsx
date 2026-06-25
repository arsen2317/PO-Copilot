import { useState } from 'react';
import { Layout, theme } from 'antd';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AIPanelSider, { AIPanelFAB } from './AIPanelSider';
import type { AIPanelMode } from './AIPanelSider';

const { useToken } = theme;

const MOCK_UNREAD_COUNT = 2;

export default function AppShell() {
  const { token } = useToken();
  const [collapsed, setCollapsed] = useState(false);
  const [aiMode, setAiMode] = useState<AIPanelMode>('sidebar');

  return (
    <Layout
      style={{
        minHeight: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: token.colorBgLayout,
      }}
    >
      {/* Left sidebar — transparent, same bg as layout */}
      <AppSidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        unreadCount={MOCK_UNREAD_COUNT}
      />

      {/* Card wrapper: content + sidebar AI panel */}
      <div
        style={{
          flex: 1,
          padding: '10px 10px 10px 0',
          display: 'flex',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            background: token.colorBgContainer,
            borderRadius: 10,
            border: `1px solid ${token.colorBorderSecondary}`,
            minWidth: 0,
          }}
        >
          {/* Main content */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 24,
              minWidth: 0,
            }}
          >
            <Outlet />
          </div>

          {/* AI panel (sidebar mode) */}
          {aiMode === 'sidebar' && (
            <AIPanelSider mode="sidebar" onChangeMode={setAiMode} />
          )}
        </div>
      </div>

      {/* AI panel (floating mode) */}
      {aiMode === 'floating' && (
        <AIPanelSider mode="floating" onChangeMode={setAiMode} />
      )}

      {/* FAB when panel is closed */}
      {aiMode === 'closed' && (
        <AIPanelFAB onClick={() => setAiMode('sidebar')} />
      )}
    </Layout>
  );
}
