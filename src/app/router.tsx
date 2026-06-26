import { useState } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import DashboardPage from '../features/dashboard/DashboardPage';
import AssistantPage from '../features/assistant/AssistantPage';
import AssistantDialogPage from '../features/assistant/AssistantDialogPage';
import AgentsPage from '../features/agents/AgentsPage';
import AgentBuilderPage from '../features/agents/AgentBuilderPage';
import AgentDetailPage from '../features/agents/AgentDetailPage';
import AIServicesPage from '../features/ai-services/AIServicesPage';
import AIServiceDetailPage from '../features/ai-services/AIServiceDetailPage';
import TasksPage from '../features/tasks/TasksPage';
import TaskDetailPage from '../features/tasks/TaskDetailPage';
import RoomsPage from '../features/rooms/RoomsPage';
import RoomDetailPage from '../features/rooms/RoomDetailPage';
import KnowledgeBasePage from '../features/knowledge-base/KnowledgeBasePage';
import ArtifactDetailPage from '../features/knowledge-base/ArtifactDetailPage';
import NotificationsPage from '../features/notifications/NotificationsPage';
import ProfilePage from '../features/profile/ProfilePage';
import MetricsPage from '../features/metrics/MetricsPage';
import PlaceholderPage from '../features/analytics/PlaceholderPage';
import LoginPage from '../features/auth/LoginPage';
import { isAuthenticated } from '../features/auth/auth';

function AuthGuard() {
  const [authed, setAuthed] = useState(isAuthenticated);
  if (!authed) return <LoginPage onSuccess={() => setAuthed(true)} />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'metrics', element: <MetricsPage /> },
          { path: 'assistant', element: <AssistantPage /> },
          { path: 'assistant/:dialogId', element: <AssistantDialogPage /> },
          { path: 'agents', element: <AgentsPage /> },
          { path: 'agents/builder', element: <AgentBuilderPage /> },
          { path: 'agents/:agentId', element: <AgentDetailPage /> },
          { path: 'services', element: <AIServicesPage /> },
          { path: 'services/:serviceId', element: <AIServiceDetailPage /> },
          { path: 'tasks', element: <TasksPage /> },
          { path: 'tasks/:taskId', element: <TaskDetailPage /> },
          { path: 'rooms', element: <RoomsPage /> },
          { path: 'rooms/:roomId', element: <RoomDetailPage /> },
          { path: 'knowledge', element: <KnowledgeBasePage /> },
          { path: 'knowledge/:artifactId', element: <ArtifactDetailPage /> },
          { path: 'funnel', element: <PlaceholderPage /> },
          { path: 'retention', element: <PlaceholderPage /> },
          { path: 'features', element: <PlaceholderPage /> },
          { path: 'notifications', element: <NotificationsPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
]);
