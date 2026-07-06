import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Send } from "lucide-react";
import { useState } from "react";
import { fetchAlertNotificationSettings, fetchAlertsMeta, saveAlertNotificationSettings, testAlertNotification } from "../../../services/api";
import type { AlertNotificationConfig } from "../../../types";
import { useAlertsQuickActions } from "../../../context/AlertsQuickActionsContext";
import { Button } from "../../ui/Button";
import { Modal } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";

const inputClass =
  "w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-white focus:border-teal-500/50 focus:outline-none";
const labelClass = "mb-1 block text-xs font-semibold text-slate-400";

const SOUNDS = ["default", "alert-chime", "urgent-bell", "soft-ping", "critical-alarm"];
const FREQUENCIES = ["immediate", "batched-5min", "batched-15min", "hourly-digest"];

export function NotificationSettingsModal() {
  const { activeModal, closeAction } = useAlertsQuickActions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const open = activeModal === "notification-settings";

  const { data: config } = useQuery({
    queryKey: ["alert-notification-settings"],
    queryFn: fetchAlertNotificationSettings,
    enabled: open,
  });
  const { data: meta } = useQuery({ queryKey: ["alerts-meta"], queryFn: fetchAlertsMeta, enabled: open });

  const [form, setForm] = useState<AlertNotificationConfig | null>(null);
  const current = form ?? config;

  const saveMut = useMutation({
    mutationFn: (data: AlertNotificationConfig) => saveAlertNotificationSettings(data),
    onSuccess: () => {
      toast("Notification settings saved", "success");
      queryClient.invalidateQueries({ queryKey: ["alert-notification-settings"] });
    },
    onError: () => toast("Failed to save settings", "error"),
  });

  const testMut = useMutation({
    mutationFn: (channel: string) => testAlertNotification(channel),
    onSuccess: (_, channel) => toast(`Test ${channel} notification sent`, "success"),
    onError: () => toast("Test notification failed", "error"),
  });

  if (!current) return null;

  const toggleChannel = (ch: string) => {
    setForm({ ...current, channels: { ...current.channels, [ch]: !current.channels[ch] } });
  };

  const toggleEvent = (ev: string) => {
    setForm({ ...current, events: { ...current.events, [ev]: !current.events[ev] } });
  };

  return (
    <Modal open={open} onClose={closeAction} title="Notification Settings"
      description="Configure channels, routing, quiet hours, and test notifications" size="xl"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={closeAction}>Cancel</Button>
          <Button onClick={() => saveMut.mutate(current)} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      }>
      <div className="space-y-5">
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-white"><Bell size={16} /> Notification Channels</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(meta?.notification_channels ?? Object.keys(current.channels)).map((ch) => (
              <label key={ch} className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-300">
                <span>{ch}</span>
                <input type="checkbox" checked={!!current.channels[ch]} onChange={() => toggleChannel(ch)} className="accent-teal-500" />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold text-white">Notification Events</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(current.events).map(([ev, enabled]) => (
              <label key={ev} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
                <input type="checkbox" checked={enabled} onChange={() => toggleEvent(ev)} className="accent-teal-500" />
                {ev.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
              </label>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-bold text-white">Severity-Based Routing</h3>
          <div className="space-y-2">
            {Object.entries(current.severity_routing).map(([sev, channels]) => (
              <div key={sev} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/40 bg-slate-900/40 p-3">
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${sev === "Critical" ? "bg-red-500/20 text-red-400" : sev === "High" ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-300"}`}>{sev}</span>
                <span className="text-xs text-slate-400">→</span>
                {channels.map((ch) => (
                  <span key={ch} className="rounded bg-teal-500/10 px-2 py-0.5 text-[10px] text-teal-400">{ch}</span>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Quiet Hours</label>
            <label className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={current.quiet_hours?.enabled}
                onChange={(e) => setForm({ ...current, quiet_hours: { ...current.quiet_hours!, enabled: e.target.checked } })}
                className="accent-teal-500" /> Enable quiet hours
            </label>
            <div className="flex gap-2">
              <input type="time" className={inputClass} value={current.quiet_hours?.start ?? "22:00"}
                onChange={(e) => setForm({ ...current, quiet_hours: { ...current.quiet_hours!, start: e.target.value } })} />
              <input type="time" className={inputClass} value={current.quiet_hours?.end ?? "06:00"}
                onChange={(e) => setForm({ ...current, quiet_hours: { ...current.quiet_hours!, end: e.target.value } })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notification Frequency</label>
            <select className={inputClass} value={current.frequency} onChange={(e) => setForm({ ...current, frequency: e.target.value })}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sound Selection</label>
            <select className={inputClass} value={current.sound} onChange={(e) => setForm({ ...current, sound: e.target.value })}>
              {SOUNDS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Browser Permission</label>
            <select className={inputClass} value={current.browser_permission} onChange={(e) => setForm({ ...current, browser_permission: e.target.value })}>
              <option value="granted">Granted</option>
              <option value="default">Default</option>
              <option value="denied">Denied</option>
            </select>
          </div>
        </div>

        <section>
          <h3 className="mb-3 text-sm font-bold text-white">Test Notifications</h3>
          <div className="flex flex-wrap gap-2">
            {(meta?.notification_channels ?? []).filter((ch) => current.channels[ch]).map((ch) => (
              <Button key={ch} variant="outline" size="sm" onClick={() => testMut.mutate(ch)} disabled={testMut.isPending}>
                <Send size={12} /> Test {ch}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
