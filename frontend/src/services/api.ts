import axios from "axios";
import type {
  AlertRecord,
  AlertRule,
  AlertsMeta,
  AlertNotificationConfig,
  AlertTimelineEvent,
  CaseRecord,
  DashboardPayload,
  EscalationMatrix,
  ExportFilters,
  ExportJob,
  SearchHistoryItem,
  SearchResult,
  SearchSuggestion,
  TollMarker,
} from "../types";
import type { AppNotification } from "../types";

import { getAccessToken } from "./authToken";

export type ReportSummary = {
  total_transactions: number;
  total_revenue: number;
  success_count: number;
  failed_count: number;
  top_plaza: string;
  top_plaza_count: number;
  recent_transactions: Array<{ plate: string; status: string; plaza: string; amount: number; detected_at: string }>;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 8000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    // Backend expects: Authorization: Bearer <jwt>
    (config.headers as any).Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  }
  return config;
});


export const fetchDashboard = () =>
  api.get<DashboardPayload>("/dashboard").then((res) => res.data);

export const fetchFraud = () =>
  Promise.all([api.get<DashboardPayload>("/dashboard"), api.get<CaseRecord[]>("/cases")]).then(
    ([dashboard, cases]) => ({
      categories: dashboard.data.fraudCategories,
      cases: cases.data,
      hourlyDetections: dashboard.data.revenueTrend.map((point) => ({
        name: point.name,
        detections: point.fraud ?? 0,
      })),
    }),
  );

export const fetchMapMarkers = () =>
  api.get<TollMarker[]>("/map/markers").then((res) => res.data);

export const fetchSystemHealth = () =>
  api.get("/system/health").then((res) => res.data);

export const fetchAlerts = (params?: { severity?: string; status?: string; limit?: number }) =>
  api.get<AlertRecord[]>("/alerts", { params }).then((res) => res.data);

// ── Alert Quick Actions ─────────────────────────────────────────────────────

export const fetchAlertsMeta = () =>
  api.get<AlertsMeta>("/alerts/meta").then((res) => res.data);

export const fetchPlazas = () =>
  api.get<{ name: string; lanes: number }[]>("/alerts/plazas").then((res) => res.data);

export const fetchAlertRules = () =>
  api.get<AlertRule[]>("/alerts/rules").then((res) => res.data);

export const createAlertRule = (rule: AlertRule) =>
  api.post("/alerts/rules", rule).then((res) => res.data);

export const updateAlertRule = (ruleId: string, rule: AlertRule) =>
  api.put(`/alerts/rules/${ruleId}`, rule).then((res) => res.data);

export const toggleAlertRule = (ruleId: string) =>
  api.patch(`/alerts/rules/${ruleId}/toggle`).then((res) => res.data);

export const deleteAlertRule = (ruleId: string) =>
  api.delete(`/alerts/rules/${ruleId}`).then((res) => res.data);

export const fetchEscalationMatrix = () =>
  api.get<EscalationMatrix>("/alerts/escalation").then((res) => res.data);

export const saveEscalationMatrix = (matrix: EscalationMatrix) =>
  api.put("/alerts/escalation", matrix).then((res) => res.data);

export const testEscalationWorkflow = () =>
  api.post<{ timeline: Array<Record<string, unknown>> }>("/alerts/escalation/test").then((res) => res.data);

export const fetchAlertNotificationSettings = () =>
  api.get<AlertNotificationConfig>("/alerts/notification-settings").then((res) => res.data);

export const saveAlertNotificationSettings = (config: AlertNotificationConfig) =>
  api.put("/alerts/notification-settings", config).then((res) => res.data);

export const testAlertNotification = (channel: string) =>
  api.post("/alerts/notification-settings/test", null, { params: { channel } }).then((res) => res.data);

export const exportAlerts = (format: string, filters: ExportFilters) =>
  api.post("/alerts/export", filters, { params: { format }, responseType: "blob" }).then((res) => res.data);

export const fetchExportHistory = () =>
  api.get<ExportJob[]>("/alerts/export/history").then((res) => res.data);

export const acknowledgeAlert = (alertId: string) =>
  api.patch(`/alerts/${alertId}/acknowledge`).then((res) => res.data);

