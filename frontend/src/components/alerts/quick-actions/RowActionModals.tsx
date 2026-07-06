import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  assignInvestigator,
  fetchAlertTimeline,
  generateAIReport,
  getLiveCamera,
  getVideoReplay,
  raiseMaintenanceTicket,
} from "../../../services/api";
import { useAlertsQuickActions } from "../../../context/AlertsQuickActionsContext";
import { useAuth } from "../../../auth/AuthContext";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";

const inputClass =
  "w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none";

export function RowActionModals() {
  const { activeModal, selectedAlertId, closeAction } = useAlertsQuickActions();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [investigator, setInvestigator] = useState("");
  const [ticketTitle, setTicketTitle] = useState("Camera maintenance required");
  const [ticketDesc, setTicketDesc] = useState("");

  const assignMut = useMutation({
    mutationFn: () => assignInvestigator(selectedAlertId!, investigator),
    onSuccess: () => {
      toast("Investigator assigned", "success");
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      closeAction();
    },
    onError: () => toast("Failed to assign investigator", "error"),
  });

  const ticketMut = useMutation({
    mutationFn: () => raiseMaintenanceTicket(selectedAlertId!, ticketTitle, ticketDesc, "High"),
    onSuccess: (data) => {
      toast(`Maintenance ticket ${data.ticket_id} created`, "success");
      closeAction();
    },
    onError: () => toast("Failed to create ticket", "error"),
  });

  const { data: replay } = useQuery({
    queryKey: ["video-replay", selectedAlertId],
    queryFn: () => getVideoReplay(selectedAlertId!),
    enabled: activeModal === "video-replay" && !!selectedAlertId,
  });

  const { data: camera } = useQuery({
    queryKey: ["live-camera", selectedAlertId],
    queryFn: () => getLiveCamera(selectedAlertId!),
    enabled: activeModal === "live-camera" && !!selectedAlertId,
  });

  const { data: aiReport } = useQuery({
    queryKey: ["ai-report", selectedAlertId],
    queryFn: () => generateAIReport(selectedAlertId!),
    enabled: activeModal === "ai-report" && !!selectedAlertId,
  });

  const { data: timeline = [] } = useQuery({
    queryKey: ["alert-timeline", selectedAlertId],
    queryFn: () => fetchAlertTimeline(selectedAlertId!),
    enabled: activeModal === "investigation-timeline" && !!selectedAlertId,
  });

  return (
    <>
      <Modal open={activeModal === "assign"} onClose={closeAction} title="Assign Investigator" size="sm"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeAction}>Cancel</Button><Button onClick={() => assignMut.mutate()} disabled={!investigator || assignMut.isPending}>{assignMut.isPending ? "Assigning..." : "Assign"}</Button></div>}>
        <p className="mb-3 text-xs text-slate-400">Alert: <span className="font-mono text-teal-400">{selectedAlertId}</span></p>
        <input className={inputClass} placeholder="Investigator name" value={investigator} onChange={(e) => setInvestigator(e.target.value)} list="investigators" />
        <datalist id="investigators">
          <option value={user?.username ?? "Admin"} />
          <option value="Officer Sharma" />
          <option value="Inspector Patel" />
          <option value="Analyst Kumar" />
        </datalist>
      </Modal>

      <Modal open={activeModal === "video-replay"} onClose={closeAction} title="Replay Previous 60 Seconds" size="md">
        {replay && (
          <div className="space-y-3">
            <div className="flex aspect-video items-center justify-center rounded-lg border border-slate-700/50 bg-slate-950">
              <div className="text-center">
                <div className="mx-auto mb-2 h-12 w-12 animate-pulse rounded-full bg-teal-500/20" />
                <p className="text-sm text-slate-400">Video replay stream</p>
                <p className="mt-1 font-mono text-[10px] text-slate-500">{replay.stream_url}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <span>Plaza: {replay.plaza}</span>
              <span>Vehicle: {replay.vehicle}</span>
              <span>Duration: {replay.duration_seconds}s</span>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={activeModal === "live-camera"} onClose={closeAction} title="Open Live Camera" size="md">
        {camera && (
          <div className="space-y-3">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-teal-500/30 bg-slate-950">
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE
              </div>
              <p className="text-sm text-slate-400">Camera feed — {camera.plaza}</p>
            </div>
            <p className="font-mono text-[10px] text-slate-500">{camera.stream_url}</p>
            <p className="text-xs text-emerald-400">Status: {camera.status}</p>
          </div>
        )}
      </Modal>

      <Modal open={activeModal === "ai-report"} onClose={closeAction} title="AI Incident Report" size="md">
        {aiReport && (
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
              <p className="text-xs text-slate-500">Report ID: <span className="font-mono text-teal-400">{aiReport.report_id}</span></p>
              <p className="mt-2 text-white">{aiReport.summary}</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-slate-400">Confidence: <span className="font-bold text-teal-400">{(aiReport.confidence * 100).toFixed(0)}%</span></span>
              <span className="text-slate-400">Risk: <span className="font-bold text-amber-400">{aiReport.risk_assessment}</span></span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-400">Recommended Actions</p>
              <ul className="list-inside list-disc space-y-1 text-xs text-slate-300">
                {aiReport.recommended_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={activeModal === "maintenance-ticket"} onClose={closeAction} title="Raise Maintenance Ticket" size="md"
        footer={<div className="flex justify-end gap-2"><Button variant="ghost" onClick={closeAction}>Cancel</Button><Button onClick={() => ticketMut.mutate()} disabled={ticketMut.isPending}>{ticketMut.isPending ? "Creating..." : "Create Ticket"}</Button></div>}>
        <div className="space-y-3">
          <input className={inputClass} value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} placeholder="Ticket title" />
          <textarea className={inputClass} rows={3} value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} placeholder="Describe the maintenance issue..." />
        </div>
      </Modal>

      <Modal open={activeModal === "investigation-timeline"} onClose={closeAction} title="Investigation Timeline" size="md">
        <p className="mb-3 text-xs text-slate-400">Alert: <span className="font-mono text-teal-400">{selectedAlertId}</span></p>
        <div className="space-y-0">
          {timeline.length === 0 && <p className="text-sm text-slate-500">No timeline events yet.</p>}
          {timeline.map((ev, i) => (
            <div key={i} className="relative flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-teal-500" />
                {i < timeline.length - 1 && <div className="mt-1 h-full w-0.5 bg-slate-700" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{ev.action.replace(/_/g, " ")}</p>
                <p className="text-[10px] text-slate-500">{ev.actor ?? "system"} · {new Date(ev.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
