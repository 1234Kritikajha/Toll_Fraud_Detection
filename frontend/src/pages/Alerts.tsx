import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertTriangle, Bell, CheckCircle, Shield } from "lucide-react";
import { useState } from "react";
import { fetchAlerts } from "../services/api";
import { useAlertWebSocket } from "../hooks/useAlertWebSocket";
import { AlertRowActions } from "../components/alerts/AlertRowActions";
import { QuickActionsHost } from "../components/alerts/QuickActionsHost";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { SearchableTable } from "../components/ui/SearchableTable";
import type { AlertRecord } from "../types";

const severityTone = {
  Critical: "red",
  High: "red",
  Medium: "amber",
  Low: "blue",
  Warning: "amber",
  Info: "blue",
} as const;

export function Alerts() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useAlertWebSocket();

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["alerts", severityFilter, statusFilter],
    queryFn: () => fetchAlerts({
      severity: severityFilter || undefined,
      status: statusFilter || undefined,
      limit: 100,
    }),
  });

  if (error) return <div className="text-sm text-red-600">Alerts API is not available.</div>;

  const critical = data.filter((item) => item.severity === "Critical").length;
  const high = data.filter((item) => item.severity === "High").length;
  const acknowledged = data.filter((item) => item.status === "Acknowledged").length;

  const columns = [
    { key: "alert_id", header: "Alert ID", render: (row: AlertRecord) => <span className="font-mono text-teal-400">{row.alert_id ?? "-"}</span> },
    { key: "time", header: "Time", className: "text-slate-500" },
    { key: "type", header: "Type", render: (row: AlertRecord) => <span className="font-medium text-white">{row.type ?? row.title ?? "-"}</span> },
    { key: "vehicle", header: "Vehicle", render: (row: AlertRecord) => <span className="font-semibold">{row.vehicle ?? "-"}</span> },
    { key: "plaza", header: "Plaza", className: "text-slate-500" },
    {
      key: "severity",
      header: "Severity",
      render: (row: AlertRecord) => <Badge tone={severityTone[row.severity] ?? "slate"}>{row.severity}</Badge>,
    },
    { key: "status", header: "Status", className: "text-slate-500" },
    { key: "assigned_to", header: "Assigned To", className: "text-slate-500" },
  ];

  return (
    <>
      <QuickActionsHost />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Total Alerts" value={String(data.length)} icon={Bell} />
          <Metric label="Critical" value={String(critical)} icon={Shield} tone="red" />
          <Metric label="High" value={String(high)} icon={AlertTriangle} tone="amber" />
          <Metric label="Acknowledged" value={String(acknowledged)} icon={CheckCircle} tone="green" />
        </section>

        <Card className="border-slate-700/30 bg-[#0c1525] p-4 dark:bg-[#0c1525]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Alerts Command Center</h2>
              <p className="text-[11px] text-slate-500">Real-time fraud alerts with quick actions · Use sidebar for bulk operations</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-white"
                aria-label="Filter by severity"
              >
                <option value="">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-white"
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Acknowledged">Acknowledged</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="False Positive">False Positive</option>
              </select>
            </div>
          </div>

          <SearchableTable
            data={data as AlertRecord[]}
            columns={columns}
            searchKeys={["alert_id", "type", "vehicle", "plaza", "assigned_to"]}
            searchPlaceholder="Search alerts by ID, type, vehicle, plaza..."
            rowKey={(row) => row.alert_id ?? String(Math.random())}
            selectedKey={selectedId ?? undefined}
            onRowClick={(row) => setSelectedId(row.alert_id ?? null)}
            actions={(row) => <AlertRowActions alert={row} />}
            loading={isLoading}
            emptyMessage="No alerts saved yet. Run detection or import seed data."
          />
        </Card>
      </motion.div>
    </>
  );
}

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Bell; tone?: string }) {
  const colors = { red: "bg-red-500/10 text-red-400", amber: "bg-amber-500/10 text-amber-400", green: "bg-emerald-500/10 text-emerald-400" };
  return (
    <Card className="border-slate-700/30 bg-[#0c1525] p-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors[tone as keyof typeof colors] ?? "bg-teal-500/10 text-teal-400"}`}>
        <Icon size={16} />
      </div>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </Card>
  );
}
