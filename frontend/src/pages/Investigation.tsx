import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CheckCircle, Clock, FileText, FolderOpen, ShieldAlert } from "lucide-react";
import { fetchCases } from "../services/api";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";

const priorityTone = {
  High: "red",
  Medium: "amber",
  Low: "blue",
  New: "blue",
} as const;

export function Investigation() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["cases"], queryFn: fetchCases });

  if (isLoading) return <div className="text-sm text-slate-500">Loading investigation cases...</div>;
  if (error) return <div className="text-sm text-red-600">Cases API is not available.</div>;

  const high = data.filter((item) => item.priority === "High").length;
  const closed = data.filter((item) => item.status === "Closed").length;
  const underReview = data.filter((item) => item.status && item.status !== "Closed" && item.status !== "New").length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Total Cases" value={String(data.length)} icon={FolderOpen} />
        <Metric label="Under Review" value={String(underReview)} icon={Clock} />
        <Metric label="High Priority" value={String(high)} icon={ShieldAlert} />
        <Metric label="Closed" value={String(closed)} icon={CheckCircle} />
      </section>

      <Card className="p-3">
        <h2 className="mb-3 text-sm font-bold">Investigation Cases From Your Database</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-400">
                <th className="pb-2 pr-2 font-semibold">Case ID</th>
                <th className="pb-2 pr-2 font-semibold">Time</th>
                <th className="pb-2 pr-2 font-semibold">Vehicle</th>
                <th className="pb-2 pr-2 font-semibold">Type</th>
                <th className="pb-2 pr-2 font-semibold">Plaza</th>
                <th className="pb-2 pr-2 font-semibold">Risk</th>
                <th className="pb-2 pr-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">Priority</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                    No cases saved yet. Cases are created when a detection has medium or high risk.
                  </td>
                </tr>
              )}
              {data.map((row) => (
                <tr key={row.case_id ?? row.vehicle} className="border-b border-slate-50">
                  <td className="py-2.5 pr-2 font-mono font-semibold text-blue-600">{row.case_id ?? "-"}</td>
                  <td className="py-2.5 pr-2 text-slate-500">{row.time ?? "-"}</td>
                  <td className="py-2.5 pr-2 font-bold">{row.vehicle}</td>
                  <td className="py-2.5 pr-2">{row.type ?? row.category ?? "-"}</td>
                  <td className="py-2.5 pr-2 text-slate-500">{row.plaza || "-"}</td>
                  <td className="py-2.5 pr-2 font-bold text-orange-600">{row.risk ?? row.risk_score ?? "0%"}</td>
                  <td className="py-2.5 pr-2 text-slate-500">{row.status ?? "-"}</td>
                  <td className="py-2.5">
                    <Badge tone={priorityTone[row.priority as keyof typeof priorityTone] ?? "slate"}>{row.priority ?? "-"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4 text-sm text-slate-400">
        <FileText className="mb-2" size={18} />
        Evidence files are stored by the backend when detections create cases. No sample images are shown here.
      </Card>
    </motion.div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof FolderOpen }) {
  return (
    <Card className="p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
        <Icon size={16} />
      </div>
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
    </Card>
  );
}
