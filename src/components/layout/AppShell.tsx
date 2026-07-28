import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AIPanelSider, { AIPanelFAB } from './AIPanelSider';
import type { AIPanelMode } from './AIPanelSider';
import { useThemeStore } from '../../store/themeStore';

const MOCK_UNREAD_COUNT = 2;

export default function AppShell() {
  const [aiMode, setAiMode] = useState<AIPanelMode>('sidebar');
  const location = useLocation();
  const isDark = useThemeStore((s) => s.isDark);
  const isAssistantPage = location.pathname === '/assistant' || location.pathname.startsWith('/assistant/');

  const outerBg = isDark ? '#000' : '#EFEFF2';
  const cardBg = isDark ? '#121214' : '#FFFFFF';
  const cardBorder = isDark ? '#2D2E30' : '#E3E3E6';

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        background: outerBg,
        padding: '8px 10px',
        overflow: 'hidden',
        boxSizing: 'border-box',
        gap: 0,
      }}
    >
      {/* Left sidebar — transparent */}
      <AppSidebar unreadCount={MOCK_UNREAD_COUNT} />

      {/* Right section: content card + AI panel */}
      <div style={{ flex: 1, display: 'flex', gap: 7, overflow: 'hidden', minWidth: 0 }}>
        {/* Main content card — hidden on assistant page */}
        {!isAssistantPage && (
          <div
            style={{
              flex: 1,
              background: cardBg,
              borderRadius: 12,
              border: `1px solid ${cardBorder}`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <div className="content-scroll" style={{ flex: 1, overflow: 'auto', padding: '24px 24px 0', display: 'flex', flexDirection: 'column' }}>
              <Outlet />
              <div style={{ height: 24, flexShrink: 0 }} />
            </div>
          </div>
        )}

        {/* AI panel — sidebar mode */}
        {aiMode === 'sidebar' && (
          <AIPanelSider
            mode="sidebar"
            onChangeMode={setAiMode}
            expanded={isAssistantPage}
            hideWindowControls={isAssistantPage}
          />
        )}
      </div>

      {/* AI panel — floating mode */}
      {aiMode === 'floating' && (
        <AIPanelSider mode="floating" onChangeMode={setAiMode} />
      )}

      {/* FAB when closed */}
      {aiMode === 'closed' && (
        <AIPanelFAB onClick={() => setAiMode('sidebar')} />
      )}
    </div>
  );
}
