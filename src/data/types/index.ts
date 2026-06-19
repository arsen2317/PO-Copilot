export type RiskLevel = 'critical' | 'warning' | 'ok';

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done';

export interface User {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: User;
  priority: 'critical' | 'high' | 'medium' | 'low';
  riskLevel: RiskLevel;
  deadline?: string;
  description?: string;
}

export type AgentCategory =
  | 'monitoring'
  | 'analytics'
  | 'automation'
  | 'compliance';

export interface Agent {
  id: string;
  name: string;
  category: AgentCategory;
  description: string;
  isActive: boolean;
  lastFired?: string;
  eventCount24h: number;
}

export type NotificationType =
  | 'incident'
  | 'agent'
  | 'mention'
  | 'service-result';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  time: string;
  isRead: boolean;
}

export interface AIService {
  id: string;
  name: string;
  category: string;
  description: string;
  usefulnessScore: number;
  hasCorpSubscription: boolean;
  url: string;
}
