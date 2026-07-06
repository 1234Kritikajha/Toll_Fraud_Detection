import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, Banknote, Brain, Car, RadioTower } from "lucide-react";
import { motion } from "framer-motion";
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchDashboard } from "../services/api";
import { Card } from "../components/ui/Card";
import { cn } from "../components/ui/utils";

const metricIcons = [Banknote, Activity, AlertTriangle, Car, RadioTower, Brain];
const colors = ["#0f766e", "#2563eb", "#dc2626", "#f59e0b", "#14b8a6", "#16a34a"];

function EmptyState({ text }: { text: string }) {
  return <div className="flex min-h-32 items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400">{text}</div>;
}

export function Dashboard() {
  const { data, isLoading, error } = useQuery({ queryKey: ["dashboard"], queryFn: fetchDashboard });

  if (isLoading) return <div className="text-sm text-slate-500">Loading dashboard data...</div>;
  if (error || !data) return <div className="text-sm text-red-600">Dashboard API is not available.</div>;

  const totalAlerts = data.fraudCategories.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {data.metrics.map((metric, index) => {
          const Icon = metricIcons[index] ?? Activity;
          return (
            <Card key={metric.label} className="p-3">
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600")}>
                <Icon size={16} />
              </div>
              <p className="mt-2 text-xl font-bold">{metric.value}</p>
              <p className="text-[10px] font-semibold text-slate-400">{metric.detail}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{metric.label}</p>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-bold">Revenue From Your Transactions</h3>
          {data.revenueTrend.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.revenueTrend}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb22" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="No transaction records yet. Upload images in Fraud Detection to populate this chart." />
          )}
        </Card>

        <Card className="p-3">
          <h3 className="mb-2 text-sm font-bold">Fraud Categories From Your Alerts</h3>
          {data.fraudCategories.length ? (
            <div className="flex items-center gap-3">
              <div className="h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.fraudCategories} dataKey="value" innerRadius={38} outerRadius={58}>
                      {data.fraudCategories.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1 text-[11px]">
                {data.fraudCategories.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: colors[index % colors.length] }} />
                      {item.name}
                    </span>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                ))}
                <p className="pt-2 text-[10px] text-slate-400">Total category share: {totalAlerts}%</p>
              </div>
            </div>
          ) : (
            <EmptyState text="No alert categories in your database." />
          )}
        </Card>
      </section>

      <Card className="p-3">
        <h3 className="mb-2 text-sm font-bold">Configured Toll Plazas</h3>
        {data.tollMarkers.length ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {data.tollMarkers.map((marker) => (
              <div key={marker.name} className="rounded border border-slate-100 p-2 text-xs dark:border-slate-800">
                <p className="font-bold">{marker.name}</p>
                <p className="text-slate-400">{marker.state || "No state saved"}</p>
                <p className="mt-1 text-slate-500">Risk {marker.risk} | Transactions {marker.transactions}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="No toll plaza records found in your database." />
        )}
      </Card>
    </motion.div>
  );
}
