import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { fetchAlertsMeta, fetchEscalationMatrix, saveEscalationMatrix, testEscalationWorkflow } from "../../../services/api";
import type { EscalationLevel, EscalationMatrix } from "../../../types";
import { useAlertsQuickActions } from "../../../context/AlertsQuickActionsContext";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";

const inputClass =
  "w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold text-slate-400";

function LevelCard({ level, onChange, onRemove }: {
  level: EscalationLevel;
  onChange: (patch: Partial<EscalationLevel>) => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const { data: meta } = useQuery({ queryKey: ["alerts-meta"], queryFn: fetchAlertsMeta });

  return (
    <Reorder.Item value={level} dragListener={false} dragControls={controls}
      className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <button onPointerDown={(e) => controls.start(e)} className="cursor-grab text-slate-500 hover:text-slate-300" aria-label="Drag to reorder">
          <GripVertical size={16} />
        </button>
        <span className="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-bold text-teal-400">Level {level.level}</span>
        <button onClick={onRemove} className="ml-auto text-slate-500 hover:text-red-400" aria-label="Remove level"><Trash2 size={14} /></button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={labelClass}>Assignee</label><input className={inputClass} value={level.assignee} onChange={(e) => onChange({ assignee: e.target.value })} /></div>
        <div><label className={labelClass}>Department</label><input className={inputClass} value={level.department} onChange={(e) => onChange({ department: e.target.value })} /></div>
        <div><label className={labelClass}>Phone</label><input className={inputClass} value={level.phone} onChange={(e) => onChange({ phone: e.target.value })} /></div>
        <div><label className={labelClass}>Email</label><input className={inputClass} value={level.email} onChange={(e) => onChange({ email: e.target.value })} /></div>
        <div><label className={labelClass}>Timeout (minutes)</label><input type="number" className={inputClass} value={level.timeout_minutes} onChange={(e) => onChange({ timeout_minutes: Number(e.target.value) })} /></div>
        <div><label className={labelClass}>Retry Count</label><input type="number" className={inputClass} value={level.retry_count} onChange={(e) => onChange({ retry_count: Number(e.target.value) })} /></div>
      </div>
      <div className="mt-3">
        <label className={labelClass}>Notification Methods</label>
        <div className="flex flex-wrap gap-2">
          {(meta?.notification_methods ?? []).map((m) => (
            <button key={m} type="button"
              onClick={() => onChange({
                notification_methods: level.notification_methods.includes(m)
                  ? level.notification_methods.filter((x) => x !== m)
                  : [...level.notification_methods, m],
              })}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${level.notification_methods.includes(m) ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/40" : "bg-slate-800 text-slate-400"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-slate-400">
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={level.require_acknowledgment} onChange={(e) => onChange({ require_acknowledgment: e.target.checked })} className="accent-teal-500" /> Require Acknowledgment</label>
        <label className="flex items-center gap-1.5"><input type="checkbox" checked={level.auto_escalate} onChange={(e) => onChange({ auto_escalate: e.target.checked })} className="accent-teal-500" /> Auto-escalate if no response</label>
      </div>
    </Reorder.Item>
  );
}

export function EscalationMatrixModal() {
  const { activeModal, closeAction } = useAlertsQuickActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const open = activeModal === "escalation-matrix";

  const { data: matrix, isLoading } = useQuery({
    queryKey: ["escalation-matrix"],
    queryFn: fetchEscalationMatrix,
    enabled: open,
  });

  const [form, setForm] = useState<EscalationMatrix | null>(null);
  const [testTimeline, setTestTimeline] = useState<Array<Record<string, unknown>> | null>(null);

  const current = form ?? matrix;

  const saveMut = useMutation({
    mutationFn: (data: EscalationMatrix) => saveEscalationMatrix(data),
    onSuccess: () => {
      toast("Escalation matrix saved", "success");
      queryClient.invalidateQueries({ queryKey: ["escalation-matrix"] });
    },
    onError: () => toast("Failed to save escalation matrix", "error"),
  });

  const testMut = useMutation({
    mutationFn: testEscalationWorkflow,
    onSuccess: (data) => {
      setTestTimeline(data.timeline);
      toast("Escalation workflow test completed", "success");
    },
    onError: () => toast("Test failed", "error"),
  });

  const updateLevel = (id: string, patch: Partial<EscalationLevel>) => {
    if (!current) return;
    setForm({
      ...current,
      levels: current.levels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const addLevel = () => {
    if (!current) return;
    const next = current.levels.length + 1;
    setForm({
      ...current,
      levels: [...current.levels, {
        id: `lvl-${Date.now()}`, level: next, assignee: "", department: "",
        phone: "", email: "", timeout_minutes: 15, notification_methods: ["Email"],
        retry_count: 2, require_acknowledgment: true, auto_escalate: true,
      }],
    });
  };

  if (!current && isLoading) return null;

  return (
    <Modal open={open} onClose={closeAction} title="Alert Escalation Matrix"
      description="Drag-and-drop workflow to configure escalation levels" size="xl"
      footer={
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
            <Play size={14} /> {testMut.isPending ? "Testing..." : "Test Workflow"}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={closeAction}>Cancel</Button>
            <Button onClick={() => current && saveMut.mutate(current)} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Saving..." : "Save Matrix"}
            </Button>
          </div>
        </div>
      }>
      {current && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <div><label className={labelClass}>Workflow Name</label><input className={inputClass} value={current.name} onChange={(e) => setForm({ ...current, name: e.target.value })} /></div>
            <div><label className={labelClass}>Description</label><input className={inputClass} value={current.description ?? ""} onChange={(e) => setForm({ ...current, description: e.target.value })} /></div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Escalation Levels</h3>
            <Button variant="outline" size="sm" onClick={addLevel}><Plus size={14} /> Add Level</Button>
          </div>

          <Reorder.Group axis="y" values={current.levels} onReorder={(levels) => setForm({ ...current, levels: levels.map((l, i) => ({ ...l, level: i + 1 })) })} className="space-y-3">
            {current.levels.map((lvl) => (
              <LevelCard key={lvl.id} level={lvl}
                onChange={(patch) => updateLevel(lvl.id, patch)}
                onRemove={() => setForm({ ...current, levels: current.levels.filter((l) => l.id !== lvl.id).map((l, i) => ({ ...l, level: i + 1 })) })} />
            ))}
          </Reorder.Group>

          {testTimeline && (
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-bold text-white">Escalation Timeline (Test)</h3>
              <div className="relative space-y-0">
                {testTimeline.map((step, i) => (
                  <div key={i} className="relative flex gap-3 pb-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-400">{step.level as number}</div>
                      {i < testTimeline.length - 1 && <div className="mt-1 h-full w-0.5 bg-slate-700" />}
                    </div>
                    <div className="flex-1 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
                      <p className="text-sm font-semibold text-white">{step.assignee as string} — {step.department as string}</p>
                      <p className="text-xs text-slate-400">Timeout: {step.timeout_minutes as number}min · Methods: {(step.methods as string[])?.join(", ")}</p>
                      <p className="mt-1 text-xs text-teal-400/80">{step.message as string}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
