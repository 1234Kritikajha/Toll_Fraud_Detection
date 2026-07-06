import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createAlertRule, fetchAlertsMeta, fetchPlazas } from "../../../services/api";
import type { AlertRule, RuleCondition } from "../../../types";
import { useAlertsQuickActions } from "../../../context/AlertsQuickActionsContext";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";

const ACTION_LABELS: Record<string, string> = {
  send_notification: "Send Notification",
  block_vehicle: "Block Vehicle",
  open_live_camera: "Open Live Camera",
  create_investigation: "Create Investigation Case",
  raise_maintenance_ticket: "Raise Maintenance Ticket",
};

const inputClass =
  "w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30";
const labelClass = "mb-1 block text-xs font-semibold text-slate-400";

export function CreateAlertRuleModal() {
  const { activeModal, closeAction } = useAlertsQuickActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const open = activeModal === "create-rule";

  const { data: meta } = useQuery({ queryKey: ["alerts-meta"], queryFn: fetchAlertsMeta, enabled: open });
  const { data: plazas = [] } = useQuery({ queryKey: ["plazas"], queryFn: fetchPlazas, enabled: open });

  const [form, setForm] = useState<AlertRule>({
    name: "",
    description: "",
    category: "FASTag fraud",
    severity: "High",
    ai_confidence_threshold: 0.75,
    toll_plaza: "",
    lane: "",
    vehicle_types: [],
    active_schedule: { start: "00:00", end: "23:59", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] },
    trigger_conditions: [{ id: "c1", field: "ai_confidence", operator: "<", value: "0.8", logic: "IF" }],
    automated_actions: ["send_notification"],
    is_enabled: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => createAlertRule(form),
    onSuccess: () => {
      toast("Alert rule created successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      closeAction();
    },
    onError: () => toast("Failed to create alert rule", "error"),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim() || form.name.length < 3) e.name = "Name must be at least 3 characters";
    if (!form.category) e.category = "Category is required";
    if (form.trigger_conditions.length === 0) e.conditions = "At least one trigger condition required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addCondition = () => {
    setForm((f) => ({
      ...f,
      trigger_conditions: [
        ...f.trigger_conditions,
        { id: `c${Date.now()}`, field: "severity", operator: "=", value: "High", logic: "AND" },
      ],
    }));
  };

  const updateCondition = (id: string, patch: Partial<RuleCondition>) => {
    setForm((f) => ({
      ...f,
      trigger_conditions: f.trigger_conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCondition = (id: string) => {
    setForm((f) => ({ ...f, trigger_conditions: f.trigger_conditions.filter((c) => c.id !== id) }));
  };

  const selectedPlaza = plazas.find((p) => p.name === form.toll_plaza);
  const lanes = selectedPlaza ? Array.from({ length: selectedPlaza.lanes }, (_, i) => `Lane ${i + 1}`) : [];

  return (
    <Modal
      open={open}
      onClose={closeAction}
      title="Create Alert Rule"
      description="Configure automated detection and response rules"
      size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeAction}>Cancel</Button>
          <Button onClick={() => validate() && mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating..." : "Create Rule"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className={labelClass}>Rule Name *</label>
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. High-Risk FASTag Mismatch" />
          {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
        </div>
        <div>
          <label className={labelClass}>Alert Category</label>
          <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {(meta?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Severity</label>
          <select className={inputClass} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {(meta?.severities ?? ["Low", "Medium", "High", "Critical"]).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>AI Confidence Threshold: {(form.ai_confidence_threshold * 100).toFixed(0)}%</label>
          <input type="range" min={0} max={100} value={form.ai_confidence_threshold * 100}
            onChange={(e) => setForm({ ...form, ai_confidence_threshold: Number(e.target.value) / 100 })}
            className="w-full accent-teal-500" />
        </div>
        <div>
          <label className={labelClass}>Toll Plaza</label>
          <select className={inputClass} value={form.toll_plaza} onChange={(e) => setForm({ ...form, toll_plaza: e.target.value, lane: "" })}>
            <option value="">All Plazas</option>
            {plazas.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass}>Lane</label>
          <select className={inputClass} value={form.lane} onChange={(e) => setForm({ ...form, lane: e.target.value })} disabled={!form.toll_plaza}>
            <option value="">All Lanes</option>
            {lanes.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Vehicle Type Filter</label>
          <div className="flex flex-wrap gap-2">
            {(meta?.vehicle_types ?? []).map((vt) => (
              <button key={vt} type="button"
                onClick={() => setForm((f) => ({
                  ...f,
                  vehicle_types: f.vehicle_types.includes(vt) ? f.vehicle_types.filter((v) => v !== vt) : [...f.vehicle_types, vt],
                }))}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${form.vehicle_types.includes(vt) ? "bg-teal-500/20 text-teal-400 ring-1 ring-teal-500/40" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
                {vt}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Active Schedule</label>
          <div className="flex gap-3">
            <input type="time" className={inputClass} value={form.active_schedule?.start} onChange={(e) => setForm({ ...form, active_schedule: { ...form.active_schedule!, start: e.target.value } })} />
            <input type="time" className={inputClass} value={form.active_schedule?.end} onChange={(e) => setForm({ ...form, active_schedule: { ...form.active_schedule!, end: e.target.value } })} />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Visual Rule Builder</h3>
          <Button variant="outline" size="sm" onClick={addCondition}><Plus size={14} /> Add Condition</Button>
        </div>
        {errors.conditions && <p className="mb-2 text-xs text-red-400">{errors.conditions}</p>}
        <div className="space-y-2">
          {form.trigger_conditions.map((cond, idx) => (
            <motion.div key={cond.id} layout className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
              {idx > 0 && (
                <select className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white" value={cond.logic} onChange={(e) => updateCondition(cond.id, { logic: e.target.value as RuleCondition["logic"] })}>
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              )}
              {idx === 0 && <span className="rounded bg-teal-500/20 px-2 py-1 text-xs font-bold text-teal-400">IF</span>}
              <select className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white" value={cond.field} onChange={(e) => updateCondition(cond.id, { field: e.target.value })}>
                <option value="ai_confidence">AI Confidence</option>
                <option value="severity">Severity</option>
                <option value="vehicle_type">Vehicle Type</option>
                <option value="speed">Speed</option>
                <option value="plate_match">Plate Match</option>
              </select>
              <select className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white" value={cond.operator} onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}>
                <option value="=">=</option>
                <option value="!=">!=</option>
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value="contains">contains</option>
              </select>
              <input className="rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white" value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })} />
              <button onClick={() => removeCondition(cond.id)} className="ml-auto text-slate-500 hover:text-red-400" aria-label="Remove condition"><Trash2 size={14} /></button>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className={labelClass}>Automated Actions</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(meta?.automated_actions ?? []).map((action) => (
            <label key={action} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-sm text-slate-300 hover:border-teal-500/30">
              <input type="checkbox" checked={form.automated_actions.includes(action)}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  automated_actions: e.target.checked ? [...f.automated_actions, action] : f.automated_actions.filter((a) => a !== action),
                }))}
                className="accent-teal-500" />
              {ACTION_LABELS[action] ?? action}
            </label>
          ))}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} className="accent-teal-500" />
        Enable rule immediately
      </label>
    </Modal>
  );
}