export const assignInvestigator = (alertId: string, investigator: string) =>
  api.patch(`/alerts/${alertId}/assign`, { investigator }).then((res) => res.data);

export const markFalsePositive = (alertId: string) =>
  api.patch(`/alerts/${alertId}/false-positive`).then((res) => res.data);

export const blockVehicle = (alertId: string, reason?: string) =>
  api.post(`/alerts/${alertId}/block-vehicle`, { reason }).then((res) => res.data);

export const getVideoReplay = (alertId: string) =>
  api.get(`/alerts/${alertId}/video-replay`).then((res) => res.data);

export const getLiveCamera = (alertId: string) =>
  api.get(`/alerts/${alertId}/live-camera`).then((res) => res.data);

export const generateAIReport = (alertId: string) =>
  api.post(`/alerts/${alertId}/ai-report`).then((res) => res.data);

export const raiseMaintenanceTicket = (alertId: string, title: string, description: string, priority?: string) =>
  api.post(`/alerts/${alertId}/maintenance-ticket`, { title, description, priority }).then((res) => res.data);

export const createInvestigation = (alertId: string) =>
  api.post(`/alerts/${alertId}/investigation`).then((res) => res.data);

export const fetchAlertTimeline = (alertId: string) =>
  api.get<AlertTimelineEvent[]>(`/alerts/${alertId}/timeline`).then((res) => res.data);

export const exportReportExcel = () =>
  api.get("/reports/export", { params: { format: "excel" }, responseType: "blob" }).then((res) => res.data);

export const generateDailyFraudPDF = () =>
  api.get("/reports/daily-fraud", { responseType: "blob" }).then((res) => res.data);

export const generateExecutiveSummaryPDF = () =>
  api.get("/reports/summary", { responseType: "blob" }).then((res) => res.data);

export const fetchReportSummary = () =>
  api.get<ReportSummary>("/reports/summary-data").then((res) => res.data);

export const fetchSearchSuggestions = (q: string) =>
  api.get<SearchSuggestion[]>("/search/suggestions", { params: { q } }).then((res) => res.data);

export const fetchSearchResults = (q: string, start = 0, limit = 25) =>
  api
    .get<{ query: string; type: string; total: number; results: SearchResult[] }>("/search", {
      params: { q, start, limit },
    })
    .then((res) => res.data);

export const fetchSearchHistory = () =>
  api.get<SearchHistoryItem[]>("/search/history").then((res) => res.data);

export const saveSearchHistory = (query: string) =>
  api.post("/search/history", { query }).then((res) => res.data);

export const fetchNotifications = (limit = 50, offset = 0) =>
  api.get<AppNotification[]>("/notifications", { params: { limit, offset } }).then((res) => res.data);

export const fetchUnreadNotificationsCount = () =>
  api.get<{ unread: number }>("/notifications/unread_count").then((res) => res.data);

export const markNotificationRead = (id: number) => api.put(`/notifications/${id}/read`).then((res) => res.data);

export const markAllNotificationsRead = () => api.put(`/notifications/mark_all_read`).then((res) => res.data);

export const deleteNotification = (id: number) => api.delete(`/notifications/${id}`).then((res) => res.data);

export const clearAllNotifications = () => api.delete(`/notifications/clear_all`).then((res) => res.data);

export const fetchCases = () =>
  api.get<CaseRecord[]>("/cases").then((res) => res.data);

export const fetchVehicle = (plate: string) =>
  api.get(`/vehicle/${encodeURIComponent(plate)}`).then((res) => res.data);

export const fetchVehicleHistory = (plate: string) =>
  api.get(`/vehicle/${encodeURIComponent(plate)}/history`).then((res) => res.data);

export const uploadAndDetectPlate = (
  file: File,
  fastagId?: string,
  plaza?: string,
  lane?: string,
) => {
  const formData = new FormData();
  formData.append("file", file);
  if (fastagId) formData.append("fastag_id", fastagId);
  if (plaza) formData.append("plaza", plaza);
  if (lane) formData.append("lane", lane);

  return api.post("/detect", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }).then((res) => res.data);
};
