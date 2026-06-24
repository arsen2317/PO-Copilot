import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';

const MOCK_UNREAD_COUNT = 2;

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppHeader unreadCount={MOCK_UNREAD_COUNT} />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar collapsed={collapsed} onCollapse={setCollapsed} />
        <main className="flex-1 overflow-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
