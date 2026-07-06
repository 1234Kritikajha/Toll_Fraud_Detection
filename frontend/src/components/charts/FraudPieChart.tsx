import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { FraudCategory } from "../../types";

const colors = ["#2563EB", "#0EA5E9", "#14B8A6", "#F59E0B", "#EF4444"];

export function FraudPieChart({ data }: { data: FraudCategory[] }) {
  return (
    <div className="grid h-full grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_190px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}%`, "Share"]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map((entry, index) => (
          <div key={entry.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              {entry.name}
            </span>
            <span className="font-bold">{entry.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
