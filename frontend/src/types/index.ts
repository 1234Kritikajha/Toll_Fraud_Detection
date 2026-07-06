import type { LucideIcon } from "lucide-react";

export type Theme = "light" | "dark";

export type NavItem = {
  title: string;
  path: string;
  icon: LucideIcon;
};

export type Metric = {
  label: string;
  value: string;
  trend?: string;
  detail: string;
  tone?: "blue" | "teal" | "green" | "amber" | "red";
};

export type ChartPoint = {
  name: string;
  revenue?: number;
  fraud?: number;
  uptime?: number;
  detections?: number;
};

export type FraudCategory = {
  name: string;
  value: number;
};

export type TollMarker = {
  name: string;
  state: string;
  position: [number, number];
  risk: number;
  transactions: string;
};

export type CaseRecord = {
  case_id?: string;
  vehicle: string;
  score?: number;
  risk_score?: number;
  risk?: string;
  category?: string;
  type?: string;
  plaza: string;
  updated?: string;
  time?: string;
  status?: string;
  priority?: string;
};

export type AlertRecord = {
  alert_id?: string;
  type?: string;
  vehicle?: string;
  plaza?: string;
  severity: "Critical" | "High" | "Medium" | "Low" | "Warning" | "Info";
  status?: string;
  assigned_to?: string;
  title?: string;
  time: string;
  body?: string;
  lane?: string;
  camera?: string;
  ai_confidence?: number;
  vehicle_type?: string;
  created_at?: string;
};

export type RuleCondition = {
  id: string;
  field: string;
  operator: string;
  value: string;
  logic: "AND" | "OR" | "IF";
};

export type AlertRule = {
  rule_id?: string;
  name: string;
  description?: string;
  category: string;
  severity: string;
  ai_confidence_threshold: number;
  toll_plaza?: string;
  lane?: string;
  vehicle_types: string[];
  active_schedule?: { start: string; end: string; days: string[] };
  trigger_conditions: RuleCondition[];
  automated_actions: string[];
  is_enabled: boolean;
};

export type EscalationLevel = {
  id: string;
  level: number;
  assignee: string;
  department: string;
  phone: string;
  email: string;
  timeout_minutes: number;
  notification_methods: string[];
  retry_count: number;
  require_acknowledgment: boolean;
  auto_escalate: boolean;
};

export type EscalationMatrix = {
  matrix_id?: string;
  name: string;
  description?: string;
  levels: EscalationLevel[];
  is_active: boolean;
};

export type AlertNotificationConfig = {
  channels: Record<string, boolean>;
  events: Record<string, boolean>;
  severity_routing: Record<string, string[]>;
  quiet_hours?: { enabled: boolean; start: string; end: string };
  frequency: string;
  sound: string;
  browser_permission: string;
};

export type ExportFilters = {
  date_from?: string;
  date_to?: string;
  toll_plaza?: string;
  lane?: string;
  camera?: string;
  severity?: string;
  fraud_category?: string;
  vehicle_type?: string;
  status?: string;
  investigator?: string;
};

export type ExportJob = {
  job_id: string;
  format: string;
  status: string;
  progress: number;
  record_count: number;
  created_at: string;
  completed_at?: string;
};

export type AlertTimelineEvent = {
  action: string;
  actor?: string;
  details?: Record<string, unknown>;
  created_at: string;
};

export type AlertsMeta = {
  categories: string[];
  severities: string[];
  notification_channels: string[];
  notification_methods: string[];
  vehicle_types: string[];
  automated_actions: string[];
};

export type DashboardPayload = {
  metrics: Metric[];
  revenueTrend: ChartPoint[];
  fraudCategories: FraudCategory[];
  tollMarkers: TollMarker[];
};

export type SearchSuggestion = {
  type: string;
  label: string;
  value: string;
  subtitle?: string;
  icon: string;
};

export type SearchHistoryItem = {
  query: string;
  createdAt: string;
};

export type SearchResult = {
  type: string;
  title: string;
  subtitle?: string;
  details: Record<string, any>;
};

export type AppNotification = {
  id: number;
  title: string;
  message: string;
  category: string;
  icon?: string | null;
  priority?: string | null;
  status: "unread" | "read";
  action_url?: string | null;
  created_at: string;
  meta?: string | null;
};
