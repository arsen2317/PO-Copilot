export type RiskLevel = 'critical' | 'warning' | 'ok';

export interface Product {
  id: string;
  name: string;
  team: string;
}

export interface FunnelStep {
  id: string;
  name: string;
  value: number;
  percent: number;
  riskLevel: RiskLevel;
}

export interface NpsPoint {
  date: string;
  nps: number;
  tickets: number;
}

export interface SprintMetric {
  sprintName: string;
  totalPoints: number;
  completedPoints: number;
  daysTotal: number;
  daysElapsed: number;
  forecastDate: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning';
  time: string;
}

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
  systemPrompt?: string;
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

export type DialogType = 'personal' | 'group' | 'task';
export type MessageRole = 'user' | 'assistant';

export interface DialogParticipant {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface DialogContext {
  productName: string;
  sprintName?: string;
  taskId?: string;
  taskTitle?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  time: string;
}

export interface Dialog {
  id: string;
  title: string;
  type: DialogType;
  lastMessage: string;
  time: string;
  unread: number;
  context: DialogContext;
  participants: DialogParticipant[];
  messages: Message[];
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

export interface MetricPoint {
  date: string;
  value: number;
}

export interface MetricRow {
  id: string;
  name: string;
  currentQuarter: number;
  plan: number;
  fulfillment: number;
  lastQuarter: number;
  unit: string;
}

export interface MetricGroup {
  id: string;
  name: string;
  metrics: MetricRow[];
}

export interface MetricGroupDef {
  id: string;
  name: string;
  color: string;
}

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  groupId: string;
  unit: string;
  lowerIsBetter: boolean;
  currentValue: number;
  planValue: number;
  lastPeriodValue: number;
  format: 'number' | 'percent' | 'currency' | 'duration_h' | 'duration_ms' | 'duration_d' | 'per_1000' | 'rate';
  owner: string;
  updatedAt: string;
  onDashboard: boolean;
  history: MetricPoint[];
}
