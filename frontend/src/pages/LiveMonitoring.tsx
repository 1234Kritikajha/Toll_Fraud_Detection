import { motion } from "framer-motion";
import { Activity, Camera, ShieldCheck, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "../components/ui/Card";
import { cn } from "../components/ui/utils";

type LiveEvent = {
  time: string;
  tag: string;
  vehicle: string;
  status: string;
  amount: string;
  lane: string;
  plaza?: string;
  color: string;
};

export default function LiveMonitoring() {
  const [logs, setLogs] = useState<LiveEvent[]>([]);
  const [socketState, setSocketState] = useState("Connecting");

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws/live";
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setSocketState("Connected");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as LiveEvent;
        setLogs((prev) => [data, ...prev].slice(0, 30));
      } catch (err) {
        console.error("Failed parsing live socket message:", err);
      }
    };
    ws.onerror = () => setSocketState("Error");
    ws.onclose = () => setSocketState("Disconnected");

    return () => ws.close();
  }, []);

  const successCount = logs.filter((item) => item.status === "Success" || item.status === "Paid").length;
  const alertCount = logs.filter((item) => item.status && item.status !== "Success" && item.status !== "Paid").length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Socket" value={socketState} icon={Activity} />
        <Metric label="Live Events" value={String(logs.length)} icon={Camera} />
        <Metric label="Successful" value={String(successCount)} icon={ShieldCheck} />
        <Metric label="Alerts" value={String(alertCount)} icon={AlertTriangle} />
      </section>

      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold">FASTag / ANPR Detection Log</h3>
          <span className="rounded bg-green-100 px-1 text-[9px] font-bold text-green-700">Database Stream</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-400">
                <th className="pb-2 pr-2 font-semibold">Time</th>
                <th className="pb-2 pr-2 font-semibold">FASTag ID</th>
                <th className="pb-2 pr-2 font-semibold">Vehicle No.</th>
                <th className="pb-2 pr-2 font-semibold">Plaza</th>
                <th className="pb-2 pr-2 font-semibold">Status</th>
                <th className="pb-2 pr-2 font-semibold">Amount</th>
                <th className="pb-2 font-semibold">Lane</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-slate-400">
                    No live transaction records yet. Analyze an image to create a real event.
                  </td>
                </tr>
              )}
              {logs.map((log, idx) => (
                <tr key={`${log.time}-${log.vehicle}-${idx}`} className="border-b border-slate-50">
                  <td className="py-2 pr-2 text-slate-400">{log.time}</td>
                  <td className="py-2 pr-2 font-mono font-semibold">{log.tag || "-"}</td>
                  <td className="py-2 pr-2 font-bold text-slate-700 dark:text-slate-200">{log.vehicle}</td>
                  <td className="py-2 pr-2 text-slate-500">{log.plaza || "-"}</td>
                  <td className="py-2 pr-2">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", log.color)}>{log.status || "-"}</span>
                  </td>
                  <td className="py-2 pr-2 font-bold">{log.amount}</td>
                  <td className="py-2 font-semibold text-slate-500">{log.lane || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) {
  return (
    <Card className="p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
        <Icon size={16} />
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </Card>
  );
}
