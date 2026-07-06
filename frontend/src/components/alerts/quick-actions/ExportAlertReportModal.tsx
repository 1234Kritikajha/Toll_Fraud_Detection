import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { exportAlerts, fetchAlertsMeta, fetchExportHistory } from "../../../services/api";
import type { ExportFilters } from "../../../types";
import { useAlertsQuickActions } from "../../../context/AlertsQuickActionsContext";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";

const inputClass =
  "w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold text-slate-400";

const FORMATS = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", icon: FileText },
  { id: "json", label: "JSON", icon: FileText },
] as const;

export function ExportAlertReportModal() {
  const { activeModal, closeAction } = useAlertsQuickActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const open = activeModal === "export-report";

  const { data: meta } = useQuery({ queryKey: ["alerts-meta"], queryFn: fetchAlertsMeta, enabled: open });
  const { data: history = [] } = useQuery({ queryKey: ["export-history"], queryFn: fetchExportHistory, enabled: open });

  const [filters, setFilters] = useState<ExportFilters>({});
  const [format, setFormat] = useState<string>("csv");
  const [progress, setProgress] = useState(0);

  const exportMut = useMutation({
    mutationFn: async () => {
      setProgress(10);
      const blob = await exportAlerts(format, filters);
      setProgress(80);
      const ext = format === "excel" ? "xlsx" : format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alerts_export.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      setProgress(100);
      return blob;
    },
    onSuccess: () => {
      toast("Alert report exported successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["export-history"] });
      setTimeout(() => setProgress(0), 1500);
    },
    onError: () => {
      toast("Export failed", "error");
      setProgress(0);
    },
  });

  return (
    <Modal open={open} onClose={closeAction} title="Export Alert Report"
      description="Filter and export alerts with evidence, AI confidence, and investigation data" size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeAction}>Cancel</Button>
          <Button onClick={() => exportMut.mutate()} disabled={exportMut.isPending}>
            {exportMut.isPending ? <><Loader2 size={14} className="animate-spin" /> Exporting...</> : <><Download size={14} /> Export</>}
          </Button>
        </div>
      }>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div><label className={labelClass}>Date From</label><input type="date" className={inputClass} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></div>
        <div><label className={labelClass}>Date To</label><input type="date" className={inputClass} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></div>
        <div><label className={labelClass}>Toll Plaza</label><input className={inputClass} placeholder="Filter by plaza" onChange={(e) => setFilters({ ...filters, toll_plaza: e.target.value })} /></div>
        <div><label className={labelClass}>Lane</label><input className={inputClass} placeholder="e.g. Lane 3" onChange={(e) => setFilters({ ...filters, lane: e.target.value })} /></div>
        <div><label className={labelClass}>Camera</label><input className={inputClass} placeholder="Camera ID" onChange={(e) => setFilters({ ...filters, camera: e.target.value })} /></div>
        <div>
          <label className={labelClass}>Severity</label>
          <select className={inputClass} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
            <option value="">All</option>
            {(meta?.severities ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fraud Category</label>
          <select className={inputClass} onChange={(e) => setFilters({ ...filters, fraud_category: e.target.value })}>
            <option value="">All</option>
            {(meta?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Vehicle Type</label>
          <select className={inputClass} onChange={(e) => setFilters({ ...filters, vehicle_type: e.target.value })}>
            <option value="">All</option>
            {(meta?.vehicle_types ?? []).map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div><label className={labelClass}>Status</label><input className={inputClass} placeholder="e.g. New, Acknowledged" onChange={(e) => setFilters({ ...filters, status: e.target.value })} /></div>
        <div><label className={labelClass}>Investigator</label><input className={inputClass} placeholder="Assigned investigator" onChange={(e) => setFilters({ ...filters, investigator: e.target.value })} /></div>
      </div>

      <div className="mt-5">
        <label className={labelClass}>Export Format</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMATS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFormat(f.id)}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${format === f.id ? "border-teal-500/50 bg-teal-500/10 text-teal-400" : "border-slate-700/40 text-slate-400 hover:border-slate-600"}`}>
              <f.icon size={16} /> {f.label}
            </button>
          ))}
        </div>
      </div>

      {progress > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-400"><span>Export Progress</span><span>{progress}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] text-slate-500">Includes: screenshots, AI confidence, vehicle details, timestamps, evidence links, response time, investigation status</p>

      {history.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-white">Download History</h3>
          <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-700/40">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-700/50 text-left text-slate-500"><th className="px-3 py-2">Job ID</th><th className="px-3 py-2">Format</th><th className="px-3 py-2">Records</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Date</th></tr></thead>
              <tbody>
                {history.map((job) => (
                  <tr key={job.job_id} className="border-b border-slate-800/50 text-slate-400">
                    <td className="px-3 py-1.5 font-mono">{job.job_id.slice(0, 8)}</td>
                    <td className="px-3 py-1.5 uppercase">{job.format}</td>
                    <td className="px-3 py-1.5">{job.record_count}</td>
                    <td className="px-3 py-1.5"><span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-400">{job.status}</span></td>
                    <td className="px-3 py-1.5">{new Date(job.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
