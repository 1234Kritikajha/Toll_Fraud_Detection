import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ban, CheckCircle, ClipboardList, Eye, FileText, MoreHorizontal,
  Play, UserPlus, Video, Wrench, XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  acknowledgeAlert,
  blockVehicle,
  createInvestigation,
  markFalsePositive,
} from "../../services/api";
import type { AlertRecord } from "../../types";
import { useAlertsQuickActions } from "../../context/AlertsQuickActionsContext";
import { useAuth } from "../../auth/AuthContext";
import { useToast } from "../ui/Toast";

type Props = { alert: AlertRecord };

export function AlertRowActions({ alert }: Props) {
  const [open, setOpen] = useState(false);
  const { openAction } = useAlertsQuickActions();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const alertId = alert.alert_id!;

  const isAdmin = user?.is_super_admin;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["alerts"] });

  const ackMut = useMutation({
    mutationFn: () => acknowledgeAlert(alertId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["alerts"] });
      const prev = queryClient.getQueryData<AlertRecord[]>(["alerts"]);
      queryClient.setQueryData<AlertRecord[]>(["alerts"], (old) =>
        old?.map((a) => (a.alert_id === alertId ? { ...a, status: "Acknowledged" } : a)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["alerts"], ctx.prev);
      toast("Failed to acknowledge alert", "error");
    },
    onSuccess: () => toast("Alert acknowledged", "success"),
    onSettled: invalidate,
  });

  const fpMut = useMutation({
    mutationFn: () => markFalsePositive(alertId),
    onSuccess: () => { toast("Marked as false positive", "success"); invalidate(); },
    onError: () => toast("Failed to update alert", "error"),
  });

  const blockMut = useMutation({
    mutationFn: () => blockVehicle(alertId),
    onSuccess: () => { toast(`Vehicle ${alert.vehicle} blocked`, "success"); invalidate(); },
    onError: () => toast("Failed to block vehicle", "error"),
  });

  const invMut = useMutation({
    mutationFn: () => createInvestigation(alertId),
    onSuccess: (data: { case_id: string }) => { toast(`Investigation ${data.case_id} created`, "success"); invalidate(); },
    onError: () => toast("Failed to create investigation", "error"),
  });

  const actions = [
    { id: "acknowledge" as const, label: "Acknowledge Alert", icon: CheckCircle, handler: () => ackMut.mutate(), show: alert.status !== "Acknowledged" },
    { id: "assign" as const, label: "Assign Investigator", icon: UserPlus, handler: () => openAction("assign", alertId), show: true },
    { id: "false-positive" as const, label: "Mark False Positive", icon: XCircle, handler: () => fpMut.mutate(), show: true },
    { id: "block-vehicle" as const, label: "Block Vehicle", icon: Ban, handler: () => blockMut.mutate(), show: !!alert.vehicle && isAdmin !== false },
    { id: "video-replay" as const, label: "Replay 60s Video", icon: Play, handler: () => openAction("video-replay", alertId), show: true },
    { id: "live-camera" as const, label: "Open Live Camera", icon: Video, handler: () => openAction("live-camera", alertId), show: true },
    { id: "ai-report" as const, label: "Generate AI Report", icon: FileText, handler: () => openAction("ai-report", alertId), show: true },
    { id: "maintenance-ticket" as const, label: "Raise Maintenance Ticket", icon: Wrench, handler: () => openAction("maintenance-ticket", alertId), show: true },
    { id: "create-investigation" as const, label: "Create Investigation", icon: ClipboardList, handler: () => invMut.mutate(), show: true },
    { id: "investigation-timeline" as const, label: "View Timeline", icon: Eye, handler: () => openAction("investigation-timeline", alertId), show: true },
  ].filter((a) => a.show);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
        aria-label="Alert actions"
        aria-expanded={open}
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-slate-700/50 bg-[#0f1a2e] py-1 shadow-xl">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => { action.handler(); setOpen(false); }}
                disabled={ackMut.isPending && action.id === "acknowledge"}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-slate-300 hover:bg-slate-800/60 hover:text-white disabled:opacity-50"
              >
                <action.icon size={12} className="shrink-0 text-slate-500" />
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
