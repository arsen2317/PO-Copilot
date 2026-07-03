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

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TaskComment {
  id: string;
  author: User;
  text: string;
  time: string;
}

export interface TaskCriteria {
  id: string;
  text: string;
  done: boolean;
}

export interface ComplianceCheck {
  id: string;
  label: string;
  passed: boolean;
}

export interface TaskArtifact {
  type: 'pr' | 'figma' | 'confluence' | 'metric';
  title: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: User;
  priority: TaskPriority;
  riskLevel: RiskLevel;
  startDate?: string;
  deadline?: string;
  description?: string;
  sprintId?: string;
  epicId?: string;
  storyPoints?: number;
  labels?: string[];
  criteria?: TaskCriteria[];
  comments?: TaskComment[];
  compliance?: ComplianceCheck[];
  artifacts?: TaskArtifact[];
  relatedMetricIds?: string[];
  dependencies?: string[];
  teamId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Epic {
  id: string;
  name: string;
  color: string;
  teamId: string;
  description?: string;
}

export interface Team {
  id: string;
  name: string;
  productOwner: string;
}

export interface TaskDraft {
  id: string;
  title: string;
  type: 'Story' | 'Bug' | 'Task' | 'Spike';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  storyPoints?: number;
  description?: string;
  epicId?: string;
  labels?: string[];
  criteria: string[];
  complianceNotes?: string;
  createdAt: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  initials: string;
  color: string;
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

export interface FunnelAnalyticsStep {
  id: string;
  name: string;
  eventName: string;
  users: number;
  change: number;
  conversionFromFirst: number;
  history: MetricPoint[];
}

export type CjmStatus = 'draft' | 'active' | 'archived';
export type CjmNodeType = 'stage' | 'touchpoint' | 'emotion' | 'pain' | 'opportunity';

export interface CjmNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  metric?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  channel?: string;
}

export interface CjmFlowNode {
  id: string;
  type: CjmNodeType;
  position: { x: number; y: number };
  data: CjmNodeData;
}

export interface CjmFlowEdge {
  id: string;
  source: string;
  target: string;
}

export interface CjmMap {
  id: string;
  title: string;
  persona: string;
  status: CjmStatus;
  updatedAt: string;
  description: string;
  nodes: CjmFlowNode[];
  edges: CjmFlowEdge[];
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
